import { RequestHandler, Router } from "express";

import { FriendshipController } from "./friends.controller";

export interface FriendshipRoutesDependencies {
  controller: FriendshipController;
  authMiddleware: RequestHandler;
}

export function createFriendshipRoutes(
  dependencies: FriendshipRoutesDependencies,
): Router {
  const router = Router();

  router.use(dependencies.authMiddleware);

  router.post("/requests/:userId", dependencies.controller.sendRequest);

  router.delete(
    "/requests/:friendshipId",
    dependencies.controller.cancelRequest,
  );

  router.post(
    "/requests/:friendshipId/accept",
    dependencies.controller.acceptRequest,
  );

  router.post(
    "/requests/:friendshipId/reject",
    dependencies.controller.rejectRequest,
  );

  router.get("/", dependencies.controller.getFriends);

  router.get("/requests/sent", dependencies.controller.getSentRequests);

  router.get("/requests/received", dependencies.controller.getReceivedRequests);

  router.delete("/:userId", dependencies.controller.unfriend);

  return router;
}
