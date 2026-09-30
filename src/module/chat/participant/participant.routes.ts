import {
  RequestHandler,
  Router,
} from 'express';

import { ParticipantController } from './participant.controller';

export interface ParticipantRoutesDependencies {
  controller: ParticipantController;
}

export function createParticipantRoutes(
  dependencies: ParticipantRoutesDependencies,
): Router {
  const {
    controller,
  } = dependencies;

  const router = Router();


  router.post(
    '/:conversationId/join',
    controller.join,
  );
  
  router.post(
    '/:conversationId/participants',
    controller.addMember,
  );

  router.patch(
    '/:conversationId/messages/:messageId/read',
    controller.markRead,
  );

  router.patch(
    '/:conversationId/messages/:messageId/delivered',
    controller.markDelivered,
  );
  router.patch(
  '/:conversationId/leave',
  controller.leave,
);

  return router;
}