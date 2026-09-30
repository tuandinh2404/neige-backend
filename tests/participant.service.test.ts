import { describe, expect, it, vi } from "vitest";

import { ParticipantService } from "../src/module/chat/participant/participant.service";
import { ParticipantRepository } from "../src/module/chat/participant/participant.repository";
import { ConversationRepository } from "../src/module/chat/conversation/conversation.repository";
import { Sequelize } from "sequelize";
import { UserRepository } from "../src/module/user/user.repository";

describe("ParticipantService.join", () => {
  const conversationId = "550e8400-e29b-41d4-a716-446655440000";
  const userId = 12;

  function createService() {
    const participantRepo = {
      findOne: vi.fn(),
      rejoin: vi.fn(),
    };

    const conversationRepo = {
      findById: vi.fn(),
    };

    const sequelize = {
      transaction: vi.fn(),
    };

    const userRepo = {
      getById: vi.fn(),
    };

    const service = new ParticipantService(
      participantRepo as unknown as ParticipantRepository,
      conversationRepo as unknown as ConversationRepository,
      sequelize as unknown as Sequelize,
      userRepo as unknown as UserRepository,
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
      service.join(conversationId, userId),
    ).rejects.toThrow(
      `Conversation ${conversationId} not found.`,
    );

    expect(participantRepo.findOne).not.toHaveBeenCalled();
  });

  it("should reject joining a non-group conversation", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    conversationRepo.findById.mockResolvedValue({
      type: "direct",
    });

    await expect(
      service.join(conversationId, userId),
    ).rejects.toThrow(
      "Group conversations cannot be joined.",
    );

    expect(participantRepo.findOne).not.toHaveBeenCalled();
  });

  it("should return when user is already an active participant", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    conversationRepo.findById.mockResolvedValue({
      type: "group",
    });

    participantRepo.findOne.mockResolvedValue({
      userId,
      leftAt: null,
    });

    await expect(
      service.join(conversationId, userId),
    ).resolves.toBeUndefined();

    expect(participantRepo.rejoin).not.toHaveBeenCalled();
  });

  it("should rejoin when user has left the group", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    conversationRepo.findById.mockResolvedValue({
      type: "group",
    });

    participantRepo.findOne.mockResolvedValue({
      userId,
      leftAt: new Date(),
    });

    participantRepo.rejoin.mockResolvedValue(true);

    await expect(
      service.join(conversationId, userId),
    ).resolves.toBeUndefined();

    expect(participantRepo.rejoin).toHaveBeenCalledWith(
      conversationId,
      userId,
    );
  });

  it("should reject when rejoin fails", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    conversationRepo.findById.mockResolvedValue({
      type: "group",
    });

    participantRepo.findOne.mockResolvedValue({
      userId,
      leftAt: new Date(),
    });

    participantRepo.rejoin.mockResolvedValue(false);

    await expect(
      service.join(conversationId, userId),
    ).rejects.toThrow(
      `Failed to rejoin conversation ${conversationId}.`,
    );
  });

  it("should reject a new self-join", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    conversationRepo.findById.mockResolvedValue({
      type: "group",
    });

    participantRepo.findOne.mockResolvedValue(null);

    await expect(
      service.join(conversationId, userId),
    ).rejects.toThrow(
      "Users cannot join group conversations directly.",
    );

    expect(participantRepo.rejoin).not.toHaveBeenCalled();
  });

  it("should reject an invalid conversationId before querying repositories", async () => {
    const {
      service,
      participantRepo,
      conversationRepo,
    } = createService();

    await expect(
      service.join("invalid-id", userId),
    ).rejects.toThrow(
      "conversationId must be a valid UUID.",
    );

    expect(conversationRepo.findById).not.toHaveBeenCalled();
    expect(participantRepo.findOne).not.toHaveBeenCalled();
  });
});