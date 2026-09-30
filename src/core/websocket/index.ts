import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';

import config from '@/config';
import { IJwtUser } from '@/module/auth/auth.types';
import { UserRepository } from '@/module/user/user.repository';
import { startHeartbeat } from './heartbeat';
import ConnectionManager from './ConnectionManager';

export const createWebSocketServer = (server: HttpServer) => {
    const wss = new WebSocketServer({
        server,
        // Current WS protocol carries authentication/control/event payloads,
        // not media uploads. Keep an explicit upper bound for malformed or
        // unexpectedly large frames.
        maxPayload: 64 * 1024,
    });

    const clients = new Set<WebSocket>();
    const alive = new WeakMap<WebSocket, boolean>();
    const authenticatedUsers = new WeakMap<WebSocket, number>();
    const userRepository = new UserRepository();

    const AUTH_TIMEOUT_MS = 10_000;

    wss.on('connection', (socket) => {
        clients.add(socket);
        alive.set(socket, true);

        let authenticated = false;
        let currentUser: IJwtUser | null = null;
        let authTimeout: ReturnType<typeof setTimeout> | null =
            setTimeout(() => {
                if (!authenticated && socket.readyState === WebSocket.OPEN) {
                    socket.close(1008, 'authentication_timeout');
                }
            }, AUTH_TIMEOUT_MS);

        const clearAuthTimeout = () => {
            if (authTimeout) {
                clearTimeout(authTimeout);
                authTimeout = null;
            }
        };

        console.log('WebSocket đã kết nối');

        socket.on('pong', () => {
            alive.set(socket, true);

            console.log('WebSocket đã nhận pong từ client');
        });

        socket.on('message', async (data) => {
            let message: unknown;

            // 1. Parse JSON
            try {
                message = JSON.parse(data.toString());
            } catch (error) {
                console.error(
                    'WebSocket: message không phải JSON hợp lệ:',
                    error
                );

                socket.close(1008, 'invalid_json');
                return;
            }

            // 2. Validate message shape
            if (
                typeof message !== 'object' ||
                message === null ||
                Array.isArray(message)
            ) {
                console.log(
                    '❌ Message có shape không hợp lệ:',
                    message
                );

                socket.close(1008, 'invalid_message');
                return;
            }

            // TypeScript cần dòng này để biết message có field
            // type và token
            const msg = message as Record<string, unknown>;

            // 3. Authentication
            if (msg.type === 'auth') {
                if (authenticated) {
                    socket.close(1008, 'đã xác thực');
                    return;
                }

                const token = msg.token;

                if (typeof token !== 'string' || !token) {
                    console.log(
                        '❌ Auth thất bại: thiếu token'
                    );

                    socket.close(1008, 'missing_token');
                    return;
                }

                try {
                    currentUser = jwt.verify(
                        token,
                        config.jwtSecret as string
                    ) as IJwtUser;
                } catch (error) {
                    console.error(
                        '❌ Auth thất bại: JWT không hợp lệ:',
                        (error as Error).message
                    );

                    socket.close(1008, 'invalid_token');
                    return;
                }

                const user = await userRepository.getById(
                    currentUser.id,
                );

                if (!user || user.getDataValue('is_active') !== true) {
                    console.log(
                        `❌ WebSocket auth bị từ chối: người dùng ${currentUser.id} không hoạt động`
                    );

                    currentUser = null;
                    socket.close(1008, 'inactive_user');
                    return;
                }

                authenticated = true;
                clearAuthTimeout();

                // Thêm kết nối WebSocket vào ConnectionManager
                authenticatedUsers.set(socket, currentUser.id);

                ConnectionManager.add(
                    currentUser.id,
                    socket
                );

                socket.send(
                    JSON.stringify({
                        type: 'auth.success',
                        userId: currentUser.id,
                    })
                );

                console.log(
                    `WebSocket đã xác thực: người dùng ${currentUser.id}`
                );

                return;
            }

            // 4. Chưa authenticate nhưng gửi message khác
            if (!authenticated) {
                socket.close(1008, 'đã yêu cầu xác thực');
                return;
            }

            // 5. Message sau authentication
            console.log(
                'Authenticated message:',
                message
            );
        });

        socket.on('close', () => {
            console.log('🔥 CLOSE EVENT');

            clearAuthTimeout();
            clients.delete(socket);

            if (currentUser) {
                ConnectionManager.remove(
                    currentUser.id,
                    socket
                );
            }

            authenticatedUsers.delete(socket);

            console.log(
                'WebSocket đã đóng kết nối'
            );
        });

        socket.on('error', (error) => {
            console.error(
                'WebSocket lỗi:',
                error
            );
        });
    });

    wss.on('error', (error) => {
        console.error(
            'WebSocketServer lỗi:',
            error,
        );
    });

    startHeartbeat(
        clients,
        alive,
        authenticatedUsers,
        userRepository,
    );

    return wss;
};