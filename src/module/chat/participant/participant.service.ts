import { ParticipantRepository } from "./participant.repository";
import { Sequelize, UniqueConstraintError } from "sequelize";
import { UserRepository } from "@/module/user/user.repository";
import EventDispatcher from "@/core/events/event.dispatcher";
import { createEventEnvelope } from "@/core/events/event.factory";
import { ConversationRepository } from "../conversation/conversation.repository";

import {
  ChatError,
  GroupSelfJoinNotAllowedError,
  NotConversationParticipantError,
  OnlyGroupOwnerCanAddMemberError,
  ParticipantAlreadyExistsError,
  OwnerCannotLeaveGroupError
} from "../shared/chat.errors";

export class ParticipantService {
  constructor(
    private readonly participantRepo: ParticipantRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly sequelize: Sequelize,
    private readonly userRepo: UserRepository,
  ) {}
  async join(conversationId: string, userId: number): Promise<void> {
    this.validateConversationId(conversationId);

    const conversation = await this.conversationRepo.findById(conversationId);

    if (!conversation) {
      throw new ChatError(
        `Conversation ${conversationId} not found.`,
        "CONVERSATION_NOT_FOUND",
        404,
      );
    }
    if(conversation.type !== "group") {
      throw new ChatError(
        "Group conversations cannot be joined.",
        "GROUP_CONVERSATION_CANNOT_BE_JOINED",
        400,
      );
    }

    const existing = await this.participantRepo.findOne(conversationId, userId);

    if (existing) {
      if (existing.leftAt) {
        const rejoined = await this.participantRepo.rejoin(conversationId, userId);

        if (!rejoined) {
          throw new ChatError(
            `Failed to rejoin conversation ${conversationId}.`,
            "FAILED_TO_REJOIN_CONVERSATION",
            500,
          );
        } 
        return;
      }

      return;
    }

    throw new GroupSelfJoinNotAllowedError();
  }
  async addMember(
    conversationId: string,
    ownerId: number,
    targetUserId: number,
  ): Promise<void> {
    this.validateConversationId(conversationId);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new ChatError(
        'targetUserId must be a positive integer.',
        'INVALID_TARGET_USER_ID',
      );
    }

    const conversation = await this.conversationRepo.findById(conversationId);

    if (!conversation) {
      throw new ChatError(
        `Conversation ${conversationId} not found.`,
        'CONVERSATION_NOT_FOUND',
        404,
      );
    }

    if (conversation.type !== 'group') {
      throw new ChatError(
        'Members can only be added to group conversations.',
        'GROUP_CONVERSATION_REQUIRED',
        400,
      );
    }

    const targetUser = await this.userRepo.getById(targetUserId);

    if (!targetUser) {
      throw new ChatError(
        `User ${targetUserId} not found.`,
        'USER_NOT_FOUND',
        404,
      );
    }

    try {
      await this.sequelize.transaction(async (tx) => {
        const owner = await this.participantRepo.findActive(
          conversationId,
          ownerId,
          tx,
          true,
        );

        if (!owner) {
          throw new NotConversationParticipantError(ownerId, conversationId);
        }

        if (owner.role !== 'OWNER') {
          throw new OnlyGroupOwnerCanAddMemberError();
        }

        const existing = await this.participantRepo.findOne(
          conversationId,
          targetUserId,
          tx,
          true,
        );

        if (existing) {
          if (!existing.leftAt) {
            throw new ParticipantAlreadyExistsError(
              targetUserId,
              conversationId,
            );
          }

          const rejoined = await this.participantRepo.rejoin(
            conversationId,
            targetUserId,
            tx,
          );

          if (!rejoined) {
            throw new ChatError(
              `Failed to rejoin conversation ${conversationId}.`,
              'FAILED_TO_REJOIN_CONVERSATION',
              500,
            );
          }

          return;
        }

        await this.participantRepo.add(
          conversationId,
          targetUserId,
          tx,
          'MEMBER',
        );
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ParticipantAlreadyExistsError(
          targetUserId,
          conversationId,
        );
      }

      throw error;
    }

    const participants = await this.participantRepo.findActiveByConversation(
      conversationId,
    );

    const targetUserIds = participants.map((participant) => participant.userId);

    const envelope = createEventEnvelope('conversation.participant_joined', {
      conversationId,
      joinedUserId: targetUserId,
      addedBy: ownerId,
    });

    EventDispatcher.dispatch(targetUserIds, envelope);
  }

  async leave(conversationId: string, userId: number): Promise<void> {
    this.validateConversationId(conversationId);

    const conversation = await this.conversationRepo.findById(conversationId);

    if (!conversation) {
      throw new ChatError(
        `Conversation ${conversationId} not found.`,
        "CONVERSATION_NOT_FOUND",
        404,
      );
    }

    if (conversation.type === "direct") {
      throw new ChatError(
        "Direct conversations cannot be left.",
        "DIRECT_CONVERSATION_CANNOT_BE_LEFT",
        400,
      );
    }
    const currentParticipant = await this.participantRepo.findActive(
      conversationId,
      userId,
    );

    if (!currentParticipant) {
      throw new NotConversationParticipantError(userId, conversationId);
    }

    if (currentParticipant.role === "OWNER") {
      throw new OwnerCannotLeaveGroupError();
    }

    const participant =
      await this.participantRepo.findActiveByConversation(conversationId);

    const targetUserIds = participant.map((p) => p.userId);

    const updated = await this.participantRepo.leave(conversationId, userId);

    if (!updated) {
      throw new NotConversationParticipantError(userId, conversationId);
    }

    const envelope = createEventEnvelope("conversation.participant_left", {
      conversationId,
      leftUserId: userId,
    });

    EventDispatcher.dispatch(targetUserIds, envelope);
  }

  async archive(conversationId: string, userId: number): Promise<void> {
    this.validateConversationId(conversationId);

    const updated = await this.participantRepo.archive(conversationId, userId);

    if (!updated) {
      throw new NotConversationParticipantError(userId, conversationId);
    }
  }

  async unarchive(conversationId: string, userId: number): Promise<void> {
    this.validateConversationId(conversationId);

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
    this.validateConversationId(conversationId);

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
    this.validateConversationId(conversationId);

    const updated = await this.participantRepo.unmute(conversationId, userId);

    if (!updated) {
      throw new NotConversationParticipantError(userId, conversationId);
    }
  }

  async markRead(
    conversationId: string,
    userId: number,
    messageId: string,
  ): Promise<boolean> {
    this.validateConversationId(conversationId);
    this.validateMessageId(messageId);

    const participant = await this.participantRepo.findActive(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new NotConversationParticipantError(userId, conversationId);
    }

    const updated = await this.participantRepo.updateReadWatermark(
      conversationId,
      userId,
      messageId,
    );

    if (!updated) {
      return false;
    }

    void this.dispatchMessageRead(conversationId, messageId, userId);

    return true;
  }

  async markDelivered(
    conversationId: string,
    userId: number,
    messageId: string,
  ): Promise<boolean> {
    this.validateConversationId(conversationId);
    this.validateMessageId(messageId);

    const participant = await this.participantRepo.findActive(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new NotConversationParticipantError(userId, conversationId);
    }

    const updated = await this.participantRepo.updateDeliveredWatermark(
      conversationId,
      userId,
      messageId,
    );

    if (!updated) {
      return false;
    }

    void this.dispatchMessageDelivered(conversationId, messageId, userId);

    return true;
  }

  private validateConversationId(conversationId: string): void {
    if (!this.isValidUuid(conversationId)) {
      throw new ChatError(
        "conversationId must be a valid UUID.",
        "INVALID_CONVERSATION_ID",
      );
    }
  }

  private validateMessageId(messageId: string): void {
    if (!this.isValidUuid(messageId)) {
      throw new ChatError(
        "messageId must be a valid UUID.",
        "INVALID_MESSAGE_ID",
      );
    }
  }

  private isValidUuid(value: unknown): value is string {
    if (typeof value !== "string") {
      return false;
    }

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
  private async dispatchMessageDelivered(
    conversationId: string,
    messageId: string,
    deliveredBy: number,
  ): Promise<void> {
    try {
      const participants =
        await this.participantRepo.findActiveByConversation(conversationId);

      const targetUserIds = participants
        .filter(
          (participant) =>
            participant.userId === deliveredBy ||
            participant.messageRequestStatus !== "PENDING",
        )
        .map((participant) => participant.userId);

      const envelope = createEventEnvelope("message.delivered", {
        conversationId,
        messageId,
        deliveredBy,
      });

      EventDispatcher.dispatch(targetUserIds, envelope);
    } catch (error) {
      console.error("Failed to dispatch message.delivered:", error);
    }
  }

  private async dispatchMessageRead(
    conversationId: string,
    messageId: string,
    readerId: number,
  ): Promise<void> {
    try {
      const participants =
        await this.participantRepo.findActiveByConversation(conversationId);

      const targetUserIds = participants
        .filter(
          (participant) =>
            participant.userId === readerId ||
            participant.messageRequestStatus !== "PENDING",
        )
        .map((participant) => participant.userId);

      const envelope = createEventEnvelope("message.read", {
        conversationId,
        messageId,
        readerId,
      });

      EventDispatcher.dispatch(targetUserIds, envelope);
    } catch (error) {
      console.error("Failed to dispatch message.read:", error);
    }
  }
}
