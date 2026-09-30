import { RequestHandler, Router } from 'express';

import { MessageRequestController } from './messageRequest.controller';

export interface MessageRequestRoutesDependencies {
  controller: MessageRequestController;
  authMiddleware: RequestHandler;
}

export function createMessageRequestRoutes(
  dependencies: MessageRequestRoutesDependencies,
): Router {
  const router = Router();

  router.use(dependencies.authMiddleware);

  router.get(
    '/',
    dependencies.controller.getPendingRequests,
  );

  router.post(
    '/:conversationId/accept',
    dependencies.controller.acceptRequest,
  );

  router.delete(
    '/:conversationId',
    dependencies.controller.deleteRequest,
  );

  return router;
}
