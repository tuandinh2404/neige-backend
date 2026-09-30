import { randomUUID } from 'crypto';

import { EventEnvelope } from './event.types';

export function createEventEnvelope<T>(
  event: string,
  data: T,
): EventEnvelope<T> {
  return {
    event,
    eventId: `evt_${randomUUID()}`,
    occurredAt: new Date().toISOString(),
    data,
  };
}
