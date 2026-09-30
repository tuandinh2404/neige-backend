import {
    NextFunction,
    Request,
    Response,
} from 'express';

import {
    MessageService,
} from './message.service';

export class MessageController {
    constructor(
        private readonly messageService: MessageService,
    ) {}

    sendMessage = async (
        req: Request<{ conversationId: string }>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const userId = req.currentUser?.id;

            if (userId == null) {
                return res.status(401).json({
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Unauthorized',
                    },
                });
            }

            const {
                conversationId,
            } = req.params;

            const {
                clientMessageId,
                type,
                content,
                replyToMessageId = null,
            } = req.body;

            const result =
                await this.messageService.sendMessage({
                    conversationId,
                    senderId: userId,
                    clientMessageId,
                    type,
                    content,
                    replyToMessageId,
                });

            return res.status(201).json({
                message: result.message,
            });
        } catch (error) {
            return next(error);
        }
    };

    getTimeline = async (
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
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      });
    }

    const { conversationId } = req.params;

    let limit = 20;

    if (req.query.limit !== undefined) {
      if (
        typeof req.query.limit !== 'string' ||
        !/^\d+$/.test(req.query.limit)
      ) {
        return res.status(400).json({
          error: {
            code: 'INVALID_MESSAGE_LIMIT',
            message:
              'limit must be an integer between 1 and 100.',
          },
        });
      }

      limit = Number(req.query.limit);
    }

    const cursor =
      typeof req.query.cursor === 'string'
        ? req.query.cursor
        : undefined;

    const result =
      await this.messageService.getTimeline(
        conversationId,
        userId,
        limit,
        cursor,
      );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

    deleteMessage = async (
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
                        code: 'UNAUTHORIZED',
                        message: 'Unauthorized',
                    },
                });
            }

            const {
                conversationId,
                messageId,
            } = req.params;

            await this.messageService.deleteMessage(
                conversationId,
                messageId,
                userId,
            );

            return res.status(204).send();
        } catch (error) {
            return next(error);
        }
    };
    
}