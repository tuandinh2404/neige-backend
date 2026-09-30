import { afterEach, describe, expect, it, vi } from "vitest";

import { MessageService } from "../src/module/chat/message/message.service";
import { MessageRepository } from "../src/module/chat/message/message.repository";
import { ParticipantRepository } from "../src/module/chat/participant/participant.repository";
import { ConversationRepository } from "../src/module/chat/conversation/conversation.repository";
import { FriendshipRepository } from "../src/module/friends/friends.repository";
import EventDispatcher from "../src/core/events/event.dispatcher";

describe("MessageService", () => {
  const conversationId = "550e8400-e29b-41d4-a716-446655440000";

  const clientMessageId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

  const messageId = "7ba7b810-9dad-41d1-80b4-00c04fd430c8";

  const senderId = 12;

  const input = {
    conversationId,
    senderId,
    clientMessageId,
    type: "text",
    content: {
      text: "hello",
    },
    replyToMessageId: null,
  };

  function createService() {
    const messageRepo = {
      findByClientMessageId: vi.fn(),
      findByIdWithSender: vi.fn(),
      insert: vi.fn(),
    };

    const participantRepo = {
      findActive: vi.fn(),
      findActiveByConversation: vi.fn(),
    };

    const conversationRepo = {
      findById: vi.fn(),
      touchLastMessage: vi.fn(),
    };

    const friendshipRepo = {
      isAcceptedPair: vi.fn(),
    };

    const sequelize = {
      transaction: vi.fn(),
    };

    const service = new MessageService(
      messageRepo as unknown as MessageRepository,
      participantRepo as unknown as ParticipantRepository,
      conversationRepo as unknown as ConversationRepository,
      friendshipRepo as unknown as FriendshipRepository,
      sequelize as any,
    );

    return {
      service,
      messageRepo,
      participantRepo,
      conversationRepo,
      friendshipRepo,
      sequelize,
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject when sender is not an active participant", async () => {
    const { service, participantRepo } = createService();

    participantRepo.findActive.mockResolvedValue(null);

    await expect(service.sendMessage(input)).rejects.toMatchObject({
      code: "NOT_CONVERSATION_PARTICIPANT",
    });
  });

  it("should reject when sender has a pending message request", async () => {
    const { service, participantRepo } = createService();

    participantRepo.findActive.mockResolvedValue({
      userId: senderId,
      messageRequestStatus: "PENDING",
    });

    await expect(service.sendMessage(input)).rejects.toMatchObject({
      code: "MESSAGE_REQUEST_PENDING",
    });
  });

  it("should return the existing message with created=false for an idempotent replay", async () => {
    const { service, participantRepo, messageRepo } = createService();

    participantRepo.findActive.mockResolvedValue({
      userId: senderId,
      messageRequestStatus: "ACCEPTED",
    });

    const existing = {
      id: messageId,
      conversationId,
      senderId,
      clientMessageId,
      type: "text",
      content: {
        text: "hello",
      },
      replyToMessageId: null,
      createdAt: new Date("2026-09-24T00:00:00.000Z"),
      deletedAt: null,
    };

    const hydrated = {
      ...existing,
      sender: {
        id: senderId,
        username: "test_user_e",
        avatar_url: null,
      },
    };

    messageRepo.findByClientMessageId.mockResolvedValue(existing);

    messageRepo.findByIdWithSender.mockResolvedValue(hydrated);

    const result = await service.sendMessage(input);

    expect(result.created).toBe(false);
    expect(result.message.id).toBe(messageId);

    expect(messageRepo.findByClientMessageId).toHaveBeenCalledWith(
      senderId,
      clientMessageId,
    );

    expect(messageRepo.insert).not.toHaveBeenCalled();
  });

  it("should reject an idempotency replay with different payload", async () => {
    const { service, participantRepo, messageRepo } = createService();

    participantRepo.findActive.mockResolvedValue({
      userId: senderId,
      messageRequestStatus: "ACCEPTED",
    });

    messageRepo.findByClientMessageId.mockResolvedValue({
      id: messageId,
      conversationId,
      senderId,
      clientMessageId,
      type: "text",
      content: {
        text: "different",
      },
      replyToMessageId: null,
    });

    await expect(service.sendMessage(input)).rejects.toMatchObject({
      code: "MESSAGE_IDEMPOTENCY_CONFLICT",
    });
  });

  it("should reject an invalid conversationId before repository access", async () => {
    const { service, participantRepo, messageRepo } = createService();

    const invalidInput = {
      ...input,
      conversationId: "invalid-id",
    };

    await expect(service.sendMessage(invalidInput)).rejects.toMatchObject({
      code: "INVALID_CONVERSATION_ID",
    });

    expect(participantRepo.findActive).not.toHaveBeenCalled();

    expect(messageRepo.findByClientMessageId).not.toHaveBeenCalled();
  });

  it("should reject an invalid clientMessageId", async () => {
    const { service, participantRepo } = createService();

    const invalidInput = {
      ...input,
      clientMessageId: "invalid-id",
    };

    await expect(service.sendMessage(invalidInput)).rejects.toMatchObject({
      code: "INVALID_CLIENT_MESSAGE_ID",
    });

    expect(participantRepo.findActive).not.toHaveBeenCalled();
  });

  it("should reject an invalid reply message id", async () => {
    const { service, participantRepo } = createService();

    const invalidInput = {
      ...input,
      replyToMessageId: "invalid-id",
    };

    await expect(service.sendMessage(invalidInput)).rejects.toMatchObject({
      code: "INVALID_REPLY_MESSAGE_ID",
    });

    expect(participantRepo.findActive).not.toHaveBeenCalled();
  });
});
