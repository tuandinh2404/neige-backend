import { Request, Response, Router } from 'express'
import UserService from '@/services/user/user'
import authMiddleware from '../middlewares/auth';

const router = Router();
const userService = new UserService();

router.get(
    '/me', 
    authMiddleware, 
    async ( req: Request, res: Response) => {
    try {
        const userId = req.currentUser?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = await userService.getProfile(userId!);
        res.status(200).json({ user });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ message: err.message || 'Internal Server Error' });    }

});

router.get(
    '/search', 
    authMiddleware, 
    async ( req: Request, res: Response) => {
    try {
        const uid = req.query.uid as string;
        if (!uid) {
            return res.status(400).json({ message: 'UID is required' });
        }
        const user = await userService.searchUsers(uid);
        res.status(200).json({ user });

    } catch (error) {
        const err = error as Error;
        res.status(500).json({ message: err.message || 'Internal Server Error' });
    }
});

export default router;