import {
    RequestHandler,
    Router,
} from 'express';

import { ReactionController } from './reaction.controller';

export interface ReactionRoutesDependencies {
    controller: ReactionController;
}

export function createReactionRoutes(
    dependencies: ReactionRoutesDependencies,
): Router {
    const {
        controller,
    } = dependencies;

    const router = Router();


    router.put(
        '/:conversationId/messages/:messageId/reaction',
        controller.addOrUpdateReaction,
    );

    router.delete(
        '/:conversationId/messages/:messageId/reaction',
        controller.removeReaction,
    );

    router.get(
        '/:conversationId/messages/:messageId/reactions',
        controller.listReactions,
    );

    return router;
}