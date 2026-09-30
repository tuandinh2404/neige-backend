import {
  NextFunction,
  Request,
  Response,
} from 'express';

import { ConversationService } from './conversation.service';

export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
  ) {}

  getOrCreateDirect = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.currentUser?.id;
      const targetUserId = Number(
        req.params.userId,
      );

      if (userId == null) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
          },
        });
        return;
      }

      if (
        !Number.isInteger(targetUserId) ||
        targetUserId <= 0
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_USER_ID',
            message: 'Invalid target user id.',
          },
        });
        return;
      }

      const conversation =
        await this.conversationService.getOrCreateDirect(
          userId,
          targetUserId,
        );

      res.status(200).json({
        conversation,
      });
    } catch (error) {
      next(error);
    }
  };

  createGroup = async (
    req: Request,
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

      const conversation =
        await this.conversationService.createGroup(
          userId,
        );

      res.status(201).json({
        conversation,
      });
    } catch (error) {
      next(error);
    }
  };

  archive = async (
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

      await this.conversationService.archive(
        req.params.conversationId,
        userId,
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  unarchive = async (
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

      await this.conversationService.unarchive(
        req.params.conversationId,
        userId,
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  mute = async (
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

      const mutedUntilValue =
        req.body?.mutedUntil;

      if (
        typeof mutedUntilValue !== 'string' &&
        !(mutedUntilValue instanceof Date)
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_MUTED_UNTIL',
            message: 'Invalid mutedUntil.',
          },
        });
        return;
      }

      const mutedUntil =
        new Date(mutedUntilValue);

      if (
        Number.isNaN(
          mutedUntil.getTime(),
        )
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_MUTED_UNTIL',
            message: 'Invalid mutedUntil.',
          },
        });
        return;
      }

      await this.conversationService.mute(
        req.params.conversationId,
        userId,
        mutedUntil,
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  unmute = async (
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

      await this.conversationService.unmute(
        req.params.conversationId,
        userId,
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  getInbox = async (
    req: Request,
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

      const rawLimit = req.query.limit;
      const rawCursor = req.query.cursor;

      let limit: number | undefined;
      let cursor: string | undefined;

      if (rawLimit !== undefined) {
        if (typeof rawLimit !== 'string') {
          res.status(400).json({
            error: {
              code: 'INVALID_INBOX_LIMIT',
              message:
                'Invalid inbox limit. Must be between 1 and 100.',
            },
          });
          return;
        }

        const parsedLimit = Number(rawLimit);

        if (
          !Number.isInteger(parsedLimit) ||
          parsedLimit < 1 ||
          parsedLimit > 100
        ) {
          res.status(400).json({
            error: {
              code: 'INVALID_INBOX_LIMIT',
              message:
                'Invalid inbox limit. Must be between 1 and 100.',
            },
          });
          return;
        }

        limit = parsedLimit;
      }

      if (rawCursor !== undefined) {
        if (typeof rawCursor !== 'string') {
          res.status(400).json({
            error: {
              code: 'INVALID_INBOX_CURSOR',
              message: 'Invalid inbox cursor.',
            },
          });
          return;
        }

        cursor = rawCursor;
      }

      const result =
        await this.conversationService.getInbox(
          userId,
          limit,
          cursor,
        );

      res.status(200).json({
        conversations: result.conversations,
        nextCursor: result.nextCursor,
      });
    } catch (error) {
      next(error);
    }
  };
}
