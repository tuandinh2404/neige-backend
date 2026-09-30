export interface EventEnvelope<T> {
  event: string;
  eventId: string;
  occurredAt: string;
  data: T;
}
