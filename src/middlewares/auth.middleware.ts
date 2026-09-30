import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "@/config";
import { IJwtUser } from "@/module/auth/auth.types";
import { UnauthorizedError } from "@/core/errors/AppError";
import { UserRepository } from "@/module/user/user.repository";

const userRepository = new UserRepository();

export default async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        throw new UnauthorizedError(
            "Không thể tìm thấy Token",
        );
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        throw new UnauthorizedError(
            "Token không hợp lệ",
        );
    }

    let decoded: IJwtUser;

    try {
        decoded = jwt.verify(
            token,
            config.jwtSecret!,
        ) as IJwtUser;
    } catch (err) {
        throw new UnauthorizedError(
            "Token đã hết hạn hoặc không hợp lệ",
        );
    }

    const user = await userRepository.getById(decoded.id);

    if (!user || user.getDataValue("is_active") !== true) {
        throw new UnauthorizedError(
            "Tài khoản không hoạt động hoặc không tồn tại",
        );
    }

    req.currentUser = decoded;
    next();
};