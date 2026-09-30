import {
  NextFunction,
  Request,
  Response,
} from 'express';

import { MessageRequestService } from './messageRequest.service';

export class MessageRequestController {
  constructor(
    private readonly messageRequestService: MessageRequestService,
  ) {}

  getPendingRequests = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.currentUser?.id;
      const limit = req.query.limit
        ? Number(req.query.limit)
        : 20;
      const cursor =
        typeof req.query.cursor === 'string'
          ? req.query.cursor
          : undefined;

      if (userId == null) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        });
        return;
      }

      const result =
        await this.messageRequestService.getPendingRequests(
          userId,
          limit,
          cursor,
        );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  acceptRequest = async (
    req: Request<{ conversationId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.currentUser?.id;

      if (userId == null) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        });
        return;
      }

      await this.messageRequestService.acceptRequest(
        req.params.conversationId,
        userId,
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  deleteRequest = async (
    req: Request<{ conversationId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.currentUser?.id;

      if (userId == null) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        });
        return;
      }

      await this.messageRequestService.deleteRequest(
        req.params.conversationId,
        userId,
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
