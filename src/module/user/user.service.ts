import { IUser } from '@/module/user/user.types';
import { UserRepository } from '@/module/user/user.repository';

import { NotFoundError } from '@/core/errors/AppError';

export default class UserService {
    private readonly userRepository =
        new UserRepository();

    public async getProfile(
        userId: number
    ): Promise<IUser> {
        const userRecord =
            await this.userRepository.getById(
                userId
            );

        if (!userRecord) {
            throw new NotFoundError(
                'Không tìm thấy người dùng'
            );
        }

        const userJson =
            userRecord.toJSON() as IUser;

        Reflect.deleteProperty(
            userJson,
            'password_hash'
        );

        return userJson;
    }

    public async searchUsers(
        uid: string
    ): Promise<IUser[]> {
        const userRecords =
            await this.userRepository.searchByUid(
                uid.trim().toLowerCase()
            );

        if (
            !userRecords ||
            userRecords.length === 0
        ) {
            throw new NotFoundError(
                'Không tìm thấy người dùng nào'
            );
        }

        const userJson =
            userRecords.map(
                (record) => record.toJSON()
            ) as IUser[];

        userJson.forEach((user) => {
            Reflect.deleteProperty(
                user,
                'password_hash'
            );
        });

        return userJson;
    }
}