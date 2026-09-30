import {
  NextFunction,
  Request,
  Response,
} from 'express';

import {
  MediaService,
} from './media.service';

export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
  ) {}

  createPending = async (
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

      const { objectKey } = req.body ?? {};

      if (
        typeof objectKey !== 'string' ||
        !objectKey.trim()
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_MEDIA_OBJECT_KEY',
            message: 'objectKey is required.',
          },
        });
        return;
      }

      const media =
        await this.mediaService.createPending({
          objectKey,
          uploadedBy: userId,
        });

      res.status(201).json({
        media,
      });
    } catch (error) {
      next(error);
    }
  };

  markReady = async (
    req: Request<{
      mediaObjectId: string;
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

      await this.mediaService.markReady(
        req.params.mediaObjectId,
        userId,
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  attachToMessage = async (
    req: Request<{
      conversationId: string;
      messageId: string;
      mediaObjectId: string;
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

      await this.mediaService.attachToMessage(
        req.params.mediaObjectId,
        req.params.messageId,
        req.params.conversationId,
        userId,
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
