import {
  Call,
  CallStatus,
  CallType,
} from './call.model';

import {
  CallRepository,
  UpdateCallStateData,
} from './call.repository';

import { ParticipantRepository } from '../participant/participant.repository';

import {
  CallNotFoundError,
  CallStateConflictError,
  InvalidCallTransitionError,
  InvalidCallTypeError,
  NotConversationParticipantError,
} from '../shared/chat.errors';

export interface CreateCallInput {
  conversationId: string;
  initiatedBy: number;
  type: CallType;
}

export class CallService {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly participantRepo: ParticipantRepository,
  ) {}

  async createCall(
    input: CreateCallInput,
  ): Promise<Call> {
    const participant =
      await this.participantRepo.findActive(
        input.conversationId,
        input.initiatedBy,
      );

    if (!participant) {
      throw new NotConversationParticipantError(
        input.initiatedBy,
        input.conversationId,
      );
    }

    if (
      input.type !== 'voice' &&
      input.type !== 'video'
    ) {
      throw new InvalidCallTypeError(
        input.type,
      );
    }

    return this.callRepo.create({
      conversationId: input.conversationId,
      initiatedBy: input.initiatedBy,
      type: input.type,
    });
  }

  async transition(
    callId: string,
    userId: number,
    nextStatus: CallStatus,
  ): Promise<void> {
    const call =
      await this.callRepo.findById(
        callId,
      );

    if (!call) {
      throw new CallNotFoundError(
        callId,
      );
    }

    const participant =
      await this.participantRepo.findActive(
        call.conversationId,
        userId,
      );

    if (!participant) {
      throw new NotConversationParticipantError(
        userId,
        call.conversationId,
      );
    }

    this.assertTransitionAllowed(
      call,
      userId,
      nextStatus,
    );

    const update =
      this.buildTransitionUpdate(
        call,
        nextStatus,
      );

    const data: UpdateCallStateData = {
      expectedStatus: call.status,
      ...update,
    };

    const updated =
      await this.callRepo.updateState(
        callId,
        data,
      );

    if (!updated) {
      throw new CallStateConflictError(
        callId,
      );
    }
  }

  async getCall(
    callId: string,
    userId: number,
  ): Promise<Call> {
    const call =
      await this.callRepo.findById(
        callId,
      );

    if (!call) {
      throw new CallNotFoundError(
        callId,
      );
    }

    const participant =
      await this.participantRepo.findActive(
        call.conversationId,
        userId,
      );

    if (!participant) {
      throw new NotConversationParticipantError(
        userId,
        call.conversationId,
      );
    }

    return call;
  }

  async listConversationCalls(
    conversationId: string,
    userId: number,
    limit = 50,
  ): Promise<Call[]> {
    const participant =
      await this.participantRepo.findActive(
        conversationId,
        userId,
      );

    if (!participant) {
      throw new NotConversationParticipantError(
        userId,
        conversationId,
      );
    }

    return this.callRepo.findConversationCalls(
      conversationId,
      limit,
    );
  }

  private assertTransitionAllowed(
    call: Call,
    userId: number,
    nextStatus: CallStatus,
  ): void {
    const currentStatus =
      call.status;

    if (
      currentStatus === nextStatus
    ) {
      return;
    }

    switch (currentStatus) {
      case 'initiated':
        this.assertFromInitiated(
          call,
          userId,
          nextStatus,
        );
        return;

      case 'ringing':
        this.assertFromRinging(
          call,
          userId,
          nextStatus,
        );
        return;

      case 'accepted':
        this.assertFromAccepted(
          call,
          nextStatus,
        );
        return;

      case 'rejected':
      case 'missed':
      case 'ended':
      case 'cancelled':
        throw new InvalidCallTransitionError(
          currentStatus,
          nextStatus,
        );

      default:
        throw new InvalidCallTransitionError(
          currentStatus,
          nextStatus,
        );
    }
  }

  private assertFromInitiated(
    call: Call,
    userId: number,
    nextStatus: CallStatus,
  ): void {
    switch (nextStatus) {
      case 'ringing':
        return;

      case 'cancelled':
        if (
          userId !== call.initiatedBy
        ) {
          throw new InvalidCallTransitionError(
            'initiated',
            'cancelled',
          );
        }
        return;

      default:
        throw new InvalidCallTransitionError(
          'initiated',
          nextStatus,
        );
    }
  }

  private assertFromRinging(
    call: Call,
    userId: number,
    nextStatus: CallStatus,
  ): void {
    switch (nextStatus) {
      case 'accepted':
        if (
          userId === call.initiatedBy
        ) {
          throw new InvalidCallTransitionError(
            'ringing',
            'accepted',
          );
        }
        return;

      case 'rejected':
        if (
          userId === call.initiatedBy
        ) {
          throw new InvalidCallTransitionError(
            'ringing',
            'rejected',
          );
        }
        return;

      case 'cancelled':
        if (
          userId !== call.initiatedBy
        ) {
          throw new InvalidCallTransitionError(
            'ringing',
            'cancelled',
          );
        }
        return;

      case 'missed':
        throw new InvalidCallTransitionError(
          'ringing',
          'missed',
        );

      default:
        throw new InvalidCallTransitionError(
          'ringing',
          nextStatus,
        );
    }
  }

  private assertFromAccepted(
    call: Call,
    nextStatus: CallStatus,
  ): void {
    switch (nextStatus) {
      case 'ended':
        return;

      default:
        throw new InvalidCallTransitionError(
          'accepted',
          nextStatus,
        );
    }
  }

  private buildTransitionUpdate(
    call: Call,
    nextStatus: CallStatus,
  ): {
    status: CallStatus;
    startedAt?: Date | null;
    answeredAt?: Date | null;
    endedAt?: Date | null;
    duration?: number | null;
  } {
    const now = new Date();

    switch (nextStatus) {
      case 'ringing':
        return {
          status: 'ringing',
          startedAt:
            call.startedAt ?? now,
        };

      case 'accepted':
        return {
          status: 'accepted',
          startedAt:
            call.startedAt ?? now,
          answeredAt:
            call.answeredAt ?? now,
        };

      case 'rejected':
        return {
          status: 'rejected',
          endedAt: now,
          duration: 0,
        };

      case 'missed':
        return {
          status: 'missed',
          endedAt: now,
          duration: 0,
        };

      case 'cancelled':
        return {
          status: 'cancelled',
          endedAt: now,
          duration: 0,
        };

      case 'ended': {
        const endedAt = now;

        const duration =
          call.answeredAt
            ? Math.max(
                0,
                Math.floor(
                  (
                    endedAt.getTime() -
                    call.answeredAt.getTime()
                  ) / 1000,
                ),
              )
            : 0;

        return {
          status: 'ended',
          endedAt,
          duration,
        };
      }

      case 'initiated':
        throw new InvalidCallTransitionError(
          call.status,
          'initiated',
        );

      default:
        throw new InvalidCallTransitionError(
          call.status,
          nextStatus,
        );
    }
  }
} 