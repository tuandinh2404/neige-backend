import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import config from "@/config";
import { createHash, randomBytes } from "crypto";

import { IUser, IUserInputDTO } from "@/module/user/user.types";

import Session from "@/module/auth/auth.model";
import { UserRepository } from "@/module/user/user.repository";

import { Op, Transaction } from "sequelize";
import { sequelize } from "@/loaders/sequelize";

import { UnauthorizedError } from "@/core/errors/AppError";

export default class AuthServices {
  private readonly userRepository = new UserRepository();

  public async SignUp(userInputDTO: IUserInputDTO): Promise<{
    user: IUser;
    token: string;
    refreshToken: string;
  }> {
    try {
      /*
       * 1. Normalize username ngay từ lúc đăng ký.
       *
       * SignUp và SignIn phải sử dụng cùng một
       * canonical username.
       */
      const normalizedUsername = userInputDTO.username.trim().toLowerCase();

      /*
       * 2. Kiểm tra username đã tồn tại.
       */
      const existing =
        await this.userRepository.getByUsername(normalizedUsername);

      if (existing) {
        throw new Error("Username đã tồn tại");
      }

      /*
       * 3. Kiểm tra UID đã tồn tại.
       */
      const checkUid = await this.userRepository.getByUid(userInputDTO.uid);

      if (checkUid) {
        throw new Error("UID đã tồn tại");
      }

      /*
       * 4. Hash password.
       */
      const hash_password = await bcrypt.hash(userInputDTO.password, 10);

      /*
       * 5. Lưu username đã normalize.
       */
      const userRecord = await this.userRepository.create({
        username: normalizedUsername,
        password_hash: hash_password,
        full_name: userInputDTO.full_name,
        uid: userInputDTO.uid,
      });

      /*
       * 6. Generate access token.
       */
      const token = this.generateAccessToken(userRecord as unknown as IUser);

      /*
       * 7. Generate refresh token.
       */
      const refreshToken = await this.generateRefreshToken(
        userRecord.getDataValue("id"),
      );

      /*
       * 8. Remove password_hash khỏi response.
       */
      const user = userRecord.toJSON() as IUser;

      Reflect.deleteProperty(user, "password_hash");

      return {
        user,
        token,
        refreshToken,
      };
    } catch (err) {
      const error = err as Error;

      throw new Error(error.message || "Đăng ký thất bại");
    }
  }

  public async SignIn(
    username: string,
    password: string,
    deviceInfo?: string,
  ): Promise<{
    user: IUser;
    token: string;
    refreshToken: string;
  }> {
    /*
     * Normalize username giống SignUp.
     */
    const normalizedUsername = username.trim().toLowerCase();

    const userRecord =
      await this.userRepository.getByUsername(normalizedUsername);

    if (!userRecord) {
      throw new Error("Không tìm thấy người dùng");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      userRecord.getDataValue("password_hash"),
    );

    if (!isPasswordValid) {
      throw new Error("Mật khẩu không chính xác");
    }

    if(userRecord.getDataValue("is_active") !== true) {
      throw new UnauthorizedError(
        "Tài khoản không hoạt động",
      );
    }

    await this.userRepository.update(userRecord.getDataValue("id"), {
      last_login_at: new Date(),
    });

    const token = this.generateAccessToken(userRecord as unknown as IUser);

    const refreshToken = await this.generateRefreshToken(
      userRecord.getDataValue("id"),
      deviceInfo,
    );

    const user = userRecord.toJSON() as IUser;

    Reflect.deleteProperty(user, "password_hash");

    return {
      user,
      token,
      refreshToken,
    };
  }

  public async SignOut(refreshToken: string): Promise<void> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    await Session.destroy({
      where: {
        refresh_token: refreshTokenHash,
      },
    });
  }

  public async RefreshToken(
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    return sequelize.transaction(async (transaction) => {
      const session = await Session.findOne({
        where: {
          refresh_token: refreshTokenHash,
          expires_at: {
            [Op.gt]: new Date(),
          },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!session) {
        throw new UnauthorizedError(
          "Refresh token không hợp lệ hoặc đã hết hạn",
        );
      }

      const userId = session.getDataValue("user_id");
      const deviceInfo = session.getDataValue("device_info");

      const user = await this.userRepository.getById(userId);

      if (!user) {
        throw new Error("User không tồn tại");
      }
      if(user.getDataValue("is_active") !== true) {
        throw new UnauthorizedError(
          "Tài khoản không hoạt động hoặc không tồn tại",
        );
      }

      const token = this.generateAccessToken(user as unknown as IUser);

      const newRefreshToken = await this.generateRefreshToken(
        userId,
        deviceInfo,
        transaction,
      );

      await session.destroy({ transaction });

      return {
        token,
        refreshToken: newRefreshToken,
      };
    });
  }

  public async CheckUsernameExists(username: string): Promise<boolean> {
    const normalizedUsername = username.trim().toLowerCase();

    const userRecord =
      await this.userRepository.getByUsername(normalizedUsername);

    if (!userRecord) {
      return false;
    }

    return true;
  }
  

  private generateAccessToken(user: IUser): string {
    const exp = new Date();

    exp.setDate(exp.getDate() + 7);

    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        uid: user.uid,
        role: user.role,
        exp: Math.floor(exp.getTime() / 1000),
      },
      config.jwtSecret as string,
    );
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash("sha256").update(refreshToken).digest("hex");
  }

  private async generateRefreshToken(
    userId: number,
    deviceInfo?: string,
    transaction?: Transaction,
  ): Promise<string> {
    const refreshToken = randomBytes(64).toString("hex");

    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + 60);

    await Session.create(
      {
        user_id: userId,
        refresh_token: refreshTokenHash,
        expires_at: expiresAt,
        device_info: deviceInfo,
      },
      { transaction },
    );

    return refreshToken;
  }
}
