import {
    Model,
    DataTypes,
    Sequelize,
    CreationOptional,
    InferAttributes,
    InferCreationAttributes,
} from 'sequelize';

export type MessageContentPayload = Record<string, unknown>;

export class Message extends Model<
    InferAttributes<Message>,
    InferCreationAttributes<Message>
> {
    declare id: CreationOptional<string>;
    declare clientMessageId: CreationOptional<string | null>;

    declare conversationId: string;
    declare senderId: number;

    declare type: string;
    declare content: MessageContentPayload;

    declare replyToMessageId: CreationOptional<string | null>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
    declare deletedAt: CreationOptional<Date | null>;
}

export function initMessageModel(
    sequelize: Sequelize,
): typeof Message {
    Message.init(
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: Sequelize.literal('uuidv7()'),
            },

            clientMessageId: {
                type: DataTypes.UUID,
                allowNull: true,
                field: 'client_message_id',
            },

            conversationId: {
                type: DataTypes.UUID,
                allowNull: false,
                field: 'conversation_id',
            },

            senderId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                field: 'sender_id',
            },

            type: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            content: {
                type: DataTypes.JSONB,
                allowNull: false,
            },

            replyToMessageId: {
                type: DataTypes.UUID,
                allowNull: true,
                field: 'reply_to_message_id',
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

            deletedAt: {
                type: DataTypes.DATE,
                allowNull: true,
                field: 'deleted_at',
            },
        },
        {
            sequelize,
            tableName: 'messages',
            timestamps: true,
            paranoid: false,
        },
    );

    return Message;
}