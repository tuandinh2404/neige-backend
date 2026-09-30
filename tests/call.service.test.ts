import { afterEach, describe, expect, it, vi } from "vitest";

import { CallService } from "../src/module/chat/call/call.service";
import { CallRepository } from "../src/module/chat/call/call.repository";
import { ParticipantRepository } from "../src/module/chat/participant/participant.repository";


describe("CallService", () => {
  const callId = "7ba7b810-9dad-41d1-80b4-00c04fd430c8";
  const conversationId = "550e8400-e29b-41d4-a716-446655440000";
  const initiatorId = 12;
  const recipientId = 13;

  function createService() {
    const callRepo = {
      findById: vi.fn(),
      updateState: vi.fn(),
      create: vi.fn(),
      findConversationCalls: vi.fn(),
    };

    const participantRepo = {
      findActive: vi.fn(),
    };

    const service = new CallService(
      callRepo as unknown as CallRepository,
      participantRepo as unknown as ParticipantRepository,
    );

    return {
      service,
      callRepo,
      participantRepo,
    };
  }

  function makeCall(status: string) {
    return {
      id: callId,
      conversationId,
      initiatedBy: initiatorId,
      type: "voice",
      status,
      startedAt: null,
      answeredAt: null,
      endedAt: null,
      duration: null,
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject when call does not exist", async () => {
    const { service, callRepo } = createService();

    callRepo.findById.mockResolvedValue(null);

    await expect(
      service.transition(callId, initiatorId, "ringing"),
    ).rejects.toMatchObject({
      code: "CALL_NOT_FOUND",
    });
  });

  it("should reject when transition user is not an active participant", async () => {
    const { service, callRepo, participantRepo } = createService();

    callRepo.findById.mockResolvedValue(makeCall("initiated"));
    participantRepo.findActive.mockResolvedValue(null);

    await expect(
      service.transition(callId, 99, "ringing"),
    ).rejects.toMatchObject({
      code: "NOT_CONVERSATION_PARTICIPANT",
    });

    expect(callRepo.updateState).not.toHaveBeenCalled();
  });

  it("should allow initiated -> ringing", async () => {
    const { service, callRepo, participantRepo } = createService();

    callRepo.findById.mockResolvedValue(makeCall("initiated"));
    participantRepo.findActive.mockResolvedValue({ userId: initiatorId });
    callRepo.updateState.mockResolvedValue(true);

    await service.transition(callId, initiatorId, "ringing");

    expect(callRepo.updateState).toHaveBeenCalledWith(
      callId,
      expect.objectContaining({
        expectedStatus: "initiated",
        status: "ringing",
      }),
    );
  });

  it("should reject initiated -> accepted", async () => {
    const { service, callRepo, participantRepo } = createService();

    callRepo.findById.mockResolvedValue(makeCall("initiated"));
    participantRepo.findActive.mockResolvedValue({ userId: recipientId });

    await expect(
      service.transition(callId, recipientId, "accepted"),
    ).rejects.toMatchObject({
      code: "INVALID_CALL_TRANSITION",
    });

    expect(callRepo.updateState).not.toHaveBeenCalled();
  });

  it("should reject initiator from accepting a ringing call", async () => {
    const { service, callRepo, participantRepo } = createService();

    callRepo.findById.mockResolvedValue(makeCall("ringing"));
    participantRepo.findActive.mockResolvedValue({ userId: initiatorId });

    await expect(
      service.transition(callId, initiatorId, "accepted"),
    ).rejects.toMatchObject({
      code: "INVALID_CALL_TRANSITION",
    });

    expect(callRepo.updateState).not.toHaveBeenCalled();
  });

  it("should allow recipient from ringing -> accepted", async () => {
    const { service, callRepo, participantRepo } = createService();

    const call = makeCall("ringing");
    call.startedAt = new Date("2026-09-24T09:00:00.000Z");

    callRepo.findById.mockResolvedValue(call);
    participantRepo.findActive.mockResolvedValue({ userId: recipientId });
    callRepo.updateState.mockResolvedValue(true);

    await service.transition(callId, recipientId, "accepted");

    expect(callRepo.updateState).toHaveBeenCalledWith(
      callId,
      expect.objectContaining({
        expectedStatus: "ringing",
        status: "accepted",
        startedAt: call.startedAt,
        answeredAt: expect.any(Date),
      }),
    );
  });

  it("should allow accepted -> ended and calculate duration", async () => {
    const { service, callRepo, participantRepo } = createService();

    const call = makeCall("accepted");
    call.answeredAt = new Date(Date.now() - 5000);

    callRepo.findById.mockResolvedValue(call);
    participantRepo.findActive.mockResolvedValue({ userId: recipientId });
    callRepo.updateState.mockResolvedValue(true);

    await service.transition(callId, recipientId, "ended");

    expect(callRepo.updateState).toHaveBeenCalledWith(
      callId,
      expect.objectContaining({
        expectedStatus: "accepted",
        status: "ended",
        endedAt: expect.any(Date),
        duration: expect.any(Number),
      }),
    );
  });

  it("should reject transition when optimistic concurrency update loses the race", async () => {
    const { service, callRepo, participantRepo } = createService();

    callRepo.findById.mockResolvedValue(makeCall("initiated"));
    participantRepo.findActive.mockResolvedValue({ userId: initiatorId });
    callRepo.updateState.mockResolvedValue(false);

    await expect(
      service.transition(callId, initiatorId, "ringing"),
    ).rejects.toMatchObject({
      code: "CALL_STATE_CONFLICT",
    });
  });

  it("should reject transitions from a terminal call state", async () => {
    const { service, callRepo, participantRepo } = createService();

    callRepo.findById.mockResolvedValue(makeCall("ended"));
    participantRepo.findActive.mockResolvedValue({ userId: initiatorId });

    await expect(
      service.transition(callId, initiatorId, "ringing"),
    ).rejects.toMatchObject({
      code: "INVALID_CALL_TRANSITION",
    });

    expect(callRepo.updateState).not.toHaveBeenCalled();
  });
});
