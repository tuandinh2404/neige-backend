import {
  Model,
  DataTypes,
  Sequelize,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';

export type ParticipantRole = 'OWNER' | 'MEMBER';

export type MessageRequestStatus =
  | 'NONE'
  | 'PENDING'
  | 'ACCEPTED'
  | 'HIDDEN';

export class ConversationParticipant extends Model<
  InferAttributes<ConversationParticipant>,
  InferCreationAttributes<ConversationParticipant>
> {
  declare conversationId: string;
  declare userId: number;

  declare joinedAt: CreationOptional<Date>;
  declare leftAt: CreationOptional<Date | null>;
  declare archivedAt: CreationOptional<Date | null>;
  declare mutedUntil: CreationOptional<Date | null>;

  declare lastReadMessageId: CreationOptional<string | null>;
  declare lastDeliveredMessageId: CreationOptional<string | null>;

  declare messageRequestStatus: CreationOptional<MessageRequestStatus>;
  declare role: CreationOptional<ParticipantRole | null>;
}

export function initParticipantModel(
  sequelize: Sequelize,
): typeof ConversationParticipant {
  ConversationParticipant.init(
    {
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        field: 'conversation_id',
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        field: 'user_id',
      },

      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
        field: 'joined_at',
      },

      leftAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'left_at',
      },

      archivedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'archived_at',
      },

      mutedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'muted_until',
      },

      lastReadMessageId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'last_read_message_id',
      },

      lastDeliveredMessageId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'last_delivered_message_id',
      },

      role: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'role',
      },

      messageRequestStatus: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'NONE',
        field: 'message_request_status',
      },
    },
    {
      sequelize,
      tableName: 'conversation_participants',
      timestamps: false,
    },
  );

  return ConversationParticipant;
}