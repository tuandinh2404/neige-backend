import expressLoader from './express';
import sequelizeLoader from './sequelize';
import Logger from './logger';
import express from 'express';

export default async ({ expressApp }: { expressApp: express.Application }) => {
  // Kết nối PostgreSQL
  await sequelizeLoader();
  Logger.info('✌️ DB loaded and connected!');

  // Load Express
  await expressLoader({ app: expressApp });
  Logger.info('✌️ Express loaded');
};