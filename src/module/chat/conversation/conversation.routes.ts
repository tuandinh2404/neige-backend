import { RequestHandler, Router } from "express";
import { ConversationController } from "./conversation.controller";

export interface ConversationRoutesDependencies {
  controller: ConversationController;
}

export function createConversationRoutes(
  dependencies: ConversationRoutesDependencies,
): Router {
  const { controller } = dependencies;

  const router = Router();

  router.get("/", controller.getInbox);

  router.post("/direct/:userId", controller.getOrCreateDirect);

  router.post("/group", controller.createGroup);

  router.patch("/:conversationId/archive", controller.archive);

  router.patch("/:conversationId/unarchive", controller.unarchive);

  router.patch("/:conversationId/mute", controller.mute);

  router.patch("/:conversationId/unmute", controller.unmute);

  return router;
}
