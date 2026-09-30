import { Sequelize } from "sequelize";

import { UserRepository } from "@/module/user/user.repository";

import {
  AlreadyFriendsError,
  FriendRequestAlreadyPendingError,
  FriendRequestForbiddenError,
  FriendRequestNotFoundError,
  FriendTargetNotFoundError,
  FriendError,
  NotFriendsError,
  SelfFriendRequestError,
} from "./friends.errors";
import { Friendship } from "./friends.model";
import { FriendshipRepository } from "./friends.repository";
import { FriendSummary, FriendsCursor, FriendsResult } from "./friends.types";

export class FriendshipService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly friendshipRepo: FriendshipRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async sendRequest(
    requesterId: number,
    receiverId: number,
  ): Promise<Friendship> {
    this.validateUserId(requesterId);
    this.validateUserId(receiverId);

    if (requesterId === receiverId) {
      throw new SelfFriendRequestError();
    }

    const target = await this.userRepo.getById(receiverId);

    if (!target) {
      throw new FriendTargetNotFoundError(receiverId);
    }

    try {
      return await this.sequelize.transaction(async (transaction) => {
        const existing = await this.friendshipRepo.findByPair(
          requesterId,
          receiverId,
          transaction,
          true,
        );

        if (!existing) {
          return this.friendshipRepo.create(
            requesterId,
            receiverId,
            transaction,
          );
        }

        if (existing.status === "PENDING") {
          throw new FriendRequestAlreadyPendingError();
        }

        if (existing.status === "ACCEPTED") {
          throw new AlreadyFriendsError();
        }

        return this.friendshipRepo.reopenRejectedRequest(
          existing,
          requesterId,
          receiverId,
          transaction,
        );
      });
    } catch (error) {
      if (!FriendshipRepository.isPairUniqueViolation(error)) {
        throw error;
      }

      return this.sequelize.transaction(async (transaction) => {
        const existing = await this.friendshipRepo.findByPair(
          requesterId,
          receiverId,
          transaction,
          true,
        );

        if (!existing) {
          throw error;
        }

        if (existing.status === "PENDING") {
          throw new FriendRequestAlreadyPendingError();
        }

        if (existing.status === "ACCEPTED") {
          throw new AlreadyFriendsError();
        }

        return this.friendshipRepo.reopenRejectedRequest(
          existing,
          requesterId,
          receiverId,
          transaction,
        );
      });
    }
  }

  async cancelRequest(
    friendshipId: number,
    requesterId: number,
  ): Promise<void> {
    return this.sequelize.transaction(async (transaction) => {
      const friendship = await this.friendshipRepo.findById(
        friendshipId,
        transaction,
        true,
      );

      if (!friendship || friendship.status !== "PENDING") {
        throw new FriendRequestNotFoundError();
      }

      if (friendship.requesterId !== requesterId) {
        throw new FriendRequestForbiddenError();
      }

      await this.friendshipRepo.delete(friendship, transaction);
    });
  }

  async acceptRequest(
    friendshipId: number,
    receiverId: number,
  ): Promise<Friendship> {
    return this.sequelize.transaction(async (transaction) => {
      const friendship = await this.friendshipRepo.findById(
        friendshipId,
        transaction,
        true,
      );

      if (!friendship || friendship.status !== "PENDING") {
        throw new FriendRequestNotFoundError();
      }

      if (friendship.receiverId !== receiverId) {
        throw new FriendRequestForbiddenError();
      }

      return this.friendshipRepo.updateStatus(
        friendship,
        "ACCEPTED",
        transaction,
      );
    });
  }

  async rejectRequest(
    friendshipId: number,
    receiverId: number,
  ): Promise<Friendship> {
    return this.sequelize.transaction(async (transaction) => {
      const friendship = await this.friendshipRepo.findById(
        friendshipId,
        transaction,
        true,
      );

      if (!friendship || friendship.status !== "PENDING") {
        throw new FriendRequestNotFoundError();
      }

      if (friendship.receiverId !== receiverId) {
        throw new FriendRequestForbiddenError();
      }

      return this.friendshipRepo.updateStatus(
        friendship,
        "REJECTED",
        transaction,
      );
    });
  }

  async unfriend(currentUserId: number, targetUserId: number): Promise<void> {
    this.validateUserId(currentUserId);
    this.validateUserId(targetUserId);

    if (currentUserId === targetUserId) {
      throw new NotFriendsError();
    }

    return this.sequelize.transaction(async (transaction) => {
      const friendship = await this.friendshipRepo.findByPair(
        currentUserId,
        targetUserId,
        transaction,
        true,
      );

      if (!friendship || friendship.status !== "ACCEPTED") {
        throw new NotFriendsError();
      }

      await this.friendshipRepo.delete(friendship, transaction);
    });
  }

  async getFriends(
    userId: number,
    limit = 20,
    encodedCursor?: string,
  ): Promise<FriendsResult> {
    this.validateUserId(userId);

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new FriendError(
        "Invalid friends limit. Must be between 1 and 100.",
        "INVALID_FRIENDS_LIMIT",
        400,
      );
    }

    const cursor = encodedCursor
      ? this.decodeFriendsCursor(encodedCursor)
      : undefined;

    const page = await this.friendshipRepo.findFriends(
      userId,
      limit + 1,
      cursor,
    );

    const hasMore = page.length > limit;
    const friendships = hasMore ? page.slice(0, limit) : page;

    const friends: FriendSummary[] = friendships.map((friendship) => {
      const requester = (friendship as Friendship & { requester?: FriendSummary }).requester;
      const receiver = (friendship as Friendship & { receiver?: FriendSummary }).receiver;
      const friend = friendship.requesterId === userId ? receiver : requester;

      if (!friend) {
        throw new FriendError(
          "Friend user data is missing.",
          "FRIEND_USER_DATA_MISSING",
          500,
        );
      }

      return {
        id: friend.id,
        uid: friend.uid,
        username: friend.username,
        full_name: friend.full_name ?? null,
        avatar_url: friend.avatar_url ?? null,
      };
    });

    let nextCursor: string | null = null;

    if (hasMore && friendships.length > 0) {
      const last = friendships[friendships.length - 1];
      const updatedAt = last.updatedAt;

      if (!(updatedAt instanceof Date) || Number.isNaN(updatedAt.getTime())) {
        throw new FriendError(
          "Friendship timestamp is invalid.",
          "INVALID_FRIENDSHIP_TIMESTAMP",
          500,
        );
      }

      nextCursor = this.encodeFriendsCursor({
        updatedAt: updatedAt.toISOString(),
        id: last.id,
      });
    }

    return {
      friends,
      nextCursor,
    };
  }

  async getSentRequests(userId: number): Promise<Friendship[]> {
    this.validateUserId(userId);
    return this.friendshipRepo.findPendingSent(userId);
  }

  async getReceivedRequests(userId: number): Promise<Friendship[]> {
    this.validateUserId(userId);
    return this.friendshipRepo.findPendingReceived(userId);
  }

  private encodeFriendsCursor(cursor: FriendsCursor): string {
    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
  }

  private decodeFriendsCursor(encodedCursor: string): FriendsCursor {
    try {
      const decoded = Buffer.from(encodedCursor, "base64url").toString("utf8");
      const parsed: unknown = JSON.parse(decoded);

      if (typeof parsed !== "object" || parsed === null) {
        throw new Error();
      }

      const value = parsed as Record<string, unknown>;

      if (typeof value.updatedAt !== "string") {
        throw new Error();
      }

      if (!Number.isInteger(value.id) || (value.id as number) <= 0) {
        throw new Error();
      }

      const updatedAt = new Date(value.updatedAt);

      if (Number.isNaN(updatedAt.getTime())) {
        throw new Error();
      }

      return {
        updatedAt: updatedAt.toISOString(),
        id: value.id as number,
      };
    } catch {
      throw new FriendError(
        "Invalid friends cursor.",
        "INVALID_FRIENDS_CURSOR",
        400,
      );
    }
  }

  private validateUserId(userId: number): void {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new FriendError(
        "User id must be a positive integer.",
        "INVALID_USER_ID",
        400,
      );
    }
  }
}
