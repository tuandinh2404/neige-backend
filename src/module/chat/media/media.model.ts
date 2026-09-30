// media/media.model.ts

import {
    Model,
    DataTypes,
    Sequelize,
    CreationOptional,
    InferAttributes,
    InferCreationAttributes,
} from 'sequelize';

export type MediaObjectStatus =
    | 'pending'
    | 'ready'
    | 'orphaned';

export class MediaObject extends Model<
    InferAttributes<MediaObject>,
    InferCreationAttributes<MediaObject>
> {
    declare id: CreationOptional<string>;
    declare objectKey: string;
    declare uploadedBy: number;

    declare status: CreationOptional<MediaObjectStatus>;
    declare attachedMessageId: CreationOptional<string | null>;

    declare createdAt: CreationOptional<Date>;
}

export function initMediaObjectModel(
    sequelize: Sequelize,
): typeof MediaObject {
    MediaObject.init(
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: Sequelize.literal('uuidv7()'),
            },

            objectKey: {
                type: DataTypes.TEXT,
                allowNull: false,
                field: 'object_key',
            },

            uploadedBy: {
                type: DataTypes.INTEGER,
                allowNull: false,
                field: 'uploaded_by',
            },

            status: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: 'pending',
            },

            attachedMessageId: {
                type: DataTypes.UUID,
                allowNull: true,
                field: 'attached_message_id',
            },

            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                field: 'created_at',
            },
        },
        {
            sequelize,
            tableName: 'media_objects',
            timestamps: true,
            updatedAt: false,
        },
    );

    return MediaObject;
}