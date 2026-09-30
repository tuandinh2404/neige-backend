import { WebSocket } from 'ws';

import ConnectionManager from '@/core/websocket/ConnectionManager';
import { EventEnvelope } from './event.types';

class EventDispatcher {
  dispatch<T>(
    targetUserIds: number[],
    envelope: EventEnvelope<T>,
  ): void {
    const uniqueUserIds = new Set(targetUserIds);

    for (const userId of uniqueUserIds) {
      const sockets = ConnectionManager.get(userId);

      for (const socket of sockets) {
        try {
          if (socket.readyState !== WebSocket.OPEN) {
            ConnectionManager.remove(userId, socket);
            continue;
          }

          socket.send(JSON.stringify(envelope), (error) => {
            if (error) {
              console.error(
                `WebSocket delivery failed for user ${userId}:`,
                error,
              );
              ConnectionManager.remove(userId, socket);
            }
          });
        } catch (error) {
          console.error(
            `WebSocket delivery failed for user ${userId}:`,
            error,
          );
          ConnectionManager.remove(userId, socket);
        }
      }
    }
  }
}

export default new EventDispatcher();
