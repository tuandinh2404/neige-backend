import { Op } from 'sequelize';
import User from '../user/user.model';

export class UserRepository {

    async getById(id:number) {
        return await User.findByPk(id);
    }

    async getByUsername(username:string) {
        return await User.findOne({ 
            where: { username } 
        });
    }

    async getByUid(uid:string) {
        return await User.findOne({ 
            where: { uid } 
        });
    }

    async searchByUid(uid: string) {
        return await User.findAll({
            where: {
                uid: {
                    [Op.iLike]: `%${uid}%`
                }
            }
        });
    }

    async existsByUsername(username:string) {
        const user = await this.getByUsername(username);
        return !!user;
    }

    async existsByUid(uid:string) {
        const user = await this.getByUid(uid);
        return !!user;
    }

    async create(data: any) {
        return User.create(data)
    }

    async update(id: number, data: any) {
        const user = await this.getById(id);
        if (!user) {
            throw new Error('User not found');
        }
        return user.update(data);
    }

    async delete(id: number) {
        const user = await this.getById(id);
        if (!user) {
            throw new Error('User not found');
        }
        return user.destroy();
    }

}