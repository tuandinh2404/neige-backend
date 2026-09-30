import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";

import ConnectionManager from "../src/core/websocket/ConnectionManager";

describe("ConnectionManager", () => {
  it("should add and remove a user's socket", () => {
    const userId = 999991;
    const socket = {} as WebSocket;

    ConnectionManager.add(userId, socket);

    expect(ConnectionManager.get(userId).has(socket)).toBe(true);

    ConnectionManager.remove(userId, socket);

    expect(ConnectionManager.get(userId).has(socket)).toBe(false);
  });

  it("should keep other sockets when one socket is removed", () => {
    const userId = 999992;

    const socketA = {} as WebSocket;
    const socketB = {} as WebSocket;

    ConnectionManager.add(userId, socketA);
    ConnectionManager.add(userId, socketB);

    expect(ConnectionManager.get(userId).size).toBe(2);

    ConnectionManager.remove(userId, socketA);

    expect(ConnectionManager.get(userId).size).toBe(1);
    expect(ConnectionManager.get(userId).has(socketA)).toBe(false);
    expect(ConnectionManager.get(userId).has(socketB)).toBe(true);

    ConnectionManager.remove(userId, socketB);

    expect(ConnectionManager.get(userId).size).toBe(0);
  });
});