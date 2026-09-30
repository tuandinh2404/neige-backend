import { Sequelize } from 'sequelize';

import EventDispatcher from '@/core/events/event.dispatcher';
import { createEventEnvelope } from '@/core/events/event.factory';

import {
  ChatError,
  NotConversationParticipantError,
} from '../shared/chat.errors';
import {
  ConversationRepository,
  InboxCursor,
} from '../conversation/conversation.repository';
import {
  Conversation,
} from '../conversation/conversation.model';
import {
  ParticipantRepository,
} from '../participant/participant.repository';

export interface MessageRequestResult {
  conversations: Conversation[];
  nextCursor: string | null;
}

export class MessageRequestService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly conversationRepo: ConversationRepository,
    private readonly participantRepo: ParticipantRepository,
  ) {}

  async getPendingRequests(
    userId: number,
    limit = 20,
    encodedCursor?: string,
  ): Promise<MessageRequestResult> {
    this.validateUserId(userId);

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ChatError(
        'Invalid message request limit. Must be between 1 and 100.',
        'INVALID_MESSAGE_REQUEST_LIMIT',
        400,
      );
    }

    const cursor = encodedCursor
      ? this.decodeCursor(encodedCursor)
      : undefined;

    const page =
      await this.conversationRepo.findMessageRequestsByUser(
        userId,
        limit,
        cursor,
      );

    let nextCursor: string | null = null;

    if (page.hasMore && page.conversations.length > 0) {
      const last = page.conversations[page.conversations.length - 1];

      nextCursor = this.encodeCursor({
        lastMessageAt:
          last.lastMessageAt instanceof Date
            ? last.lastMessageAt.toISOString()
            : last.lastMessageAt
              ? new Date(last.lastMessageAt).toISOString()
              : null,
        createdAt:
          last.createdAt instanceof Date
            ? last.createdAt.toISOString()
            : new Date(last.createdAt).toISOString(),
        id: last.id,
      });
    }

    return {
      conversations: page.conversations,
      nextCursor,
    };
  }

  async acceptRequest(
    conversationId: string,
    userId: number,
  ): Promise<void> {
    this.validateConversationId(conversationId);
    this.validateUserId(userId);

    const result = await this.sequelize.transaction(async (transaction) => {
      const participant =
        await this.participantRepo.findOne(
          conversationId,
          userId,
          transaction,
          true,
        );

      if (!participant || participant.leftAt) {
        throw new NotConversationParticipantError(
          userId,
          conversationId,
        );
      }

      if (participant.messageRequestStatus !== 'PENDING') {
        throw new ChatError(
          'This conversation does not have a pending message request.',
          'MESSAGE_REQUEST_NOT_PENDING',
          409,
        );
      }

      const activeParticipants =
        await this.participantRepo.findActiveByConversation(
          conversationId,
          transaction,
          true,
        );

      await this.participantRepo.updateMessageRequestStatus(
        conversationId,
        userId,
        'ACCEPTED',
        transaction,
      );

      return {
        targetUserIds: activeParticipants.map((item) => item.userId),
      };
    });

    const envelope = createEventEnvelope('message_request.accepted', {
      conversationId,
      acceptedByUserId: userId,
    });

    EventDispatcher.dispatch(result.targetUserIds, envelope);
  }

  async deleteRequest(
    conversationId: string,
    userId: number,
  ): Promise<void> {
    this.validateConversationId(conversationId);
    this.validateUserId(userId);

    const result = await this.sequelize.transaction(async (transaction) => {
      const participant =
        await this.participantRepo.findOne(
          conversationId,
          userId,
          transaction,
          true,
        );

      if (!participant || participant.leftAt) {
        throw new NotConversationParticipantError(
          userId,
          conversationId,
        );
      }

      if (participant.messageRequestStatus !== 'PENDING') {
        throw new ChatError(
          'This conversation does not have a pending message request.',
          'MESSAGE_REQUEST_NOT_PENDING',
          409,
        );
      }

      const activeParticipants =
        await this.participantRepo.findActiveByConversation(
          conversationId,
          transaction,
          true,
        );

      await this.participantRepo.updateMessageRequestStatus(
        conversationId,
        userId,
        'HIDDEN',
        transaction,
      );

      return {
        targetUserIds: activeParticipants.map((item) => item.userId),
      };
    });

    const envelope = createEventEnvelope('message_request.hidden', {
      conversationId,
      hiddenByUserId: userId,
    });

    EventDispatcher.dispatch(result.targetUserIds, envelope);
  }

  private encodeCursor(cursor: InboxCursor): string {
    return Buffer
      .from(JSON.stringify(cursor), 'utf8')
      .toString('base64url');
  }

  private decodeCursor(encodedCursor: string): InboxCursor {
    try {
      const decoded =
        Buffer.from(encodedCursor, 'base64url').toString('utf8');

      const parsed: unknown = JSON.parse(decoded);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error();
      }

      const value = parsed as Record<string, unknown>;

      if (typeof value.id !== 'string' || !this.isValidUuid(value.id)) {
        throw new Error();
      }

      if (typeof value.createdAt !== 'string') {
        throw new Error();
      }

      if (
        value.lastMessageAt !== null &&
        typeof value.lastMessageAt !== 'string'
      ) {
        throw new Error();
      }

      const createdAt = new Date(value.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        throw new Error();
      }

      let lastMessageAt: string | null = null;

      if (value.lastMessageAt !== null) {
        const parsedLastMessageAt = new Date(
          value.lastMessageAt as string,
        );

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
      throw new ChatError(
        'Message request cursor is invalid.',
        'INVALID_MESSAGE_REQUEST_CURSOR',
        400,
      );
    }
  }

  private validateUserId(userId: number): void {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ChatError(
        'Invalid user id.',
        'INVALID_USER_ID',
        400,
      );
    }
  }

  private validateConversationId(conversationId: string): void {
    if (!this.isValidUuid(conversationId)) {
      throw new ChatError(
        'conversationId must be a valid UUID.',
        'INVALID_CONVERSATION_ID',
        400,
      );
    }
  }

  private isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
