import {
    NextFunction,
    Request,
    Response
} from 'express';

import UserService from './user.service';
import {
    searchUsersSchema
} from './user.validation';

class UserController {

    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    getProfile = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        try {
            const userId =
                req.currentUser?.id;

            if (userId == null) {
                return res.status(401).json({
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Unauthorized'
                    }
                });
            }

            const user =
                await this.userService.getProfile(
                    userId
                );

            return res.status(200).json({
                user
            });

        } catch (error) {
            return next(error);
        }
    };

    searchUsers = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        try {
            const parsed =
                searchUsersSchema.safeParse(
                    req.query
                );

            if (!parsed.success) {
                return res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message:
                            parsed.error.issues[0]?.message ||
                            'Invalid request data'
                    }
                });
            }

            const {
                uid
            } = parsed.data;

            const user =
                await this.userService.searchUsers(
                    uid
                );

            return res.status(200).json({
                user
            });

        } catch (error) {
            return next(error);
        }
    };
}

export default UserController;