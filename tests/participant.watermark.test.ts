import { afterEach, describe, expect, it, vi } from "vitest";

import { ParticipantService } from "../src/module/chat/participant/participant.service";
import { ParticipantRepository } from "../src/module/chat/participant/participant.repository";
import { ConversationRepository } from "../src/module/chat/conversation/conversation.repository";
import EventDispatcher from "../src/core/events/event.dispatcher";

describe("ParticipantService.read/delivered", () => {
  const conversationId =
    "550e8400-e29b-41d4-a716-446655440000";

  const messageId =
    "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

  const userId = 12;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createService() {
    const participantRepo = {
      findActive: vi.fn(),
      updateReadWatermark: vi.fn(),
      updateDeliveredWatermark: vi.fn(),
      findActiveByConversation: vi.fn(),
    };

    const conversationRepo = {};

    const service = new ParticipantService(
      participantRepo as unknown as ParticipantRepository,
      conversationRepo as unknown as ConversationRepository,
    );

    return {
      service,
      participantRepo,
    };
  }

  describe("markRead", () => {
    it("should reject when user is not an active participant", async () => {
      const { service, participantRepo } = createService();

      participantRepo.findActive.mockResolvedValue(null);

      await expect(
        service.markRead(
          conversationId,
          userId,
          messageId,
        ),
      ).rejects.toMatchObject({
        code: "NOT_CONVERSATION_PARTICIPANT",
      });

      expect(
        participantRepo.updateReadWatermark,
      ).not.toHaveBeenCalled();
    });

    it("should reject an invalid messageId", async () => {
      const { service, participantRepo } = createService();

      await expect(
        service.markRead(
          conversationId,
          userId,
          "invalid-id",
        ),
      ).rejects.toThrow(
        "messageId must be a valid UUID.",
      );

      expect(
        participantRepo.findActive,
      ).not.toHaveBeenCalled();
    });

    it("should return true and dispatch message.read when watermark changes", async () => {
      const { service, participantRepo } = createService();

      participantRepo.findActive.mockResolvedValue({
        userId,
      });

      participantRepo.updateReadWatermark.mockResolvedValue(true);

      participantRepo.findActiveByConversation.mockResolvedValue([
        {
          userId: 12,
          messageRequestStatus: "ACCEPTED",
        },
        {
          userId: 14,
          messageRequestStatus: "ACCEPTED",
        },
      ]);

      const dispatchSpy = vi
        .spyOn(EventDispatcher, "dispatch")
        .mockImplementation(() => {});

      const result = await service.markRead(
        conversationId,
        userId,
        messageId,
      );

      await Promise.resolve();

      expect(result).toBe(true);

      expect(
        participantRepo.updateReadWatermark,
      ).toHaveBeenCalledWith(
        conversationId,
        userId,
        messageId,
      );

      expect(dispatchSpy).toHaveBeenCalledTimes(1);

      const [targetUserIds, envelope] =
        dispatchSpy.mock.calls[0];

      expect(targetUserIds).toEqual([12, 14]);

      expect(envelope.event).toBe(
        "message.read",
      );

      expect(envelope.data).toEqual({
        conversationId,
        messageId,
        readerId: userId,
      });
    });

    it("should return false and not dispatch when watermark does not change", async () => {
      const { service, participantRepo } = createService();

      participantRepo.findActive.mockResolvedValue({
        userId,
      });

      participantRepo.updateReadWatermark.mockResolvedValue(false);

      const dispatchSpy = vi
        .spyOn(EventDispatcher, "dispatch")
        .mockImplementation(() => {});

      const result = await service.markRead(
        conversationId,
        userId,
        messageId,
      );

      expect(result).toBe(false);
      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe("markDelivered", () => {
    it("should reject when user is not an active participant", async () => {
      const { service, participantRepo } = createService();

      participantRepo.findActive.mockResolvedValue(null);

      await expect(
        service.markDelivered(
          conversationId,
          userId,
          messageId,
        ),
      ).rejects.toMatchObject({
        code: "NOT_CONVERSATION_PARTICIPANT",
      });

      expect(
        participantRepo.updateDeliveredWatermark,
      ).not.toHaveBeenCalled();
    });

    it("should reject an invalid messageId", async () => {
      const { service, participantRepo } = createService();

      await expect(
        service.markDelivered(
          conversationId,
          userId,
          "invalid-id",
        ),
      ).rejects.toThrow(
        "messageId must be a valid UUID.",
      );

      expect(
        participantRepo.findActive,
      ).not.toHaveBeenCalled();
    });

    it("should return true and dispatch message.delivered when watermark changes", async () => {
      const { service, participantRepo } = createService();

      participantRepo.findActive.mockResolvedValue({
        userId,
      });

      participantRepo.updateDeliveredWatermark.mockResolvedValue(true);

      participantRepo.findActiveByConversation.mockResolvedValue([
        {
          userId: 12,
          messageRequestStatus: "ACCEPTED",
        },
        {
          userId: 14,
          messageRequestStatus: "ACCEPTED",
        },
      ]);

      const dispatchSpy = vi
        .spyOn(EventDispatcher, "dispatch")
        .mockImplementation(() => {});

      const result = await service.markDelivered(
        conversationId,
        userId,
        messageId,
      );

      await Promise.resolve();

      expect(result).toBe(true);

      expect(
        participantRepo.updateDeliveredWatermark,
      ).toHaveBeenCalledWith(
        conversationId,
        userId,
        messageId,
      );

      expect(dispatchSpy).toHaveBeenCalledTimes(1);

      const [targetUserIds, envelope] =
        dispatchSpy.mock.calls[0];

      expect(targetUserIds).toEqual([12, 14]);

      expect(envelope.event).toBe(
        "message.delivered",
      );

      expect(envelope.data).toEqual({
        conversationId,
        messageId,
        deliveredBy: userId,
      });
    });

    it("should return false and not dispatch when watermark does not change", async () => {
      const { service, participantRepo } = createService();

      participantRepo.findActive.mockResolvedValue({
        userId,
      });

      participantRepo.updateDeliveredWatermark.mockResolvedValue(false);

      const dispatchSpy = vi
        .spyOn(EventDispatcher, "dispatch")
        .mockImplementation(() => {});

      const result = await service.markDelivered(
        conversationId,
        userId,
        messageId,
      );

      expect(result).toBe(false);
      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });
});