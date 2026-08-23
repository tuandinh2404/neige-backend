
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import config from '@/config';
import { randomBytes } from 'crypto';
import { IUser, IUserInputDTO } from '@/interfaces/IUser';
import Session from '@/models/Session';
import { UserRepository } from '@/repositories/UserRepository';
import { Op } from 'sequelize';
import User from '@/models/User';

export default class AuthServices {

    private readonly userRepository = new UserRepository();


    public async SignUp(userInputDTO: IUserInputDTO): Promise<{ user: IUser; token: String; refreshToken: String }> {
        try{
            const existing = await this.userRepository.getByUsername(userInputDTO.username);
            if(existing) throw new Error('Username đã tồn tại');
            const checkUid = await this.userRepository.getByUid(userInputDTO.uid);
            if(checkUid) throw new Error('UID đã tồn tại');
            const hash_password = await bcrypt.hash(userInputDTO.password, 10);
            const userRecord = await this.userRepository.create({
                username: userInputDTO.username,
                password_hash: hash_password,
                full_name: userInputDTO.full_name,
                uid: userInputDTO.uid,
            });
            const token = this.generateAccessToken(userRecord as unknown as IUser);
            const refreshToken = await this.generateRefreshToken(userRecord.getDataValue('id'));

            const user = userRecord.toJSON() as IUser;
            Reflect.deleteProperty(user, 'password_hash');

            return { user, token, refreshToken };

        } catch (err) {
            const error = err as Error;
            throw new Error(error.message || 'Đăng ký thất bại');
        }
    }

    public async SignIn(username: string, password: string, deviceInfo?: string): Promise<{ user: IUser; token: String; refreshToken: String }> {
        const nomalizedUsername = username.trim().toLowerCase();
        const userRecord = await this.userRepository.getByUsername(nomalizedUsername);
        if(!userRecord) throw new Error('Không tìm thấy người dùng');
        const isPasswordValid = await bcrypt.compare(password, userRecord.getDataValue('password_hash'));
        if(!isPasswordValid) throw new Error('Mật khẩu không chính xác');

        const token = this.generateAccessToken(userRecord as unknown as IUser);
        const refreshToken = await this.generateRefreshToken(userRecord.getDataValue('id'), deviceInfo);

        const user = userRecord.toJSON() as IUser;
        Reflect.deleteProperty(user, 'password_hash');
        
        return { user, token, refreshToken };
    }
    public async SignOut(refreshToken: string): Promise<void> {
        await Session.destroy({ where: { refresh_token: refreshToken } });
    }

    public async RefreshToken(refreshToken: string): Promise<{ token: string }> {
    const session = await Session.findOne({
        where: {
            refresh_token: refreshToken,
            expires_at: { [Op.gt]: new Date() }
        },
        include: [{ model: User, as: 'user' }]
    });

    if (!session) throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');

    const user = await this.userRepository.getById(session.getDataValue('user_id'));
    if (!user) throw new Error('User không tồn tại');

    const token = this.generateAccessToken(user as unknown as IUser);
    return { token };
}

    public async CheckUsernameExists(username: string): Promise<boolean> {
        const nomalizedUsername = username.trim().toLowerCase();
        const userRecord = await this.userRepository.getByUsername(nomalizedUsername);
        if(!userRecord) return false;
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
            config.jwtSecret as string
        );
    }

    private async generateRefreshToken(userId: number, deviceInfo?: string): Promise<string> {
        const refreshToken = randomBytes(64).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60);

        await Session.create({
            user_id: userId,
            refresh_token: refreshToken,
            expires_at: expiresAt,
            device_info: deviceInfo,
        })
        return refreshToken;
    }


}