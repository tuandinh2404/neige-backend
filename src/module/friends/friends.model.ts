import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from "sequelize";

export type FriendshipStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export class Friendship extends Model<
  InferAttributes<Friendship>,
  InferCreationAttributes<Friendship>
> {
  declare id: CreationOptional<number>;

  declare requesterId: number;
  declare receiverId: number;
  declare status: FriendshipStatus;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initFriendshipModel(sequelize: Sequelize): typeof Friendship {
  Friendship.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },

      requesterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "requester_id",
      },

      receiverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "receiver_id",
      },

      status: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "PENDING",
      },

      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },

      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at",
      },
    },
    {
      sequelize,
      tableName: "friendships",
      timestamps: true,
    },
  );

  return Friendship;
}
