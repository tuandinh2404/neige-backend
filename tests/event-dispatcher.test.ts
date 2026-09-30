import { describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import ConnectionManager from "../src/core/websocket/ConnectionManager";
import EventDispatcher from "../src/core/events/event.dispatcher";
import { EventEnvelope } from "../src/core/events/event.types";
function createSocket(
  readyState: number = WebSocket.OPEN,
  send?: (data: string, callback?: (error?: Error) => void) => void,
): WebSocket {
  return { readyState, send: send ?? vi.fn() } as unknown as WebSocket;
}
const envelope: EventEnvelope<{ message: string }> = {
  event: "message.created",
  eventId: "evt_test",
  occurredAt: new Date().toISOString(),
  data: { message: "hello" },
};
describe("EventDispatcher", () => {
  it("should dispatch an event to all sockets of a user", () => {
    const userId = 999993;
    const socketA = createSocket();
    const socketB = createSocket();
    ConnectionManager.add(userId, socketA);
    ConnectionManager.add(userId, socketB);
    EventDispatcher.dispatch([userId], envelope);
    expect(socketA.send).toHaveBeenCalledTimes(1);
    expect(socketB.send).toHaveBeenCalledTimes(1);
    const expectedPayload = JSON.stringify(envelope);
    expect(socketA.send).toHaveBeenCalledWith(
      expectedPayload,
      expect.any(Function),
    );
    expect(socketB.send).toHaveBeenCalledWith(
      expectedPayload,
      expect.any(Function),
    );
  });
  it("should not dispatch twice when the same userId appears multiple times", () => {
    const userId = 999994;
    const socket = createSocket();
    ConnectionManager.add(userId, socket);
    EventDispatcher.dispatch([userId, userId, userId], envelope);
    expect(socket.send).toHaveBeenCalledTimes(1);
    ConnectionManager.remove(userId, socket);
  });
  it("should continue dispatching when one socket fails", () => {
    const userId = 999995;
    const socketA = createSocket(
      WebSocket.OPEN,
      vi.fn((_data, callback) => {
        callback?.(new Error("send failed"));
      }),
    );
    const socketB = createSocket();
    ConnectionManager.add(userId, socketA);
    ConnectionManager.add(userId, socketB);
    EventDispatcher.dispatch([userId], envelope);
    expect(socketA.send).toHaveBeenCalledTimes(1);
    expect(socketB.send).toHaveBeenCalledTimes(1);
    expect(ConnectionManager.get(userId).has(socketA)).toBe(false);
    expect(ConnectionManager.get(userId).has(socketB)).toBe(true);
    ConnectionManager.remove(userId, socketB);
  });
});
