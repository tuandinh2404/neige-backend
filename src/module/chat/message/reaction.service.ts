import { ReactionRepository } from "./reaction.repository";
import { ParticipantRepository } from "../participant/participant.repository";
import { MessageRepository } from "./message.repository";
import { MessageReaction } from "./reaction.model";
import EventDispatcher from "@/core/events/event.dispatcher";
import { createEventEnvelope } from "@/core/events/event.factory";

import {
  InvalidReactionError,
  MessageConversationMismatchError,
  MessageNotFoundError,
  NotConversationParticipantError,
} from "../shared/chat.errors";

export interface AddReactionInput {
  conversationId: string;
  messageId: string;
  userId: number;
  reaction: string;
}

export class ReactionService {
  constructor(
    private readonly reactionRepo: ReactionRepository,
    private readonly participantRepo: ParticipantRepository,
    private readonly messageRepo: MessageRepository,
  ) {}

  async addOrUpdateReaction(input: AddReactionInput): Promise<MessageReaction> {
    const { conversationId, messageId, userId, reaction } = input;

    /*
     * 1. User phải đang active participant.
     */
    const participant = await this.participantRepo.findActive(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new NotConversationParticipantError(userId, conversationId);
    }

    /*
     * 2. Message phải tồn tại.
     */
    const message = await this.messageRepo.findById(messageId);

    if (!message) {
      throw new MessageNotFoundError(messageId);
    }

    /*
     * 3. Message phải thuộc conversation hiện tại.
     */
    if (message.conversationId !== conversationId) {
      throw new MessageConversationMismatchError();
    }

    /*
     * 4. Không cho reaction vào message đã deleted.
     */
    if (message.deletedAt) {
      throw new InvalidReactionError();
    }

    /*
     * 5. Reaction phải là chuỗi hợp lệ.
     */
    if (typeof reaction !== "string") {
      throw new InvalidReactionError();
    }

    const normalizedReaction = reaction.trim();

    if (!normalizedReaction) {
      throw new InvalidReactionError();
    }

    if (Array.from(normalizedReaction).length > 8) {
      throw new InvalidReactionError();
    }

    /*
     * 6. PK (message_id, user_id) làm operation này
     *    trở thành add-or-update.
     */
    const savedReaction = await this.reactionRepo.upsert({
      messageId,
      userId,
      reaction: normalizedReaction,
    });

    void this.dispatchReactionAdded(
      conversationId,
      messageId,
      userId,
      normalizedReaction,
    );

    return savedReaction;
  }

  private async dispatchReactionAdded(
    conversationId: string,
    messageId: string,
    userId: number,
    reaction: string,
  ): Promise<void> {
    try {
      const participants =
        await this.participantRepo.findActiveByConversation(conversationId);

      const targetUserIds = participants
        .filter(
          (participant) =>
            participant.userId === userId ||
            participant.messageRequestStatus !== "PENDING",
        )
        .map((participant) => participant.userId);

      const envelope = createEventEnvelope("message.reaction_added", {
        conversationId,
        messageId,
        userId,
        reaction,
      });

      EventDispatcher.dispatch(targetUserIds, envelope);
    } catch (error) {
      console.error("Failed to dispatch message.reaction_added:", error);
    }
  }

  async removeReaction(
    conversationId: string,
    messageId: string,
    userId: number,
  ): Promise<void> {
    /*
     * 1. User phải đang active participant.
     */
    const participant = await this.participantRepo.findActive(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new NotConversationParticipantError(userId, conversationId);
    }

    /*
     * 2. Message phải tồn tại.
     */
    const message = await this.messageRepo.findById(messageId);

    if (!message) {
      throw new MessageNotFoundError(messageId);
    }

    /*
     * 3. Message phải thuộc conversation.
     */
    if (message.conversationId !== conversationId) {
      throw new MessageConversationMismatchError();
    }

    /*
     * 4. Remove không có reaction vẫn là idempotent.
     */
    const removed = await this.reactionRepo.remove(messageId, userId);
    if (removed) {
      void this.dispatchReactionRemoved(conversationId, messageId, userId);
    }
  }

  private async dispatchReactionRemoved(
    conversationId: string,
    messageId: string,
    userId: number,
  ): Promise<void> {
    try {
      const participants =
        await this.participantRepo.findActiveByConversation(conversationId);

      const targetUserIds = participants
        .filter(
          (participant) =>
            participant.userId === userId ||
            participant.messageRequestStatus !== "PENDING",
        )
        .map((participant) => participant.userId);

      const envelope = createEventEnvelope("message.reaction_removed", {
        conversationId,
        messageId,
        userId,
      });

      EventDispatcher.dispatch(targetUserIds, envelope);
    } catch (error) {
      console.error("Failed to dispatch message.reaction_removed:", error);
    }
  }

  async listReactions(
    conversationId: string,
    messageId: string,
    userId: number,
  ): Promise<MessageReaction[]> {
    /*
     * 1. User phải đang active participant.
     */
    const participant = await this.participantRepo.findActive(
      conversationId,
      userId,
    );

    if (!participant) {
      throw new NotConversationParticipantError(userId, conversationId);
    }

    /*
     * 2. Message phải tồn tại.
     */
    const message = await this.messageRepo.findById(messageId);

    if (!message) {
      throw new MessageNotFoundError(messageId);
    }

    /*
     * 3. Message phải thuộc conversation.
     */
    if (message.conversationId !== conversationId) {
      throw new MessageConversationMismatchError();
    }

    return this.reactionRepo.findByMessage(messageId);
  }
}
