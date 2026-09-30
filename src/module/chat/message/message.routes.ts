import {
    Router,
} from 'express';

import {
    MessageController,
} from './message.controller';

export interface MessageRoutesDependencies {
    controller: MessageController;
}

export function createMessageRoutes(
    dependencies: MessageRoutesDependencies,
): Router {
    const {
        controller,
    } = dependencies;

    const router = Router();


    router.post(
        '/:conversationId/messages',
        controller.sendMessage,
    );

    router.get(
        '/:conversationId/messages',
        controller.getTimeline,
    );

    router.delete(
        '/:conversationId/messages/:messageId',
        controller.deleteMessage,
    );

    return router;
}