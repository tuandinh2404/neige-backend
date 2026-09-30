import expressLoader from "./express";
import sequelizeLoader, { sequelize } from "./sequelize";
import Logger from "./logger";
import express from "express";

import { initChatModels, initFriendshipModels } from "../models";

export default async ({ expressApp }: { expressApp: express.Application }) => {
  // Kết nối PostgreSQL
  await sequelizeLoader();
  Logger.info("✌️ DB loaded and connected!");

  // Khởi tạo các model chat
  initChatModels(sequelize);
  Logger.info("✌️ Chat models initialized!");

  initFriendshipModels(sequelize);
  Logger.info("✌️ Friendship model initialized!");

  // Load Express
  await expressLoader({ app: expressApp });
  Logger.info("✌️ Express loaded");
};
