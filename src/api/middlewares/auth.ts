import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "@/config";
import { IJwtUser } from "@/interfaces/IJwtUser";

export default (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if(!authHeader) {
        return res.status(401).json({
            message: "Không thể tìm thấy Token!!"
        })
    }
    const [scheme, token] =
        authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            message: "Token không hợp lệ"
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret!) as IJwtUser;
        req.currentUser = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            message: "Token đã hết hạn hoặc khôn hợp lê"
        })
    }
};
