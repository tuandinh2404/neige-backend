// call/call.model.ts
import {
  Model,
  DataTypes,
  Sequelize,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';

export type CallType = 'voice' | 'video';

export type CallStatus =
  | 'initiated'
  | 'ringing'
  | 'accepted'
  | 'rejected'
  | 'missed'
  | 'ended'
  | 'cancelled';

export class Call extends Model<
  InferAttributes<Call>,
  InferCreationAttributes<Call>
> {
  declare id: CreationOptional<string>;
  declare conversationId: string;
  declare initiatedBy: number;
  declare type: CallType;
  declare status: CallStatus;

  declare startedAt: CreationOptional<Date | null>;
  declare answeredAt: CreationOptional<Date | null>;
  declare endedAt: CreationOptional<Date | null>;
  declare duration: CreationOptional<number | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initCallModel(sequelize: Sequelize): typeof Call {
  Call.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('uuidv7()'),
      },

      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'conversation_id',
      },

      initiatedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'initiated_by',
      },

      type: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      status: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'started_at',
      },

      answeredAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'answered_at',
      },

      endedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'ended_at',
      },

      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      tableName: 'calls',
      timestamps: true,
    },
  );
  

  return Call;
}