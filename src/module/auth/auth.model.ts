import { DataTypes } from 'sequelize';
import {sequelize} from '@/loaders/sequelize';

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  device_info: {
    type: DataTypes.TEXT,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'sessions',
  timestamps: false,
  createdAt: 'created_at',
});

export default Session;