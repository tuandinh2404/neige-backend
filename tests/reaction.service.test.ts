import { afterEach, describe, expect, it, vi } from "vitest";

import { ReactionService } from "../src/module/chat/message/reaction.service";
import { ReactionRepository } from "../src/module/chat/message/reaction.repository";
import { ParticipantRepository } from "../src/module/chat/participant/participant.repository";
import { MessageRepository } from "../src/module/chat/message/message.repository";
import EventDispatcher from "../src/core/events/event.dispatcher";


describe("ReactionService", () => {
  const conversationId = "550e8400-e29b-41d4-a716-446655440000";
  const messageId = "7ba7b810-9dad-41d1-80b4-00c04fd430c8";
  const userId = 12;

  function createService() {
    const reactionRepo = {
      upsert: vi.fn(),
      remove: vi.fn(),
      findByMessage: vi.fn(),
    };

    const participantRepo = {
      findActive: vi.fn(),
      findActiveByConversation: vi.fn(),
    };

    const messageRepo = {
      findById: vi.fn(),
    };

    const service = new ReactionService(
      reactionRepo as unknown as ReactionRepository,
      participantRepo as unknown as ParticipantRepository,
      messageRepo as unknown as MessageRepository,
    );

    return {
      service,
      reactionRepo,
      participantRepo,
      messageRepo,
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject when user is not an active participant", async () => {
    const { service, participantRepo, messageRepo } = createService();

    participantRepo.findActive.mockResolvedValue(null);

    await expect(
      service.addOrUpdateReaction({
        conversationId,
        messageId,
        userId,
        reaction: "👍",
      }),
    ).rejects.toMatchObject({
      code: "NOT_CONVERSATION_PARTICIPANT",
    });

    expect(messageRepo.findById).not.toHaveBeenCalled();
  });

  it("should reject when message does not exist", async () => {
    const { service, participantRepo, messageRepo } = createService();

    participantRepo.findActive.mockResolvedValue({
      userId,
    });
    messageRepo.findById.mockResolvedValue(null);

    await expect(
      service.addOrUpdateReaction({
        conversationId,
        messageId,
        userId,
        reaction: "👍",
      }),
    ).rejects.toMatchObject({
      code: "MESSAGE_NOT_FOUND",
    });
  });

  it("should reject when message belongs to another conversation", async () => {
    const { service, participantRepo, messageRepo } = createService();

    participantRepo.findActive.mockResolvedValue({
      userId,
    });
    messageRepo.findById.mockResolvedValue({
      id: messageId,
      conversationId: "650e8400-e29b-41d4-a716-446655440000",
      deletedAt: null,
    });

    await expect(
      service.addOrUpdateReaction({
        conversationId,
        messageId,
        userId,
        reaction: "👍",
      }),
    ).rejects.toMatchObject({
      code: "MESSAGE_CONVERSATION_MISMATCH",
    });
  });

  it("should reject invalid reaction content", async () => {
    const { service, participantRepo, messageRepo, reactionRepo } = createService();

    participantRepo.findActive.mockResolvedValue({
      userId,
    });
    messageRepo.findById.mockResolvedValue({
      id: messageId,
      conversationId,
      deletedAt: null,
    });

    await expect(
      service.addOrUpdateReaction({
        conversationId,
        messageId,
        userId,
        reaction: "         ",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_REACTION",
    });

    expect(reactionRepo.upsert).not.toHaveBeenCalled();
  });

  it("should trim reaction before upsert", async () => {
    const { service, participantRepo, messageRepo, reactionRepo } = createService();

    const savedReaction = {
      messageId,
      userId,
      reaction: "👍",
    };

    participantRepo.findActive.mockResolvedValue({
      userId,
    });
    messageRepo.findById.mockResolvedValue({
      id: messageId,
      conversationId,
      deletedAt: null,
    });
    reactionRepo.upsert.mockResolvedValue(savedReaction);
    participantRepo.findActiveByConversation.mockResolvedValue([
      { userId, messageRequestStatus: "ACCEPTED" },
      { userId: 13, messageRequestStatus: "ACCEPTED" },
      { userId: 14, messageRequestStatus: "PENDING" },
    ]);

    const dispatchSpy = vi.spyOn(EventDispatcher, "dispatch");

    const result = await service.addOrUpdateReaction({
      conversationId,
      messageId,
      userId,
      reaction: "  👍  ",
    });

    expect(result).toBe(savedReaction);
    expect(reactionRepo.upsert).toHaveBeenCalledWith({
      messageId,
      userId,
      reaction: "👍",
    });

    await vi.waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      [userId, 13],
      expect.objectContaining({
        event: "message.reaction_added",
      }),
    );
  });

  it("should not dispatch reaction.removed when no reaction was removed", async () => {
    const { service, participantRepo, messageRepo, reactionRepo } = createService();

    participantRepo.findActive.mockResolvedValue({
      userId,
    });
    messageRepo.findById.mockResolvedValue({
      id: messageId,
      conversationId,
      deletedAt: null,
    });
    reactionRepo.remove.mockResolvedValue(false);

    const dispatchSpy = vi.spyOn(EventDispatcher, "dispatch");

    await service.removeReaction(
      conversationId,
      messageId,
      userId,
    );

    expect(reactionRepo.remove).toHaveBeenCalledWith(
      messageId,
      userId,
    );
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("should dispatch reaction.removed when a reaction was removed", async () => {
    const { service, participantRepo, messageRepo, reactionRepo } = createService();

    participantRepo.findActive.mockResolvedValue({
      userId,
    });
    messageRepo.findById.mockResolvedValue({
      id: messageId,
      conversationId,
      deletedAt: null,
    });
    reactionRepo.remove.mockResolvedValue(true);
    participantRepo.findActiveByConversation.mockResolvedValue([
      { userId, messageRequestStatus: "ACCEPTED" },
      { userId: 13, messageRequestStatus: "ACCEPTED" },
    ]);

    const dispatchSpy = vi.spyOn(EventDispatcher, "dispatch");

    await service.removeReaction(
      conversationId,
      messageId,
      userId,
    );

    await vi.waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      [userId, 13],
      expect.objectContaining({
        event: "message.reaction_removed",
      }),
    );
  });
});
