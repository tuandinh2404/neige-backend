import { WebSocket } from 'ws';

class ConnectionManager {

    private connections = new Map<number, Set<WebSocket>>();

    add(userId: number, socket: WebSocket): void {
        let userSockets = this.connections.get(userId);

        if (!userSockets) {
            userSockets = new Set<WebSocket>();
            this.connections.set(userId, userSockets);
        }

        userSockets.add(socket);

        console.log(
            `Người dùng ${userId} hiện có ${userSockets.size} kết nối`
        );
    }

    remove(userId: number, socket: WebSocket): void {
        const userSockets = this.connections.get(userId);

        if (!userSockets) {
            return;
        }

        userSockets.delete(socket);

        if (userSockets.size === 0) {
            this.connections.delete(userId);

            console.log(
                `User ${userId} đã đóng tất cả kết nối`
            )
            return;
        }
        console.log(
            `Người dùng ${userId} còn ${userSockets.size} kết nối`
        );
    }

    get(userId: number): Set<WebSocket> {
        return this.connections.get(userId) ?? new Set<WebSocket>();
    }
}

export default new ConnectionManager();