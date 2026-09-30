import { Sequelize, Transaction } from "sequelize";

import { ConversationParticipant, MessageRequestStatus, ParticipantRole } from "./participant.model";

export class ParticipantRepository {
  constructor(private readonly sequelize: Sequelize) {}

  async findActive(
    conversationId: string,
    userId: number,
    transaction?: Transaction,
    lock = false,
  ): Promise<ConversationParticipant | null> {
    return ConversationParticipant.findOne({
      where: {
        conversationId,
        userId,
        leftAt: null,
      },
      transaction,
      ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
  }

  async findOne(
    conversationId: string,
    userId: number,
    transaction?: Transaction,
    lock = false,
  ): Promise<ConversationParticipant | null> {
    return ConversationParticipant.findOne({
      where: {
        conversationId,
        userId,
      },
      transaction,
      ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
  }

  async add(
    conversationId: string,
    userId: number,
    transaction?: Transaction,
    role?: ParticipantRole | null,
  ): Promise<ConversationParticipant> {
    return ConversationParticipant.create(
      {
        conversationId,
        userId,
        role: role ?? null,
      },
      {
        transaction,
      },
    );
  }

  async updateMessageRequestStatus(
    conversationId: string,
    userId: number,
    status: MessageRequestStatus,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [affectedRows] = await ConversationParticipant.update(
      {
        messageRequestStatus: status,
      },
      {
        where: {
          conversationId,
          userId,
          leftAt: null,
        },
        transaction,
      },
    );

    return affectedRows > 0;
  }

  async findActiveByConversation(
    conversationId: string,
    transaction?: Transaction,
    lock = false,
  ): Promise<ConversationParticipant[]> {
    return ConversationParticipant.findAll({
      where: {
        conversationId,
        leftAt: null,
      },
      transaction,
      ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
      ...(lock && transaction ? { order: [['userId', 'ASC']] } : {}),
    });
  }

  async leave(
    conversationId: string,
    userId: number,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [affectedRows] = await ConversationParticipant.update(
      {
        leftAt: new Date(),
      },
      {
        where: {
          conversationId,
          userId,
          leftAt: null,
        },
        transaction,
      },
    );

    return affectedRows > 0;
  }

  async archive(
    conversationId: string,
    userId: number,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [affectedRows] = await ConversationParticipant.update(
      {
        archivedAt: new Date(),
      },
      {
        where: {
          conversationId,
          userId,
          leftAt: null,
        },
        transaction,
      },
    );

    return affectedRows > 0;
  }

  async unarchive(
    conversationId: string,
    userId: number,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [affectedRows] = await ConversationParticipant.update(
      {
        archivedAt: null,
      },
      {
        where: {
          conversationId,
          userId,
          leftAt: null,
        },
        transaction,
      },
    );

    return affectedRows > 0;
  }

  async mute(
    conversationId: string,
    userId: number,
    mutedUntil: Date,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [affectedRows] = await ConversationParticipant.update(
      {
        mutedUntil,
      },
      {
        where: {
          conversationId,
          userId,
          leftAt: null,
        },
        transaction,
      },
    );

    return affectedRows > 0;
  }

  async unmute(
    conversationId: string,
    userId: number,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [affectedRows] = await ConversationParticipant.update(
      {
        mutedUntil: null,
      },
      {
        where: {
          conversationId,
          userId,
          leftAt: null,
        },
        transaction,
      },
    );

    return affectedRows > 0;
  }

  async updateReadWatermark(
    conversationId: string,
    userId: number,
    messageId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [rows] = await this.sequelize.query(
      `
      UPDATE "conversation_participants" AS cp
      SET "last_read_message_id" = :messageId
      FROM "messages" AS new_msg
      WHERE cp."conversation_id" = :conversationId
        AND cp."user_id" = :userId
        AND cp."left_at" IS NULL
        AND new_msg."id" = :messageId
        AND new_msg."conversation_id" = cp."conversation_id"
        AND (
          cp."last_read_message_id" IS NULL
          OR EXISTS (
            SELECT 1
            FROM "messages" AS old_msg
            WHERE old_msg."id" =
              cp."last_read_message_id"
              AND old_msg."conversation_id" =
                cp."conversation_id"
              AND (
                old_msg."created_at",
                old_msg."id"
              ) < (
                new_msg."created_at",
                new_msg."id"
              )
          )
        )
      RETURNING cp."user_id";
      `,
      {
        replacements: {
          conversationId,
          userId,
          messageId,
        },
        transaction,
      },
    );

    return Array.isArray(rows) && rows.length > 0;
  }

  async updateDeliveredWatermark(
    conversationId: string,
    userId: number,
    messageId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [rows] = await this.sequelize.query(
      `
      UPDATE "conversation_participants" AS cp
      SET "last_delivered_message_id" = :messageId
      FROM "messages" AS new_msg
      WHERE cp."conversation_id" = :conversationId
        AND cp."user_id" = :userId
        AND cp."left_at" IS NULL
        AND new_msg."id" = :messageId
        AND new_msg."conversation_id" = cp."conversation_id"
        AND (
          cp."last_delivered_message_id" IS NULL
          OR EXISTS (
            SELECT 1
            FROM "messages" AS old_msg
            WHERE old_msg."id" =
              cp."last_delivered_message_id"
              AND old_msg."conversation_id" =
                cp."conversation_id"
              AND (
                old_msg."created_at",
                old_msg."id"
              ) < (
                new_msg."created_at",
                new_msg."id"
              )
          )
        )
      RETURNING cp."user_id";
      `,
      {
        replacements: {
          conversationId,
          userId,
          messageId,
        },
        transaction,
      },
    );

    return Array.isArray(rows) && rows.length > 0;
  }

  async rejoin(
    conversationId: string,
    userId: number,
    transaction?: Transaction,
  ): Promise<boolean> {
  const [updated] = await ConversationParticipant.update(
    {
      leftAt: null,
    },
    {
      where: {
        conversationId,
        userId,
      },
      transaction,
    },
  );

  return updated > 0;
}
}
