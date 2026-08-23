import { Sequelize } from "sequelize";
import config from '@/config';
import Logger from '@/loaders/logger';

export const sequelize =  new Sequelize(
  config.database.name || '',
  config.database.user || '',
  config.database.password || '',
  {
    host: config.database.host,
    port: Number(config.database.port),
    dialect: 'postgres',
    logging: false
  }
)
export default async() => {
    await sequelize.authenticate();
    Logger.info('Kết nối PostgreSQL thành công!');
}