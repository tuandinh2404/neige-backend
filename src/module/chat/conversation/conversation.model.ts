// conversation/conversation.model.ts
import {
  Model,
  DataTypes,
  Sequelize,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';

export type ConversationType = 'direct' | 'group';

export class Conversation extends Model <
  InferAttributes<Conversation>,
  InferCreationAttributes<Conversation>
> {
  declare id: CreationOptional<string>;
  declare type: ConversationType;

  // chỉ có giá trị khi type = 'direct' — CHECK ở DB đã enforce, đây chỉ mirror lên TS
  declare userLowId: CreationOptional<number | null>;
  declare userHighId: CreationOptional<number | null>;

  declare lastMessageId: CreationOptional<string | null>;
  declare lastMessageAt: CreationOptional<Date | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initConversationModel(sequelize: Sequelize): typeof Conversation {
  Conversation.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('uuidv7()'),
      },
      type: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      userLowId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'user_low_id',
      },
      userHighId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'user_high_id',
      },
      lastMessageId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'last_message_id',
      },
      lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_message_at',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      tableName: 'conversations',
      timestamps: true,
      // dùng field: tường minh từng cột thay vì underscored:true,
      // để không phụ thuộc vào convention ngầm — nhất quán với cách
      // đã tránh né sequelize "tự suy luận" ở migration (bài học từ vụ ENUM).
    },
  );

  return Conversation;
}