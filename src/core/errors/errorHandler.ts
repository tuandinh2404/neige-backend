import { Request, Response, NextFunction } from "express";

import { AppError } from "./AppError";
import { ChatError } from "@/module/chat/shared/chat.errors";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof ChatError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code ?? "APP_ERROR",
        message: err.message,
      },
    });
  }

  console.error(err);

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
    },
  });
};
