import { DataTypes } from 'sequelize';
import {sequelize} from '@/loaders/sequelize';
import { IUser } from '@/interfaces/IUser';

const User = sequelize.define<IUser & any>('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  full_name: {
    type: DataTypes.TEXT,
  },
  uid: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  avatar_url: {
    type: DataTypes.TEXT,
  },
  email: {
    type: DataTypes.TEXT,
    unique: true,
  },
 
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  last_login_at: {
    type: DataTypes.DATE,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default User;