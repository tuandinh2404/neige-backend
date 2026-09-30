import { afterEach, describe, expect, it, vi } from "vitest";

import { ParticipantService } from "../src/module/chat/participant/participant.service";
import { ParticipantRepository } from "../src/module/chat/participant/participant.repository";
import { ConversationRepository } from "../src/module/chat/conversation/conversation.repository";
import EventDispatcher from "../src/core/events/event.dispatcher";

describe("ParticipantService.leave", () => {
  const conversationId = "550e8400-e29b-41d4-a716-446655440000";
  const userId = 12;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createService() {
    const participantRepo = {
      findActiveByConversation: vi.fn(),
      leave: vi.fn(),
    };

    const conversationRepo = {
      findById: vi.fn(),
    };

    const service = new ParticipantService(
      participantRepo as unknown as ParticipantRepository,
      conversationRepo as unknown as ConversationRepository,
    );

    return {
      service,
      participantRepo,
      conversationRepo,
    };
  }

  it("should reject when conversation does not exist", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    conversationRepo.findById.mockResolvedValue(null);

    await expect(
      service.leave(conversationId, userId),
    ).rejects.toThrow(
      `Conversation ${conversationId} not found.`,
    );

    expect(
      participantRepo.findActiveByConversation,
    ).not.toHaveBeenCalled();

    expect(
      participantRepo.leave,
    ).not.toHaveBeenCalled();
  });

  it("should reject leaving a direct conversation", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    conversationRepo.findById.mockResolvedValue({
      type: "direct",
    });

    await expect(
      service.leave(conversationId, userId),
    ).rejects.toThrow(
      "Direct conversations cannot be left.",
    );

    expect(
      participantRepo.findActiveByConversation,
    ).not.toHaveBeenCalled();

    expect(
      participantRepo.leave,
    ).not.toHaveBeenCalled();
  });

  it("should reject when user is not an active participant", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    conversationRepo.findById.mockResolvedValue({
      type: "group",
    });

    participantRepo.findActiveByConversation.mockResolvedValue([
      {
        userId: 14,
      },
    ]);

    participantRepo.leave.mockResolvedValue(false);

    await expect(
      service.leave(conversationId, userId),
    ).rejects.toMatchObject({
      code: "NOT_CONVERSATION_PARTICIPANT",
    });

    expect(
      participantRepo.leave,
    ).toHaveBeenCalledWith(
      conversationId,
      userId,
    );
  });

  it("should leave the group and dispatch participant_left event", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    conversationRepo.findById.mockResolvedValue({
      type: "group",
    });

    participantRepo.findActiveByConversation.mockResolvedValue([
      { userId: 12 },
      { userId: 14 },
      { userId: 16 },
    ]);

    participantRepo.leave.mockResolvedValue(true);

    const dispatchSpy = vi
      .spyOn(EventDispatcher, "dispatch")
      .mockImplementation(() => {});

    await expect(
      service.leave(conversationId, userId),
    ).resolves.toBeUndefined();

    expect(
      participantRepo.leave,
    ).toHaveBeenCalledWith(
      conversationId,
      userId,
    );

    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    const [targetUserIds, envelope] =
      dispatchSpy.mock.calls[0];

    expect(targetUserIds).toEqual([12, 14, 16]);

    expect(envelope.event).toBe(
      "conversation.participant_left",
    );

    expect(envelope.data).toEqual({
      conversationId,
      leftUserId: userId,
    });
  });

  it("should reject an invalid conversationId before querying repositories", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    await expect(
      service.leave("invalid-id", userId),
    ).rejects.toThrow(
      "conversationId must be a valid UUID.",
    );

    expect(
      conversationRepo.findById,
    ).not.toHaveBeenCalled();

    expect(
      participantRepo.findActiveByConversation,
    ).not.toHaveBeenCalled();

    expect(
      participantRepo.leave,
    ).not.toHaveBeenCalled();
  });
});