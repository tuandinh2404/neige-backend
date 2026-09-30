import { NextFunction, Request, Response } from "express";

import { ParticipantService } from "./participant.service";

export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  join = async (
    req: Request<{
      conversationId: string;
    }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.currentUser?.id;
      if (userId == null) {
        res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
        return;
      }
      await this.participantService.join(req.params.conversationId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  addMember = async (
    req: Request<{
      conversationId: string;
    }, unknown, { targetUserId?: unknown }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const ownerId = req.currentUser?.id;

      if (ownerId == null) {
        return res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
      }

      const targetUserId = req.body?.targetUserId;

      await this.participantService.addMember(
        req.params.conversationId,
        ownerId,
        Number(targetUserId),
      );

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  markRead = async (
    req: Request<{
      conversationId: string;
      messageId: string;
    }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.currentUser?.id;

      if (userId == null) {
        return res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
      }

      const { conversationId, messageId } = req.params;

      const updated = await this.participantService.markRead(
        conversationId,
        userId,
        messageId,
      );

      return res.status(200).json({
        updated,
      });
    } catch (error) {
      return next(error);
    }
  };

  markDelivered = async (
    req: Request<{
      conversationId: string;
      messageId: string;
    }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.currentUser?.id;

      if (userId == null) {
        return res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
      }

      const { conversationId, messageId } = req.params;

      const updated = await this.participantService.markDelivered(
        conversationId,
        userId,
        messageId,
      );

      return res.status(200).json({
        updated,
      });
    } catch (error) {
      return next(error);
    }
  };
  leave = async (
    req: Request<{
      conversationId: string;
    }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.currentUser?.id;

      if (userId == null) {
        return res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        });
      }

      const { conversationId } = req.params;

      await this.participantService.leave(conversationId, userId);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
