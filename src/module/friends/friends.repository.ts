import { Op, Transaction, UniqueConstraintError } from "sequelize";

import User from "@/module/user/user.model";

import { Friendship, FriendshipStatus } from "./friends.model";
import { FriendsCursor } from "./friends.types";

export class FriendshipRepository {
  async findById(
    id: number,
    transaction?: Transaction,
    lock = false,
  ): Promise<Friendship | null> {
    return Friendship.findByPk(id, {
      transaction,
      ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
  }

  async findByPair(
    userA: number,
    userB: number,
    transaction?: Transaction,
    lock = false,
  ): Promise<Friendship | null> {
    return Friendship.findOne({
      where: {
        [Op.or]: [
          {
            requesterId: userA,
            receiverId: userB,
          },
          {
            requesterId: userB,
            receiverId: userA,
          },
        ],
      },
      transaction,
      ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
  }

  async create(
    requesterId: number,
    receiverId: number,
    transaction?: Transaction,
  ): Promise<Friendship> {
    return Friendship.create(
      {
        requesterId,
        receiverId,
        status: "PENDING",
      },
      {
        transaction,
      },
    );
  }

  async updateStatus(
    friendship: Friendship,
    status: FriendshipStatus,
    transaction?: Transaction,
  ): Promise<Friendship> {
    return friendship.update(
      {
        status,
      },
      {
        transaction,
      },
    );
  }

  async reopenRejectedRequest(
    friendship: Friendship,
    requesterId: number,
    receiverId: number,
    transaction?: Transaction,
  ): Promise<Friendship> {
    return friendship.update(
      {
        requesterId,
        receiverId,
        status: "PENDING",
      },
      {
        transaction,
      },
    );
  }

  async delete(
    friendship: Friendship,
    transaction?: Transaction,
  ): Promise<void> {
    await friendship.destroy({
      transaction,
    });
  }

  async isAcceptedPair(
    userA: number,
    userB: number,
    transaction?: Transaction,
  ): Promise<boolean> {
    const friendship = await Friendship.findOne({
      where: {
        status: "ACCEPTED",
        [Op.or]: [
          {
            requesterId: userA,
            receiverId: userB,
          },
          {
            requesterId: userB,
            receiverId: userA,
          },
        ],
      },
      transaction,
    });

    return friendship !== null;
  }

  async findFriends(
    userId: number,
    limit: number,
    cursor?: FriendsCursor,
    transaction?: Transaction,
  ): Promise<Friendship[]> {
    const where = {
      status: "ACCEPTED" as const,
      [Op.or]: [
        { requesterId: userId },
        { receiverId: userId },
      ],
      ...(cursor
        ? {
            [Op.and]: [
              {
                [Op.or]: [
                  {
                    updatedAt: {
                      [Op.lt]: new Date(cursor.updatedAt),
                    },
                  },
                  {
                    updatedAt: new Date(cursor.updatedAt),
                    id: {
                      [Op.lt]: cursor.id,
                    },
                  },
                ],
              },
            ],
          }
        : {}),
    };

    return Friendship.findAll({
      where,
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "uid", "username", "full_name", "avatar_url"],
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "uid", "username", "full_name", "avatar_url"],
        },
      ],
      order: [
        ["updatedAt", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      transaction,
    });
  }

  async findPendingSent(
    userId: number,
    transaction?: Transaction,
  ): Promise<Friendship[]> {
    return Friendship.findAll({
      where: {
        requesterId: userId,
        status: "PENDING",
      },
      include: [
        {
          model: User,
          as: "receiver",
          attributes: ["id", "uid", "username", "full_name", "avatar_url"],
        },
      ],
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      transaction,
    });
  }

  async findPendingReceived(
    userId: number,
    transaction?: Transaction,
  ): Promise<Friendship[]> {
    return Friendship.findAll({
      where: {
        receiverId: userId,
        status: "PENDING",
      },
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "uid", "username", "full_name", "avatar_url"],
        },
      ],
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      transaction,
    });
  }

  static isPairUniqueViolation(error: unknown): boolean {
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

    return constraint === "uq_friendships_user_pair";
  }
}
