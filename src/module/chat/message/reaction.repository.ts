import {
  Sequelize,
  Transaction,
} from 'sequelize';

import { MessageReaction } from './reaction.model';

export interface UpsertReactionData {
  messageId: string;
  userId: number;
  reaction: string;
}

export class ReactionRepository {
  constructor(
    private readonly sequelize: Sequelize,
  ) {}

  async findByMessageAndUser(
    messageId: string,
    userId: number,
    transaction?: Transaction,
  ): Promise<MessageReaction | null> {
    return MessageReaction.findOne({
      where: {
        messageId,
        userId,
      },
      transaction,
    });
  }

  async upsert(
    data: UpsertReactionData,
    transaction?: Transaction,
  ): Promise<MessageReaction> {
    const [reaction] = await MessageReaction.upsert(
      {
        messageId: data.messageId,
        userId: data.userId,
        reaction: data.reaction,
      },
      {
        transaction,
        returning: true,
      },
    );

    return reaction;
  }

  async remove(
    messageId: string,
    userId: number,
    transaction?: Transaction,
  ): Promise<boolean> {
    const affectedRows =
      await MessageReaction.destroy({
        where: {
          messageId,
          userId,
        },
        transaction,
      });

    return affectedRows > 0;
  }

  async findByMessage(
    messageId: string,
    transaction?: Transaction,
  ): Promise<MessageReaction[]> {
    return MessageReaction.findAll({
      where: {
        messageId,
      },
      order: [
        ['createdAt', 'ASC'],
        ['userId', 'ASC'],
      ],
      transaction,
    });
  }
}