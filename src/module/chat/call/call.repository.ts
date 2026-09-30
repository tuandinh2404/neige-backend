import {
  Transaction,
} from 'sequelize';

import {
  Call,
  CallStatus,
  CallType,
} from './call.model';

export interface CreateCallData {
  conversationId: string;
  initiatedBy: number;
  type: CallType;
}

export interface UpdateCallStateData {
  expectedStatus: CallStatus;
  status: CallStatus;
  startedAt?: Date | null;
  answeredAt?: Date | null;
  endedAt?: Date | null;
  duration?: number | null;
}

export class CallRepository {
  async create(
    data: CreateCallData,
    transaction?: Transaction,
  ): Promise<Call> {
    return Call.create(
      {
        conversationId: data.conversationId,
        initiatedBy: data.initiatedBy,
        type: data.type,
        status: 'initiated',
        startedAt: null,
        answeredAt: null,
        endedAt: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        transaction,
      },
    );
  }

  async findById(
    callId: string,
    transaction?: Transaction,
  ): Promise<Call | null> {
    return Call.findByPk(
      callId,
      {
        transaction,
      },
    );
  }

  async updateState(
  callId: string,
  data: UpdateCallStateData,
  transaction?: Transaction,
): Promise<boolean> {
  const updateData: Partial<Call> = {
    status: data.status,
    updatedAt: new Date(),
  };

  if (data.startedAt !== undefined) {
    updateData.startedAt = data.startedAt;
  }

  if (data.answeredAt !== undefined) {
    updateData.answeredAt = data.answeredAt;
  }

  if (data.endedAt !== undefined) {
    updateData.endedAt = data.endedAt;
  }

  if (data.duration !== undefined) {
    updateData.duration = data.duration;
  }

  const [affectedRows] =
    await Call.update(
      updateData,
      {
        where: {
          id: callId,
          status: data.expectedStatus,
        },
        transaction,
      },
    );

  return affectedRows > 0;
}

  async findConversationCalls(
    conversationId: string,
    limit = 50,
    transaction?: Transaction,
  ): Promise<Call[]> {
    const safeLimit = Math.min(
      Math.max(limit, 1),
      100,
    );

    return Call.findAll({
      where: {
        conversationId,
      },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: safeLimit,
      transaction,
    });
  }
}