import {
    NextFunction,
    Request,
    Response
} from 'express';

import {
    signupSchema,
    loginSchema,
    refreshTokenSchema,
    logoutSchema
} from './auth.validation';

import AuthService from './auth.service';

export class AuthController {

    private authService = new AuthService();

    signup = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        try {
            const parsed =
                signupSchema.safeParse(req.body);

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
                username,
                password,
                full_name,
                uid
            } = parsed.data;

            const result =
                await this.authService.SignUp({
                    username,
                    password,
                    full_name,
                    uid,
                });

            return res.status(201).json(result);

        } catch (error) {
            return next(error);
        }
    };

    login = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        try {
            const parsed =
                loginSchema.safeParse(req.body);

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
                username,
                password
            } = parsed.data;

            const deviceInfo =
                req.headers['user-agent'] || 'unknown';

            const result =
                await this.authService.SignIn(
                    username,
                    password,
                    deviceInfo
                );

            return res.status(200).json({
                message: 'Đăng nhập thành công',
                ...result
            });

        } catch (error) {
            return next(error);
        }
    };

    logout = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        try {
            const parsed =
                logoutSchema.safeParse(req.body);

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
                refreshToken
            } = parsed.data;

            await this.authService.SignOut(
                refreshToken
            );

            return res.status(200).json({
                message: 'Đăng xuất thành công'
            });

        } catch (error) {
            return next(error);
        }
    };

    refreshToken = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        try {
            const parsed =
                refreshTokenSchema.safeParse(req.body);

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
                refreshToken
            } = parsed.data;

            const result =
                await this.authService.RefreshToken(
                    refreshToken
                );

            return res.status(200).json(result);

        } catch (error) {
            return next(error);
        }
    };

    checkUsername = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

        try {
            const {
                username
            } = req.query;

            if (
                typeof username !== 'string' ||
                !username.trim()
            ) {
                return res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Username is required'
                    }
                });
            }

            const exists =
                await this.authService.CheckUsernameExists(
                    username
                );

            return res.status(200).json({
                exists
            });

        } catch (error) {
            return next(error);
        }
    };
}