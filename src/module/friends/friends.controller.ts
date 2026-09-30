import { NextFunction, Request, Response } from "express";

import { FriendshipService } from "./friends.service";

export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  sendRequest = async (
    req: Request<{ userId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const currentUserId = req.currentUser?.id;
      const receiverId = Number(req.params.userId);

      if (currentUserId == null) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
        return;
      }

      if (!Number.isInteger(receiverId) || receiverId <= 0) {
        res.status(400).json({
          error: {
            code: "INVALID_USER_ID",
            message: "Invalid user id.",
          },
        });
        return;
      }

      const friendship = await this.friendshipService.sendRequest(
        currentUserId,
        receiverId,
      );

      res.status(201).json({
        friendship,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelRequest = async (
    req: Request<{ friendshipId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const currentUserId = req.currentUser?.id;
      const friendshipId = Number(req.params.friendshipId);

      if (currentUserId == null) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
        return;
      }

      if (!Number.isInteger(friendshipId) || friendshipId <= 0) {
        res.status(400).json({
          error: {
            code: "INVALID_FRIENDSHIP_ID",
            message: "Invalid friendship id.",
          },
        });
        return;
      }

      await this.friendshipService.cancelRequest(friendshipId, currentUserId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  acceptRequest = async (
    req: Request<{ friendshipId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const currentUserId = req.currentUser?.id;
      const friendshipId = Number(req.params.friendshipId);

      if (currentUserId == null) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
        return;
      }

      if (!Number.isInteger(friendshipId) || friendshipId <= 0) {
        res.status(400).json({
          error: {
            code: "INVALID_FRIENDSHIP_ID",
            message: "Invalid friendship id.",
          },
        });
        return;
      }

      const friendship = await this.friendshipService.acceptRequest(
        friendshipId,
        currentUserId,
      );

      res.status(200).json({
        friendship,
      });
    } catch (error) {
      next(error);
    }
  };

  rejectRequest = async (
    req: Request<{ friendshipId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const currentUserId = req.currentUser?.id;
      const friendshipId = Number(req.params.friendshipId);

      if (currentUserId == null) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
        return;
      }

      if (!Number.isInteger(friendshipId) || friendshipId <= 0) {
        res.status(400).json({
          error: {
            code: "INVALID_FRIENDSHIP_ID",
            message: "Invalid friendship id.",
          },
        });
        return;
      }

      const friendship = await this.friendshipService.rejectRequest(
        friendshipId,
        currentUserId,
      );

      res.status(200).json({
        friendship,
      });
    } catch (error) {
      next(error);
    }
  };

  getFriends = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const currentUserId = req.currentUser?.id;

      let limit = 20;

      if (req.query.limit !== undefined) {
        if (
          typeof req.query.limit !== "string" ||
          !/^\d+$/.test(req.query.limit)
        ) {
          res.status(400).json({
            error: {
              code: "INVALID_FRIENDS_LIMIT",
              message: "limit must be an integer between 1 and 100.",
            },
          });
          return;
        }

        limit = Number(req.query.limit);
      }

      const cursor =
        typeof req.query.cursor === "string"
          ? req.query.cursor
          : undefined;

      if (currentUserId == null) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
        return;
      }

      const result = await this.friendshipService.getFriends(
        currentUserId,
        limit,
        cursor,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getSentRequests = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const currentUserId = req.currentUser?.id;

      if (currentUserId == null) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
        return;
      }

      const requests =
        await this.friendshipService.getSentRequests(currentUserId);

      res.status(200).json({
        requests,
      });
    } catch (error) {
      next(error);
    }
  };

  getReceivedRequests = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const currentUserId = req.currentUser?.id;

      if (currentUserId == null) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
        return;
      }

      const requests =
        await this.friendshipService.getReceivedRequests(currentUserId);

      res.status(200).json({
        requests,
      });
    } catch (error) {
      next(error);
    }
  };

  unfriend = async (
    req: Request<{ userId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const currentUserId = req.currentUser?.id;
      const targetUserId = Number(req.params.userId);

      if (currentUserId == null) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
        return;
      }

      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        res.status(400).json({
          error: {
            code: "INVALID_USER_ID",
            message: "Invalid user id.",
          },
        });
        return;
      }

      await this.friendshipService.unfriend(currentUserId, targetUserId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
