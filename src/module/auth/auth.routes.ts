import { Router } from 'express';
import { AuthController } from '@/module/auth/auth.controller';

const router = Router();

const authController = new AuthController();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.get('/check-username', authController.checkUsername);

export default router;