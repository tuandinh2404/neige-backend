import {
  Op,
  Sequelize,
  Transaction,
} from 'sequelize';

import { Message } from './message.model';
import User from '@/module/user/user.model';

export interface CreateMessageData {
  conversationId: string;
  senderId: number;
  clientMessageId: string;
  type: string;
  content: Record<string, unknown>;
  replyToMessageId?: string | null;
}

export interface MessageCursor {
  createdAt: Date;
  id: string;
}

export class MessageRepository {
  constructor(
    private readonly sequelize: Sequelize,
  ) {}

  async insert(
    data: CreateMessageData,
    transaction?: Transaction,
  ): Promise<Message> {
    return Message.create(
      {
        conversationId: data.conversationId,
        senderId: data.senderId,
        clientMessageId: data.clientMessageId,
        type: data.type,
        content: data.content,
        replyToMessageId:
          data.replyToMessageId ?? null,
      },
      {
        transaction,
      },
    );
  }

  async findByClientMessageId(
    senderId: number,
    clientMessageId: string,
    transaction?: Transaction,
  ): Promise<Message | null> {
    return Message.findOne({
      where: {
        senderId,
        clientMessageId,
      },
      transaction,
    });
  }

  async findById(
    messageId: string,
    transaction?: Transaction,
  ): Promise<Message | null> {
    return Message.findByPk(
      messageId,
      {
        transaction,
      },
    );
  }

  async findByIdWithSender(
    messageId: string,
  ): Promise<Message | null> {
    return Message.findByPk(messageId, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: [
            'id',
            'username',
            'avatar_url',
          ],
        },
      ],
    });
  }

  async findTimeline(
    conversationId: string,
    limit: number,
    cursor?: MessageCursor,
    transaction?: Transaction,
  ): Promise<Message[]> {
    const safeLimit = Math.min(
      Math.max(limit, 1),
      100,
    );

    const where = {
      conversationId,
      ...(cursor
        ? {
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
          }
        : {}),
    };

    return Message.findAll({
      where,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: [
            'id',
            'username',
            'avatar_url',
          ],
          required: true,
        },
      ],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: safeLimit,
      transaction,
    });
  }

  async softDelete(
    messageId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [affectedRows] =
      await Message.update(
        {
          deletedAt: new Date(),
          content: {},
        },
        {
          where: {
            id: messageId,
            deletedAt: null,
          },
          transaction,
        },
      );

    return affectedRows > 0;
  }
}