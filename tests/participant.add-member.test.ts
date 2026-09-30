import { describe, expect, it, vi, afterEach } from "vitest";

import { ParticipantService } from "../src/module/chat/participant/participant.service";
import { ParticipantRepository } from "../src/module/chat/participant/participant.repository";
import { ConversationRepository } from "../src/module/chat/conversation/conversation.repository";
import { Sequelize } from "sequelize";
import { UserRepository } from "../src/module/user/user.repository";
import EventDispatcher from "../src/core/events/event.dispatcher";

describe("ParticipantService.addMember", () => {
  const conversationId = "550e8400-e29b-41d4-a716-446655440000";
  const ownerId = 12;
  const targetUserId = 20;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createService() {
    const participantRepo = {
      findActive: vi.fn(),
      findOne: vi.fn(),
      add: vi.fn(),
      rejoin: vi.fn(),
      findActiveByConversation: vi.fn(),
    };

    const conversationRepo = {
      findById: vi.fn(),
    };

    const userRepo = {
      getById: vi.fn(),
    };

    const sequelize = {
      transaction: vi.fn(async (callback: (tx: object) => Promise<unknown>) =>
        callback({}),
      ),
    };

    const service = new ParticipantService(
      participantRepo as unknown as ParticipantRepository,
      conversationRepo as unknown as ConversationRepository,
      sequelize as unknown as Sequelize,
      userRepo as unknown as UserRepository,
    );

    return { service, participantRepo, conversationRepo, userRepo };
  }

  it("should add a new member when the requester is the owner", async () => {
    const { service, participantRepo, conversationRepo, userRepo } = createService();

    conversationRepo.findById.mockResolvedValue({ type: "group" });
    userRepo.getById.mockResolvedValue({ id: targetUserId });
    participantRepo.findActive.mockResolvedValue({
      userId: ownerId,
      role: "OWNER",
      leftAt: null,
    });
    participantRepo.findOne.mockResolvedValue(null);
    participantRepo.add.mockResolvedValue({
      userId: targetUserId,
      role: "MEMBER",
    });
    participantRepo.findActiveByConversation.mockResolvedValue([
      { userId: ownerId },
      { userId: targetUserId },
    ]);

    const dispatchSpy = vi.spyOn(EventDispatcher, "dispatch").mockImplementation(() => {});

    await expect(
      service.addMember(conversationId, ownerId, targetUserId),
    ).resolves.toBeUndefined();

    expect(participantRepo.add).toHaveBeenCalledWith(
      conversationId,
      targetUserId,
      expect.any(Object),
      "MEMBER",
    );

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const [targetUserIds, envelope] = dispatchSpy.mock.calls[0];
    expect(targetUserIds).toEqual([ownerId, targetUserId]);
    expect(envelope.event).toBe("conversation.participant_joined");
    expect(envelope.data).toEqual({
      conversationId,
      joinedUserId: targetUserId,
      addedBy: ownerId,
    });
  });

  it("should reject when requester is not the owner", async () => {
    const { service, participantRepo, conversationRepo, userRepo } = createService();

    conversationRepo.findById.mockResolvedValue({ type: "group" });
    userRepo.getById.mockResolvedValue({ id: targetUserId });
    participantRepo.findActive.mockResolvedValue({
      userId: ownerId,
      role: "MEMBER",
      leftAt: null,
    });

    await expect(
      service.addMember(conversationId, ownerId, targetUserId),
    ).rejects.toMatchObject({
      code: "ONLY_GROUP_OWNER_CAN_ADD_MEMBER",
    });

    expect(participantRepo.add).not.toHaveBeenCalled();
  });

  it("should reject adding an already active member", async () => {
    const { service, participantRepo, conversationRepo, userRepo } = createService();

    conversationRepo.findById.mockResolvedValue({ type: "group" });
    userRepo.getById.mockResolvedValue({ id: targetUserId });
    participantRepo.findActive.mockResolvedValue({
      userId: ownerId,
      role: "OWNER",
      leftAt: null,
    });
    participantRepo.findOne.mockResolvedValue({
      userId: targetUserId,
      leftAt: null,
    });

    await expect(
      service.addMember(conversationId, ownerId, targetUserId),
    ).rejects.toMatchObject({
      code: "PARTICIPANT_ALREADY_EXISTS",
    });

    expect(participantRepo.add).not.toHaveBeenCalled();
  });

  it("should rejoin a previous member instead of creating a duplicate row", async () => {
    const { service, participantRepo, conversationRepo, userRepo } = createService();

    conversationRepo.findById.mockResolvedValue({ type: "group" });
    userRepo.getById.mockResolvedValue({ id: targetUserId });
    participantRepo.findActive.mockResolvedValue({
      userId: ownerId,
      role: "OWNER",
      leftAt: null,
    });
    participantRepo.findOne.mockResolvedValue({
      userId: targetUserId,
      leftAt: new Date(),
      role: "MEMBER",
    });
    participantRepo.rejoin.mockResolvedValue(true);
    participantRepo.findActiveByConversation.mockResolvedValue([
      { userId: ownerId },
      { userId: targetUserId },
    ]);

    await expect(
      service.addMember(conversationId, ownerId, targetUserId),
    ).resolves.toBeUndefined();

    expect(participantRepo.rejoin).toHaveBeenCalledWith(
      conversationId,
      targetUserId,
      expect.any(Object),
    );
    expect(participantRepo.add).not.toHaveBeenCalled();
  });
});
