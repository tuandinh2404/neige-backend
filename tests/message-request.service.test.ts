import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { MessageRequestService } from "../src/module/chat/messageRequest/messageRequest.service";
import { ConversationRepository } from "../src/module/chat/conversation/conversation.repository";
import { ParticipantRepository } from "../src/module/chat/participant/participant.repository";
import EventDispatcher from "../src/core/events/event.dispatcher";

describe("MessageRequestService", () => {
  const conversationId =
    "550e8400-e29b-41d4-a716-446655440000";

  const userId = 12;

  function createService() {
    const conversationRepo = {};

    const participantRepo = {
      findOne: vi.fn(),
      findActiveByConversation: vi.fn(),
      updateMessageRequestStatus: vi.fn(),
    };

    const transaction = {};

    const sequelize = {
      transaction: vi.fn(async (callback) => {
        return callback(transaction);
      }),
    };

    const service = new MessageRequestService(
      sequelize as any,
      conversationRepo as unknown as ConversationRepository,
      participantRepo as unknown as ParticipantRepository,
    );

    return {
      service,
      participantRepo,
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject accept when participant does not exist", async () => {
    const { service, participantRepo } =
      createService();

    participantRepo.findOne.mockResolvedValue(null);

    await expect(
      service.acceptRequest(
        conversationId,
        userId,
      ),
    ).rejects.toMatchObject({
      code: "NOT_CONVERSATION_PARTICIPANT",
    });

    expect(
      participantRepo.updateMessageRequestStatus,
    ).not.toHaveBeenCalled();
  });

  it("should reject accept when request is not pending", async () => {
    const { service, participantRepo } =
      createService();

    participantRepo.findOne.mockResolvedValue({
      leftAt: null,
      messageRequestStatus: "ACCEPTED",
    });

    await expect(
      service.acceptRequest(
        conversationId,
        userId,
      ),
    ).rejects.toMatchObject({
      code: "MESSAGE_REQUEST_NOT_PENDING",
    });
  });

  it("should accept a pending request and dispatch accepted event", async () => {
    const { service, participantRepo } =
      createService();

    participantRepo.findOne.mockResolvedValue({
      leftAt: null,
      messageRequestStatus: "PENDING",
    });

    participantRepo.findActiveByConversation
      .mockResolvedValue([
        { userId: 12 },
        { userId: 14 },
      ]);

    participantRepo.updateMessageRequestStatus
      .mockResolvedValue(undefined);

    const dispatchSpy = vi
      .spyOn(EventDispatcher, "dispatch")
      .mockImplementation(() => {});

    await service.acceptRequest(
      conversationId,
      userId,
    );

    expect(
      participantRepo.updateMessageRequestStatus,
    ).toHaveBeenCalledWith(
      conversationId,
      userId,
      "ACCEPTED",
      expect.anything(),
    );

    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    const [targetUserIds, envelope] =
      dispatchSpy.mock.calls[0];

    expect(targetUserIds).toEqual([12, 14]);

    expect(envelope.event).toBe(
      "message_request.accepted",
    );

    expect(envelope.data).toEqual({
      conversationId,
      acceptedByUserId: userId,
    });
  });

  it("should hide a pending request and dispatch hidden event", async () => {
    const { service, participantRepo } =
      createService();

    participantRepo.findOne.mockResolvedValue({
      leftAt: null,
      messageRequestStatus: "PENDING",
    });

    participantRepo.findActiveByConversation
      .mockResolvedValue([
        { userId: 12 },
        { userId: 14 },
      ]);

    participantRepo.updateMessageRequestStatus
      .mockResolvedValue(undefined);

    const dispatchSpy = vi
      .spyOn(EventDispatcher, "dispatch")
      .mockImplementation(() => {});

    await service.deleteRequest(
      conversationId,
      userId,
    );

    expect(
      participantRepo.updateMessageRequestStatus,
    ).toHaveBeenCalledWith(
      conversationId,
      userId,
      "HIDDEN",
      expect.anything(),
    );

    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    const [targetUserIds, envelope] =
      dispatchSpy.mock.calls[0];

    expect(targetUserIds).toEqual([12, 14]);

    expect(envelope.event).toBe(
      "message_request.hidden",
    );

    expect(envelope.data).toEqual({
      conversationId,
      hiddenByUserId: userId,
    });
  });
});