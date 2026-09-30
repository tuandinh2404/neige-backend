import { Op, Sequelize, Transaction, WhereOptions } from "sequelize";

import { Conversation, ConversationType } from "./conversation.model";

import { ConversationParticipant } from "../participant/participant.model";
import { Message } from "../message/message.model";

export interface DirectConversationPair {
  userLowId: number;
  userHighId: number;
}

export interface CreateDirectConversationData {
  userLowId: number;
  userHighId: number;
}

export interface CreateGroupConversationData {
  // Hiện tại conversation chỉ cần type.
  // Participant sẽ được tạo ở ParticipantService / ConversationService.
}

export interface InboxCursor {
  lastMessageAt: string | null;
  createdAt: string;
  id: string;
}

export interface InboxPage {
  conversations: Conversation[];
  hasMore: boolean;
}

export class ConversationRepository {
  constructor(private readonly sequelize: Sequelize) {}

  async findById(
    conversationId: string,
    transaction?: Transaction,
  ): Promise<Conversation | null> {
    return Conversation.findByPk(conversationId, { transaction });
  }

  /**
   * Tìm direct conversation theo cặp user đã được normalize:
   * userLowId < userHighId.
   *
   * Đây chỉ là READ.
   * Tính idempotency/race-safety sẽ dựa vào UNIQUE INDEX ở DB
   * và được xử lý ở ConversationService.
   */
  async findDirectPair(
    userLowId: number,
    userHighId: number,
    transaction?: Transaction,
  ): Promise<Conversation | null> {
    return Conversation.findOne({
      where: {
        type: "direct",
        userLowId,
        userHighId,
      },
      transaction,
    });
  }

  /**
   * Tạo direct conversation.
   *
   * Không tự check duplicate ở đây:
   * UNIQUE INDEX "uq_conversations_direct_pair"
   * mới là source of truth cho concurrency.
   */
  async createDirect(
    data: CreateDirectConversationData,
    transaction?: Transaction,
  ): Promise<Conversation> {
    return Conversation.create(
      {
        type: "direct",
        userLowId: data.userLowId,
        userHighId: data.userHighId,
      },
      {
        transaction,
      },
    );
  }

  /**
   * Tạo group conversation.
   *
   * userLowId/userHighId không được truyền.
   * DB CHECK sẽ đảm bảo group phải có cả hai giá trị NULL.
   */
  async createGroup(transaction?: Transaction): Promise<Conversation> {
    return Conversation.create(
      {
        type: "group",
      },
      {
        transaction,
      },
    );
  }

  /**
   * Cập nhật last message của conversation.
   *
   * Chỉ update nếu tuple (createdAt, messageId) mới hơn
   * giá trị hiện tại trong conversation.
   *
   * Tránh lost-update khi nhiều message được commit gần nhau,
   * đặc biệt khi created_at có cùng millisecond.
   */
  async touchLastMessage(
    conversationId: string,
    messageId: string,
    createdAt: Date,
    transaction: Transaction,
  ): Promise<void> {
    await this.sequelize.query(
      `
      UPDATE "conversations"
      SET
        "last_message_id" = :messageId,
        "last_message_at" = :createdAt
      WHERE "id" = :conversationId
        AND (
          :createdAt,
          :messageId
        ) >
        (
          COALESCE("last_message_at", '-infinity'::timestamptz),
          COALESCE(
            "last_message_id",
            '00000000-0000-0000-0000-000000000000'::uuid
          )
        )
      `,
      {
        replacements: {
          conversationId,
          messageId,
          createdAt,
        },
        transaction,
      },
    );
  }

  /**
   * Lấy inbox của một user.
   *
   * Chỉ lấy participant đang active và chưa archive.
   *
   * lastMessage được include để phục vụ inbox preview.
   * Participant include chỉ là row của current user.
   */
  async findInboxByUser(
    userId: number,
    limit: number,
    cursor?: InboxCursor,
  ): Promise<InboxPage> {
    let where: WhereOptions = {};

    if (cursor) {
      if (cursor.lastMessageAt !== null) {
        where = {
          [Op.or]: [
            {
              lastMessageAt: {
                [Op.lt]: cursor.lastMessageAt,
              },
            },
            {
              lastMessageAt: cursor.lastMessageAt,
              createdAt: {
                [Op.lt]: cursor.createdAt,
              },
            },
            {
              lastMessageAt: cursor.lastMessageAt,
              createdAt: cursor.createdAt,
              id: {
                [Op.lt]: cursor.id,
              },
            },
            {
              lastMessageAt: null,
            },
          ],
        };
      } else {
        where = {
          [Op.or]: [
            {
              lastMessageAt: null,
              createdAt: {
                [Op.lt]: cursor.createdAt,
              },
            },
            {
              lastMessageAt: null,
              createdAt: cursor.createdAt,
              id: {
                [Op.lt]: cursor.id,
              },
            },
          ],
        };
      }
    }

    const conversations = await Conversation.findAll({
      where,

      include: [
        {
          model: ConversationParticipant,
          as: "participants",
          required: true,
          where: {
            userId,
            leftAt: null,
            archivedAt: null,
          },
        },
        {
          model: Message,
          as: "lastMessage",
          required: false,
        },
      ],

      order: [
        ["lastMessageAt", "DESC"],
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],

      limit: limit + 1,
    });

    const hasMore = conversations.length > limit;

    return {
      conversations: hasMore ? conversations.slice(0, limit) : conversations,
      hasMore,
    };
  }
  async findMessageRequestsByUser(
    userId: number,
    limit: number,
    cursor?: InboxCursor,
  ): Promise<InboxPage> {
    let where: WhereOptions = {
      lastMessageAt: {
        [Op.ne]: null,
      },
      type: "direct",
    };

    if (cursor) {
      const cursorWhere =
        cursor.lastMessageAt !== null
          ? {
              [Op.or]: [
                {
                  lastMessageAt: {
                    [Op.lt]: cursor.lastMessageAt,
                  },
                },
                {
                  lastMessageAt: cursor.lastMessageAt,
                  createdAt: {
                    [Op.lt]: cursor.createdAt,
                  },
                },
                {
                  lastMessageAt: cursor.lastMessageAt,
                  createdAt: cursor.createdAt,
                  id: {
                    [Op.lt]: cursor.id,
                  },
                },
              ],
            }
          : {
              [Op.or]: [
                {
                  createdAt: {
                    [Op.lt]: cursor.createdAt,
                  },
                },
                {
                  createdAt: cursor.createdAt,
                  id: {
                    [Op.lt]: cursor.id,
                  },
                },
              ],
            };

      where = {
        [Op.and]: [where, cursorWhere],
      };
    }

    const conversations = await Conversation.findAll({
      where,
      include: [
        {
          model: ConversationParticipant,
          as: "participants",
          required: true,
          where: {
            userId,
            leftAt: null,
            messageRequestStatus: "PENDING",
          },
        },
        {
          model: Message,
          as: "lastMessage",
          required: true,
        },
      ],
      order: [
        ["lastMessageAt", "DESC"],
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit: limit + 1,
    });

    const hasMore = conversations.length > limit;

    return {
      conversations: hasMore ? conversations.slice(0, limit) : conversations,
      hasMore,
    };
  }
}
