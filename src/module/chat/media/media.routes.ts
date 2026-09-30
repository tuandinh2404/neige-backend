import {
  RequestHandler,
  Router,
} from 'express';

import {
  MediaController,
} from './media.controller';

export interface MediaRoutesDependencies {
  controller: MediaController;
}

export function createMediaRoutes(
  dependencies: MediaRoutesDependencies,
): Router {
  const router = Router();

  router.post(
    '/media',
    dependencies.controller.createPending,
  );

  router.post(
    '/media/:mediaObjectId/ready',
    dependencies.controller.markReady,
  );

  router.post(
    '/:conversationId/messages/:messageId/media/:mediaObjectId/attach',
    dependencies.controller.attachToMessage,
  );

  return router;
}
