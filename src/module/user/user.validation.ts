import { z } from 'zod';

export const searchUsersSchema = z.object({
    uid: z
        .string()
        .trim()
        .min(1, 'UID is required'),
});