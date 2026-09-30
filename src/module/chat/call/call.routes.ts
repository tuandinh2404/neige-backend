import {
  RequestHandler,
  Router,
} from 'express';

import {
  CallController,
} from './call.controller';

export interface CallRoutesDependencies {
  controller: CallController;
}

export function createCallRoutes(
  dependencies: CallRoutesDependencies,
): Router {
  const router = Router();

  router.post(
    '/:conversationId/calls',
    dependencies.controller.createCall,
  );

  router.get(
    '/:conversationId/calls',
    dependencies.controller.listConversationCalls,
  );

  router.get(
    '/calls/:callId',
    dependencies.controller.getCall,
  );

  router.patch(
    '/calls/:callId/status',
    dependencies.controller.transition,
  );

  return router;
}
