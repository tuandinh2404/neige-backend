import { Router } from 'express';

import UserController from './user.controller';
import authMiddleware from '@/middlewares/auth.middleware';

const router = Router();
const userController = new UserController();

router.get(
    '/me',
    authMiddleware,
    userController.getProfile
);

router.get(
    '/search',
    authMiddleware,
    userController.searchUsers
);

export default router;