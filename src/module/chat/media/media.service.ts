import { Transaction } from 'sequelize';

import { MediaObject } from './media.model';
import {
  MediaRepository,
  CreateMediaObjectData,
} from './media.repository';

import { ParticipantRepository } from '../participant/participant.repository';
import { MessageRepository } from '../message/message.repository';

import {
  MediaAlreadyAttachedError,
  MediaNotFoundError,
  MediaNotReadyError,
  MediaOwnershipError,
  NotConversationParticipantError,
  MessageConversationMismatchError,
  MessageNotFoundError,
  MediaAttachConflictError,
  ChatError,
} from '../shared/chat.errors';

export class MediaService {
  constructor(
    private readonly mediaRepo: MediaRepository,
    private readonly participantRepo: ParticipantRepository,
    private readonly messageRepo: MessageRepository,
  ) {}

  async createPending(
    input: CreateMediaObjectData,
  ): Promise<MediaObject> {
    if (!input.objectKey.trim()) {
      throw new Error(
        'objectKey is required.',
      );
    }

    return this.mediaRepo.createPending(
      input,
    );
  }

  async markReady(
    mediaObjectId: string,
    userId: number,
  ): Promise<void> {
    const media =
      await this.mediaRepo.findById(
        mediaObjectId,
      );

    if (!media) {
      throw new MediaNotFoundError(
        mediaObjectId,
      );
    }

    if (media.uploadedBy !== userId) {
      throw new MediaOwnershipError();
    }

    if (media.status !== 'pending') {
      throw new MediaNotReadyError(
        mediaObjectId,
      );
    }

    const updated =
      await this.mediaRepo.markReady(
        mediaObjectId,
      );

    if (!updated) {
      throw new MediaNotReadyError(
        mediaObjectId,
      );
    }
  }

  async attachToMessage(
    mediaObjectId: string,
    messageId: string,
    conversationId: string,
    userId: number,
    transaction?: Transaction,
  ): Promise<void> {
    if (!this.isValidUuid(conversationId)) {
  throw new ChatError(
    'conversationId must be a valid UUID.',
    'INVALID_CONVERSATION_ID',
  );
}

if (!this.isValidUuid(messageId)) {
  throw new ChatError(
    'messageId must be a valid UUID.',
    'INVALID_MESSAGE_ID',
  );
}

if (!this.isValidUuid(mediaObjectId)) {
  throw new ChatError(
    'mediaObjectId must be a valid UUID.',
    'INVALID_MEDIA_OBJECT_ID',
  );
}
    const participant =
      await this.participantRepo.findActive(
        conversationId,
        userId,
        transaction,
      );

    if (!participant) {
      throw new NotConversationParticipantError(
        userId,
        conversationId,
      );
    }

    const message =
      await this.messageRepo.findById(
        messageId,
        transaction,
      );

    if (!message) {
      throw new MessageNotFoundError(
        messageId,
      );
    }

    if (
      message.conversationId !==
      conversationId
    ) {
      throw new MessageConversationMismatchError();
    }

    const media =
      await this.mediaRepo.findById(
        mediaObjectId,
        transaction,
      );

    if (!media) {
      throw new MediaNotFoundError(
        mediaObjectId,
      );
    }

    if (media.uploadedBy !== userId) {
      throw new MediaOwnershipError();
    }

    if (media.status !== 'ready') {
      throw new MediaNotReadyError(
        mediaObjectId,
      );
    }

    if (media.attachedMessageId !== null) {
      throw new MediaAlreadyAttachedError(
        mediaObjectId,
      );
    }

    const updated =
      await this.mediaRepo.attachToMessage(
        mediaObjectId,
        messageId,
        transaction,
      );

    if (!updated) {
      throw new MediaAttachConflictError(
        mediaObjectId,
      );
    }
  }

  async findStalePending(
    olderThan: Date,
    limit = 100,
  ): Promise<MediaObject[]> {
    return this.mediaRepo.findStalePending(
      olderThan,
      limit,
    );
  }

  async markOrphaned(
    mediaObjectId: string,
  ): Promise<void> {
    const updated =
      await this.mediaRepo.markOrphaned(
        mediaObjectId,
      );

    if (!updated) {
      throw new MediaNotReadyError(
        mediaObjectId,
      );
    }
  }
  private isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
}
