import {
  NextFunction,
  Request,
  Response,
} from 'express';

import {
  CallService,
} from './call.service';

import {
  CallStatus,
  CallType,
} from './call.model';

const CALL_TYPES: CallType[] = [
  'voice',
  'video',
];

const CALL_STATUSES: CallStatus[] = [
  'initiated',
  'ringing',
  'accepted',
  'rejected',
  'missed',
  'ended',
  'cancelled',
];

export class CallController {
  constructor(
    private readonly callService: CallService,
  ) {}

  createCall = async (
    req: Request<{
      conversationId: string;
    }>,
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

      const { conversationId } = req.params;
      const { type } = req.body ?? {};

      if (!CALL_TYPES.includes(type)) {
        res.status(400).json({
          error: {
            code: 'INVALID_CALL_TYPE',
            message: 'type must be voice or video.',
          },
        });
        return;
      }

      const call =
        await this.callService.createCall({
          conversationId,
          initiatedBy: userId,
          type,
        });

      res.status(201).json({
        call,
      });
    } catch (error) {
      next(error);
    }
  };

  listConversationCalls = async (
    req: Request<{
      conversationId: string;
    }>,
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

      let limit = 50;

      if (req.query.limit !== undefined) {
        if (
          typeof req.query.limit !== 'string' ||
          !/^\d+$/.test(req.query.limit)
        ) {
          res.status(400).json({
            error: {
              code: 'INVALID_CALL_LIMIT',
              message:
                'limit must be an integer between 1 and 100.',
            },
          });
          return;
        }

        limit = Number(req.query.limit);
      }

      if (limit < 1 || limit > 100) {
        res.status(400).json({
          error: {
            code: 'INVALID_CALL_LIMIT',
            message:
              'limit must be an integer between 1 and 100.',
          },
        });
        return;
      }

      const calls =
        await this.callService.listConversationCalls(
          req.params.conversationId,
          userId,
          limit,
        );

      res.status(200).json({
        calls,
      });
    } catch (error) {
      next(error);
    }
  };

  getCall = async (
    req: Request<{
      callId: string;
    }>,
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

      const call =
        await this.callService.getCall(
          req.params.callId,
          userId,
        );

      res.status(200).json({
        call,
      });
    } catch (error) {
      next(error);
    }
  };

  transition = async (
    req: Request<{
      callId: string;
    }>,
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

      const { nextStatus } = req.body ?? {};

      if (!CALL_STATUSES.includes(nextStatus)) {
        res.status(400).json({
          error: {
            code: 'INVALID_CALL_STATUS',
            message: 'Invalid nextStatus.',
          },
        });
        return;
      }

      await this.callService.transition(
        req.params.callId,
        userId,
        nextStatus,
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
