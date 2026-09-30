import { Sequelize, UniqueConstraintError } from "sequelize";

import { Conversation } from "./conversation.model";
import { ConversationRepository, InboxCursor } from "./conversation.repository";
import { ParticipantRepository } from "../participant/participant.repository";
import User from "@/module/user/user.model";

import {
  NotConversationParticipantError,
  SelfConversationError,
  ChatError,
} from "../shared/chat.errors";

export interface InboxResult {
  conversations: Conversation[];
  nextCursor: string | null;
}

export class ConversationService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly conversationRepo: ConversationRepository,
    private readonly participantRepo: ParticipantRepository,
  ) {}

  async getOrCreateDirect(
    userId: number,
    targetUserId: number,
  ): Promise<Conversation> {
    /*
     * 1. Không cho tạo conversation với chính mình.
     */
    if (userId === targetUserId) {
      throw new SelfConversationError();
    }

    /*
     * 2. Target user phải tồn tại.
     *
     * Phải kiểm tra trước mọi thao tác tạo conversation
     * để tránh lỗi foreign key bị biến thành HTTP 500.
     */
    const targetUser = await User.findByPk(targetUserId);

    if (!targetUser) {
      throw new ChatError(
        `User ${targetUserId} not found.`,
        "USER_NOT_FOUND",
        404,
      );
    }

    /*
     * 3. Normalize cặp user.
     *
     * (1, 5) và (5, 1) luôn trở thành:
     * userLowId  = 1
     * userHighId = 5
     */
    const userLowId = Math.min(userId, targetUserId);

    const userHighId = Math.max(userId, targetUserId);

    /*
     * 4. Fast path.
     */
    const existing = await this.conversationRepo.findDirectPair(
      userLowId,
      userHighId,
    );

    if (existing) {
      return existing;
    }

    /*
     * 5. Create conversation + participants
     *    trong cùng transaction.
     */
    try {
      return await this.sequelize.transaction(async (tx) => {
        const conversation = await this.conversationRepo.createDirect(
          {
            userLowId,
            userHighId,
          },
          tx,
        );

        await this.participantRepo.add(conversation.id, userLowId, tx);

        await this.participantRepo.add(conversation.id, userHighId, tx);

        return conversation;
      });
    } catch (error) {
      /*
       * Transaction đã rollback trước khi tới đây.
       *
       * Chỉ xử lý race condition:
       * request khác đã tạo direct conversation
       * với cùng user pair trước request hiện tại.
       */
      if (!this.isDirectPairUniqueViolation(error)) {
        throw error;
      }

      /*
       * SELECT fallback chạy ngoài transaction
       * đã failed.
       */
      const existingAfterRace = await this.conversationRepo.findDirectPair(
        userLowId,
        userHighId,
      );

      if (!existingAfterRace) {
        throw error;
      }

      return existingAfterRace;
    }
  }

  async createGroup(creatorId: number): Promise<Conversation> {
    return this.sequelize.transaction(async (tx) => {
      const conversation = await this.conversationRepo.createGroup(tx);

      await this.participantRepo.add(conversation.id, creatorId, tx, "OWNER");

      return conversation;
    });
  }

  async archive(conversationId: string, userId: number): Promise<void> {
    const updated = await this.participantRepo.archive(conversationId, userId);

    if (!updated) {
      throw new NotConversationParticipantError(userId, conversationId);
    }
  }

  async unarchive(conversationId: string, userId: number): Promise<void> {
    const updated = await this.participantRepo.unarchive(
      conversationId,
      userId,
    );

    if (!updated) {
      throw new NotConversationParticipantError(userId, conversationId);
    }
  }

  async mute(
    conversationId: string,
    userId: number,
    mutedUntil: Date,
  ): Promise<void> {
    const updated = await this.participantRepo.mute(
      conversationId,
      userId,
      mutedUntil,
    );

    if (!updated) {
      throw new NotConversationParticipantError(userId, conversationId);
    }
  }

  async unmute(conversationId: string, userId: number): Promise<void> {
    const updated = await this.participantRepo.unmute(conversationId, userId);

    if (!updated) {
      throw new NotConversationParticipantError(userId, conversationId);
    }
  }
  async getInbox(
    userId: number,
    limit = 20,
    encodedCursor?: string,
  ): Promise<InboxResult> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ChatError("Invalid user id.", "INVALID_USER_ID", 400);
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ChatError(
        "Invalid inbox limit. Must be between 1 and 100.",
        "INVALID_INBOX_LIMIT",
        400,
      );
    }

    const cursor = encodedCursor
      ? this.decodeInboxCursor(encodedCursor)
      : undefined;

    const page = await this.conversationRepo.findInboxByUser(
      userId,
      limit,
      cursor,
    );

    let nextCursor: string | null = null;

    if (page.hasMore && page.conversations.length > 0) {
      const last = page.conversations[page.conversations.length - 1];

      const lastMessageAt = last.lastMessageAt;

      const createdAt = last.createdAt;

      const cursorData: InboxCursor = {
        lastMessageAt:
          lastMessageAt instanceof Date
            ? lastMessageAt.toISOString()
            : lastMessageAt
              ? new Date(lastMessageAt).toISOString()
              : null,

        createdAt:
          createdAt instanceof Date
            ? createdAt.toISOString()
            : new Date(createdAt).toISOString(),

        id: last.id,
      };

      nextCursor = this.encodeInboxCursor(cursorData);
    }

    return {
      conversations: page.conversations,
      nextCursor,
    };
  }

  private encodeInboxCursor(cursor: InboxCursor): string {
    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
  }

  private decodeInboxCursor(encodedCursor: string): InboxCursor {
    try {
      const decoded = Buffer.from(encodedCursor, "base64url").toString("utf8");

      const parsed: unknown = JSON.parse(decoded);

      if (typeof parsed !== "object" || parsed === null) {
        throw new Error();
      }

      const value = parsed as Record<string, unknown>;

      if (typeof value.id !== "string" || !this.isUuid(value.id)) {
        throw new Error();
      }

      if (typeof value.createdAt !== "string") {
        throw new Error();
      }

      if (
        value.lastMessageAt !== null &&
        typeof value.lastMessageAt !== "string"
      ) {
        throw new Error();
      }

      const createdAt = new Date(value.createdAt);

      if (Number.isNaN(createdAt.getTime())) {
        throw new Error();
      }

      let lastMessageAt: string | null = null;

      if (value.lastMessageAt !== null) {
        const parsedLastMessageAt = new Date(value.lastMessageAt);

        if (Number.isNaN(parsedLastMessageAt.getTime())) {
          throw new Error();
        }

        lastMessageAt = parsedLastMessageAt.toISOString();
      }

      return {
        id: value.id,
        createdAt: createdAt.toISOString(),
        lastMessageAt,
      };
    } catch {
      throw new ChatError("Invalid inbox cursor.", "INVALID_INBOX_CURSOR", 400);
    }
  }

  private isDirectPairUniqueViolation(error: unknown): boolean {
    if (!(error instanceof UniqueConstraintError)) {
      return false;
    }

    const constraint = (
      error.parent as
        | {
            constraint?: string;
          }
        | undefined
    )?.constraint;

    return constraint === "uq_conversations_direct_pair";
  }
  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
