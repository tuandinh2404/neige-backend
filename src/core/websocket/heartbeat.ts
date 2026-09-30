import { WebSocket } from 'ws';

import { UserRepository } from '@/module/user/user.repository';

const HEARTBEAT_INTERVAL = 30_000;

export const startHeartbeat = (
    clients: Set<WebSocket>,
    alive: WeakMap<WebSocket, boolean>,
    authenticatedUsers: WeakMap<WebSocket, number>,
    userRepository: UserRepository,
) => {
    return setInterval(async () => {
        const socketsByUser = new Map<number, WebSocket[]>();

        clients.forEach((socket) => {
            if (socket.readyState !== WebSocket.OPEN) {
                return;
            }

            const isAlive = alive.get(socket);

            if (!isAlive) {
                console.log(
                    'WebSocket client is not alive, terminating connection',
                );
                socket.terminate();
                clients.delete(socket);
                return;
            }

            alive.set(socket, false);
            socket.ping();

            const userId = authenticatedUsers.get(socket);
            if (userId == null) {
                return;
            }

            const sockets = socketsByUser.get(userId) ?? [];
            sockets.push(socket);
            socketsByUser.set(userId, sockets);
        });

        for (const [userId, sockets] of socketsByUser) {
            try {
                const user = await userRepository.getById(userId);

                if (user?.getDataValue('is_active') === true) {
                    continue;
                }

                console.log(
                    `WebSocket heartbeat phát hiện người dùng ${userId} không còn active`,
                );

                for (const socket of sockets) {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.close(1008, 'inactive_user');
                    }
                }
            } catch (error) {
                // A temporary DB/read failure must not log out a healthy user.
                console.error(
                    `Không thể revalidate WebSocket user ${userId}:`,
                    error,
                );
            }
        }
    }, HEARTBEAT_INTERVAL);
};
