import {
  Model,
  DataTypes,
  Sequelize,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';

export class MessageReaction extends Model<
  InferAttributes<MessageReaction>,
  InferCreationAttributes<MessageReaction>
> {
  declare messageId: string;
  declare userId: number;
  declare reaction: string;
  declare createdAt: CreationOptional<Date>;
}

export function initMessageReactionModel(
  sequelize: Sequelize,
): typeof MessageReaction {
  MessageReaction.init(
    {
      messageId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        field: 'message_id',
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        field: 'user_id',
      },

      reaction: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'message_reactions',
      timestamps: false,
    },
  );

  return MessageReaction;
}