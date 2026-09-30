import {
    NextFunction,
    Request,
    Response,
} from 'express';

import { ReactionService } from './reaction.service';

export class ReactionController {
    constructor(
        private readonly reactionService: ReactionService,
    ) {}

    addOrUpdateReaction = async (
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

            const { reaction } = req.body;

            const result =
                await this.reactionService.addOrUpdateReaction({
                    conversationId,
                    messageId,
                    userId,
                    reaction,
                });

            return res.status(200).json({
                reaction: result,
            });
        } catch (error) {
            return next(error);
        }
    };

    removeReaction = async (
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

            await this.reactionService.removeReaction(
                conversationId,
                messageId,
                userId,
            );

            return res.status(204).send();
        } catch (error) {
            return next(error);
        }
    };

    listReactions = async (
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

            const reactions =
                await this.reactionService.listReactions(
                    conversationId,
                    messageId,
                    userId,
                );

            return res.status(200).json({
                reactions,
            });
        } catch (error) {
            return next(error);
        }
    };
}