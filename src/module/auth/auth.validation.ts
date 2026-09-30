import { z } from 'zod';

export const signupSchema = z.object({
    username: z
        .string()
        .trim()
        .min(1, 'Username is required'),

    password: z
        .string()
        .min(1, 'Password is required'),

    full_name: z
        .string()
        .trim()
        .min(1, 'Full name is required'),

    uid: z
        .string()
        .trim()
        .min(1, 'UID is required'),
});

export const loginSchema = z.object({
    username: z
        .string()
        .trim()
        .min(1, 'Username is required'),

    password: z
        .string()
        .min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
    refreshToken: z
        .string()
        .trim()
        .min(1, 'Refresh token is required'),
});

export const logoutSchema =
    refreshTokenSchema;