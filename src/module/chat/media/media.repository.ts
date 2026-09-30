import {
  Op,
  Transaction,
} from 'sequelize';

import {
  MediaObject,
  MediaObjectStatus,
} from './media.model';

export interface CreateMediaObjectData {
  objectKey: string;
  uploadedBy: number;
}

export class MediaRepository {
  async createPending(
    data: CreateMediaObjectData,
    transaction?: Transaction,
  ): Promise<MediaObject> {
    return MediaObject.create(
      {
        objectKey: data.objectKey,
        uploadedBy: data.uploadedBy,
        status: 'pending',
        attachedMessageId: null,
      },
      {
        transaction,
      },
    );
  }

  async findById(
    id: string,
    transaction?: Transaction,
  ): Promise<MediaObject | null> {
    return MediaObject.findByPk(id, {
      transaction,
    });
  }

  async markReady(
    mediaId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [affectedRows] =
      await MediaObject.update(
        {
          status: 'ready',
        },
        {
          where: {
            id: mediaId,
            status: 'pending',
            attachedMessageId: null,
          },
          transaction,
        },
      );

    return affectedRows > 0;
  }

  async attachToMessage(
    mediaId: string,
    messageId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [affectedRows] =
      await MediaObject.update(
        {
          attachedMessageId: messageId,
        },
        {
          where: {
            id: mediaId,
            status: 'ready',
            attachedMessageId: null,
          },
          transaction,
        },
      );

    return affectedRows > 0;
  }

  async markOrphaned(
    mediaId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [affectedRows] =
      await MediaObject.update(
        {
          status: 'orphaned',
        },
        {
          where: {
            id: mediaId,
            status: 'pending',
            attachedMessageId: null,
          },
          transaction,
        },
      );

    return affectedRows > 0;
  }

  async findStalePending(
    olderThan: Date,
    limit = 100,
    transaction?: Transaction,
  ): Promise<MediaObject[]> {
    const safeLimit = Math.min(
      Math.max(limit, 1),
      1000,
    );

    return MediaObject.findAll({
      where: {
        status: 'pending' as MediaObjectStatus,
        attachedMessageId: null,
        createdAt: {
          [Op.lt]: olderThan,
        },
      },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      limit: safeLimit,
      transaction,
    });
  }
}