import {
  Sequelize,
  UniqueConstraintError,
} from 'sequelize';

import { Message } from './message.model';
import EventDispatcher from '@/core/events/event.dispatcher';
import { createEventEnvelope } from '@/core/events/event.factory';
import { MessageDTO, toMessageDTO } from './dto/message.dto';
import {
  serializeCanonicalContent,
  validateMessageContent,
} from './message.content';
import { MessageRepository } from './message.repository';
import { FriendshipRepository } from '@/module/friends/friends.repository';

import { ParticipantRepository } from '../participant/participant.repository';
import { ConversationRepository } from '../conversation/conversation.repository';

import {
  ChatError,
  InvalidReplyTargetError,
  MessageConversationMismatchError,
  MessageNotFoundError,
  MessageOwnershipError,
  MessagePayloadConflictError,
  MessageRequestPendingError,
  NotConversationParticipantError,
} from '../shared/chat.errors';

export interface SendMessageResult {
  message: MessageDTO;
  created: boolean;
}

export interface SendMessageInput {
  conversationId: string;
  senderId: number;
  clientMessageId: string;
  type: string;
  content: Record<string, unknown>;
  replyToMessageId?: string | null;
}

export class MessageService {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly participantRepo: ParticipantRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly friendshipRepo: FriendshipRepository,
    private readonly sequelize: Sequelize,
  ) {}

  async sendMessage(
    input: SendMessageInput,
  ): Promise<SendMessageResult> {
    const {
      conversationId,
      senderId,
      clientMessageId,
      type,
      content,
      replyToMessageId = null,
    } = input;

    /*
     * 1. Validate UUID/input trước mọi query database.
     *
     * Mục đích:
     * - Không để UUID sai format đi xuống PostgreSQL.
     * - Tránh database error bị biến thành HTTP 500.
     */
    if (!this.isValidUuid(conversationId)) {
      throw new ChatError(
        'conversationId must be a valid UUID.',
        'INVALID_CONVERSATION_ID',
      );
    }

    if (
      replyToMessageId !== null &&
      !this.isValidUuid(replyToMessageId)
    ) {
      throw new ChatError(
        'replyToMessageId must be a valid UUID.',
        'INVALID_REPLY_MESSAGE_ID',
      );
    }

    this.validateBasicInput(
      clientMessageId,
      type,
      content,
    );

    const validatedContent =
      validateMessageContent(
        type,
        content,
      );

    /*
     * 2. Sender phải đang là active participant.
     */
    const participant =
      await this.participantRepo.findActive(
        conversationId,
        senderId,
      );

    if (!participant) {
      throw new NotConversationParticipantError(
        senderId,
        conversationId,
      );
    }

    if (participant.messageRequestStatus === 'PENDING') {
      throw new MessageRequestPendingError();
    }

    /*
     * 3. Fast-path idempotency check.
     */
    const existing =
      await this.messageRepo.findByClientMessageId(
        senderId,
        clientMessageId,
      );

    if (existing) {
      this.assertIdempotentPayload(
        existing,
        input,
      );

      return {
        message: await this.loadMessageDTO(existing.id),
        created: false,
      };
    }

    /*
     * 4. Message INSERT + last_message UPDATE
     *    phải atomic.
     */
    try {
      const result = await this.sequelize.transaction(
        async (transaction) => {
          /*
           * Re-check idempotency trong transaction.
           */
          const existingInTransaction =
            await this.messageRepo.findByClientMessageId(
              senderId,
              clientMessageId,
              transaction,
            );

          if (existingInTransaction) {
            this.assertIdempotentPayload(
              existingInTransaction,
              input,
            );

            return {
              message: existingInTransaction,
              created: false,
              messageRequestCreated: false,
              messageRequestTargetUserIds: [] as number[],
            };
          }

          /*
           * 5. Message-request state transition.
           *
           * Direct conversation: lock all active participants in one
           * deterministic query before inspecting/updating request state.
           * Điều này tránh lock order kiểu sender -> recipient, vốn có thể
           * deadlock khi A và B gửi đồng thời cho cùng conversation.
           */
          const conversation =
            await this.conversationRepo.findById(
              conversationId,
              transaction,
            );

          let senderParticipant =
            await this.participantRepo.findActive(
              conversationId,
              senderId,
              transaction,
            );

          let messageRequestCreated = false;
          let messageRequestTargetUserIds: number[] = [];

          if (conversation?.type === 'direct') {
            const activeParticipants =
              await this.participantRepo.findActiveByConversation(
                conversationId,
                transaction,
                true,
              );

            senderParticipant = activeParticipants.find(
              (item) => item.userId === senderId,
            ) ?? null;

            const recipient = activeParticipants.find(
              (item) => item.userId !== senderId,
            );

            if (recipient) {
              const acceptedFriendship =
                await this.friendshipRepo.isAcceptedPair(
                  senderId,
                  recipient.userId,
                  transaction,
                );

              /*
               * Stranger first message / resend after HIDDEN:
               * NONE/HIDDEN -> PENDING.
               */
              const requestAlreadyAccepted =
                activeParticipants.some(
                  (item) => item.messageRequestStatus === 'ACCEPTED',
                );

              if (
                !acceptedFriendship &&
                !requestAlreadyAccepted &&
                (recipient.messageRequestStatus === 'NONE' ||
                  recipient.messageRequestStatus === 'HIDDEN')
              ) {
                await this.participantRepo.updateMessageRequestStatus(
                  conversationId,
                  recipient.userId,
                  'PENDING',
                  transaction,
                );

                messageRequestCreated = true;
                messageRequestTargetUserIds = [
                  senderId,
                  recipient.userId,
                ];
              }
            }
          }

          if (!senderParticipant) {
            throw new NotConversationParticipantError(
              senderId,
              conversationId,
            );
          }

          if (senderParticipant.messageRequestStatus === 'PENDING') {
            throw new MessageRequestPendingError();
          }

          /*
           * 6. Reply target phải tồn tại,
           *    thuộc cùng conversation và
           *    chưa bị deleted.
           */
          if (replyToMessageId) {
            const replyTarget =
              await this.messageRepo.findById(
                replyToMessageId,
                transaction,
              );

            if (!replyTarget) {
              throw new MessageNotFoundError(
                replyToMessageId,
              );
            }

            if (
              replyTarget.conversationId !==
              conversationId
            ) {
              throw new MessageConversationMismatchError();
            }

            if (replyTarget.deletedAt) {
              throw new InvalidReplyTargetError(
                replyToMessageId,
              );
            }
          }

          /*
           * 7. Insert message.
           */
          const message =
            await this.messageRepo.insert(
              {
                conversationId,
                senderId,
                clientMessageId,
                type,
                content: validatedContent,
                replyToMessageId,
              },
              transaction,
            );

          /*
           * 8. Update conversation summary.
           *
           * Repository tự đảm bảo chỉ message
           * mới hơn mới được ghi vào last_message.
           */
          await this.conversationRepo.touchLastMessage(
            conversationId,
            message.id,
            message.createdAt,
            transaction,
          );

          return {
            message,
            created: true,
            messageRequestCreated,
            messageRequestTargetUserIds,
          };
        },
      );

      const message = await this.loadMessageDTO(
        result.message.id,
      );

      if (result.created) {
        if (
          result.messageRequestCreated &&
          result.messageRequestTargetUserIds.length > 0
        ) {
          void this.dispatchMessageRequestCreated(
            conversationId,
            message.id,
            senderId,
            result.messageRequestTargetUserIds,
          );
        }

        void this.dispatchMessageCreated(
          message,
          conversationId,
          senderId,
        );
      }

      return {
        message,
        created: result.created,
      };
    } catch (error) {
      /*
       * Transaction callback đã kết thúc.
       *
       * Chỉ xử lý trường hợp concurrent insert
       * cùng clientMessageId.
       */
      if (
        !this.isClientMessageUniqueViolation(
          error,
        )
      ) {
        throw error;
      }

      /*
       * Transaction đã rollback.
       * Query lại message tồn tại bên ngoài transaction.
       */
      const concurrent =
        await this.messageRepo.findByClientMessageId(
          senderId,
          clientMessageId,
        );

      if (!concurrent) {
        throw error;
      }

      this.assertIdempotentPayload(
        concurrent,
        input,
      );

      return {
        message: await this.loadMessageDTO(concurrent.id),
        created: false,
      };
    }
  }

  private async loadMessageDTO(
    messageId: string,
  ): Promise<MessageDTO> {
    const hydratedMessage =
      await this.messageRepo.findByIdWithSender(
        messageId,
      );

    if (!hydratedMessage) {
      throw new MessageNotFoundError(messageId);
    }

    return toMessageDTO(
      hydratedMessage as Message & {
        sender: {
          id: number;
          username: string;
          avatar_url: string | null;
        };
      },
    );
  }

  private async dispatchMessageRequestCreated(
    conversationId: string,
    messageId: string,
    requestedByUserId: number,
    targetUserIds: number[],
  ): Promise<void> {
    try {
      const envelope = createEventEnvelope(
        'message_request.created',
        {
          conversationId,
          messageId,
          requestedByUserId,
        },
      );

      EventDispatcher.dispatch(
        targetUserIds,
        envelope,
      );
    } catch (error) {
      console.error(
        'Failed to dispatch message_request.created:',
        error,
      );
    }
  }

  private async dispatchMessageCreated(
    message: MessageDTO,
    conversationId: string,
    senderId: number,
  ): Promise<void> {
    try {
      const participants =
        await this.participantRepo.findActiveByConversation(
          conversationId,
        );

      const targetUserIds = participants
        .filter(
          (participant) =>
            participant.userId === senderId ||
            participant.messageRequestStatus !== 'PENDING',
        )
        .map((participant) => participant.userId);

      const envelope = createEventEnvelope(
        'message.created',
        { message },
      );

      EventDispatcher.dispatch(
        targetUserIds,
        envelope,
      );
    } catch (error) {
      console.error(
        'Failed to dispatch message.created:',
        error,
      );
    }
  }

  async getTimeline(
    conversationId: string,
    userId: number,
    limit = 20,
    cursor?: string,
  ): Promise<{
    messages: MessageDTO[];
    nextCursor: string | null;
  }> {
    /*
     * 1. Validate conversationId trước mọi query.
     */
    if (!this.isValidUuid(conversationId)) {
      throw new ChatError(
        'conversationId must be a valid UUID.',
        'INVALID_CONVERSATION_ID',
      );
    }

    /*
     * 2. Validate limit.
     */
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new ChatError(
        'limit must be an integer between 1 and 100.',
        'INVALID_MESSAGE_LIMIT',
      );
    }

    /*
     * 3. User phải là active participant.
     */
    const participant =
      await this.participantRepo.findActive(
        conversationId,
        userId,
      );

    if (!participant) {
      throw new NotConversationParticipantError(
        userId,
        conversationId,
      );
    }

    /*
     * 4. Decode cursor nếu có.
     */
    const messageCursor =
      cursor
        ? this.decodeTimelineCursor(cursor)
        : undefined;

    /*
     * 5. Query timeline.
     *
     * Repository đảm bảo:
     * - DESC createdAt
     * - DESC id
     * - cursor theo (createdAt, id)
     * - limit clamp
     */
    const messages =
      await this.messageRepo.findTimeline(
        conversationId,
        limit,
        messageCursor,
      );

    /*
     * 6. Tạo next cursor.
     *
     * Nếu page đầy limit thì tạo cursor
     * từ message cuối cùng.
     */
    let nextCursor: string | null = null;

    if (messages.length === limit) {
      const lastMessage =
        messages[messages.length - 1];

      nextCursor =
        this.encodeTimelineCursor({
          createdAt:
            lastMessage.createdAt,
          id:
            lastMessage.id,
        });
    }

    const messageDTOs = messages.map(toMessageDTO);

    return {
      messages: messageDTOs,
      nextCursor,
    };
  }

  async deleteMessage(
    conversationId: string,
    messageId: string,
    userId: number,
  ): Promise<void> {
    /*
     * 1. Validate UUID trước mọi query database.
     */
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

    const result =
      await this.sequelize.transaction(
        async (transaction) => {
          /*
           * 2. Snapshot active participants inside the same transaction.
           *
           * Lock theo userId ASC để giữ thứ tự lock deterministic
           * giống message send flow.
           */
          const activeParticipants =
            await this.participantRepo.findActiveByConversation(
              conversationId,
              transaction,
              true,
            );

          const participant =
            activeParticipants.find(
              (item) => item.userId === userId,
            );

          if (!participant) {
            throw new NotConversationParticipantError(
              userId,
              conversationId,
            );
          }

          /*
           * 3. Message phải tồn tại.
           */
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

          /*
           * 4. Message phải thuộc conversation.
           */
          if (
            message.conversationId !==
            conversationId
          ) {
            throw new MessageConversationMismatchError();
          }

          /*
           * 5. Chỉ sender mới được delete message.
           */
          if (message.senderId !== userId) {
            throw new MessageOwnershipError();
          }

          /*
           * 6. Delete là idempotent.
           */
          if (message.deletedAt) {
            return {
              deleted: false,
              targetUserIds: [],
            };
          }

          /*
           * 7. Snapshot audience trước commit.
           *
           * Sender luôn nhận event. Recipient đang PENDING
           * không nhận message.deleted, nhất quán với message.created.
           */
          const targetUserIds =
            activeParticipants
              .filter(
                (item) =>
                  item.userId === userId ||
                  item.messageRequestStatus !== 'PENDING',
              )
              .map((item) => item.userId);

          /*
           * 8. Soft delete.
           *
           * Conditional UPDATE đảm bảo concurrent delete chỉ
           * có một transaction thực sự thay đổi row.
           */
          const deleted =
            await this.messageRepo.softDelete(
              messageId,
              transaction,
            );

          return {
            deleted,
            targetUserIds,
          };
        },
      );

    if (!result.deleted) {
      return;
    }

    /*
     * 9. Chỉ dispatch sau khi transaction commit thành công.
     */
    void this.dispatchMessageDeleted(
      conversationId,
      messageId,
      userId,
      result.targetUserIds,
    );
  }

  private async dispatchMessageDeleted(
    conversationId: string,
    messageId: string,
    senderId: number,
    targetUserIds: number[],
  ): Promise<void> {
    try {
      const envelope = createEventEnvelope(
        'message.deleted',
        {
          messageId,
          conversationId,
          senderId,
        },
      );

      EventDispatcher.dispatch(
        targetUserIds,
        envelope,
      );
    } catch (error) {
      console.error(
        'Failed to dispatch message.deleted:',
        error,
      );
    }
  }

  private validateBasicInput(
    clientMessageId: string,
    type: string,
    content: Record<string, unknown>,
  ): void {
    /*
     * clientMessageId phải tồn tại.
     */
    if (
      typeof clientMessageId !== 'string' ||
      !clientMessageId.trim()
    ) {
      throw new ChatError(
        'clientMessageId is required.',
        'INVALID_CLIENT_MESSAGE_ID',
      );
    }

    /*
     * clientMessageId phải là UUID hợp lệ.
     */
    if (!this.isValidUuid(clientMessageId)) {
      throw new ChatError(
        'clientMessageId must be a valid UUID.',
        'INVALID_CLIENT_MESSAGE_ID',
      );
    }

    /*
     * Message type phải tồn tại về mặt cấu trúc.
     * Semantic validation theo từng message type
     * được thực hiện ngay sau bước basic validation
     * bằng message content schema registry.
     */
    if (
      typeof type !== 'string' ||
      !type.trim()
    ) {
      throw new ChatError(
        'Message type is required.',
        'INVALID_MESSAGE_TYPE',
      );
    }

    /*
     * Content phải là JSON object.
     * Không chấp nhận:
     * - null
     * - array
     */
    if (
      content === null ||
      typeof content !== 'object' ||
      Array.isArray(content)
    ) {
      throw new ChatError(
        'Message content must be a JSON object.',
        'INVALID_MESSAGE_CONTENT',
      );
    }
  }

  private encodeTimelineCursor(
    cursor: {
      createdAt: Date;
      id: string;
    },
  ): string {
    const payload = JSON.stringify({
      createdAt:
        cursor.createdAt.toISOString(),
      id: cursor.id,
    });

    return Buffer
      .from(payload, 'utf8')
      .toString('base64url');
  }

  private decodeTimelineCursor(
    cursor: string,
  ): {
    createdAt: Date;
    id: string;
  } {
    if (!cursor.trim()) {
      throw new ChatError(
        'cursor must not be empty.',
        'INVALID_MESSAGE_CURSOR',
      );
    }

    try {
      const payload =
        Buffer
          .from(cursor, 'base64url')
          .toString('utf8');

      const parsed =
        JSON.parse(payload) as {
          createdAt?: unknown;
          id?: unknown;
        };

      if (
        typeof parsed.createdAt !== 'string' ||
        typeof parsed.id !== 'string'
      ) {
        throw new Error();
      }

      if (!this.isValidUuid(parsed.id)) {
        throw new Error();
      }

      const createdAt =
        new Date(parsed.createdAt);

      if (Number.isNaN(createdAt.getTime())) {
        throw new Error();
      }

      return {
        createdAt,
        id: parsed.id,
      };
    } catch {
      throw new ChatError(
        'cursor is invalid.',
        'INVALID_MESSAGE_CURSOR',
      );
    }
  }

  private isValidUuid(
    value: unknown,
  ): value is string {
    if (typeof value !== 'string') {
      return false;
    }

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private assertIdempotentPayload(
    existing: Message,
    input: SendMessageInput,
  ): void {
    const sameConversation =
      existing.conversationId ===
      input.conversationId;

    const sameSender =
      existing.senderId ===
      input.senderId;

    const sameType =
      existing.type ===
      input.type;

    const sameReplyTarget =
      (existing.replyToMessageId ?? null) ===
      (input.replyToMessageId ?? null);

    const sameContent =
      JSON.stringify(existing.content) ===
        JSON.stringify(input.content) ||
      serializeCanonicalContent(existing.content) ===
        serializeCanonicalContent(input.content);

    if (
      !sameConversation ||
      !sameSender ||
      !sameType ||
      !sameReplyTarget ||
      !sameContent
    ) {
      throw new MessagePayloadConflictError(
        input.clientMessageId,
      );
    }
  }

  private isClientMessageUniqueViolation(
    error: unknown,
  ): boolean {
    if (
      !(error instanceof UniqueConstraintError)
    ) {
      return false;
    }

    const constraint =
      (
        error.parent as {
          constraint?: string;
        } | undefined
      )?.constraint;

    return (
      constraint ===
      'uq_messages_client_id'
    );
  }
}