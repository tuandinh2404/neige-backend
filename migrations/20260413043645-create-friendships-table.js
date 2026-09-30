'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('friendships', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      requester_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      receiver_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      status: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: 'PENDING',
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Không cho phép user gửi lời mời kết bạn cho chính mình.
    await queryInterface.sequelize.query(`
      ALTER TABLE friendships
      ADD CONSTRAINT chk_friendships_different_users
      CHECK (requester_id <> receiver_id);
    `);

    // Chỉ cho phép các trạng thái đã định nghĩa.
    await queryInterface.sequelize.query(`
      ALTER TABLE friendships
      ADD CONSTRAINT chk_friendships_valid_status
      CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED'));
    `);

    // Một cặp user chỉ có một friendship,
    // không phân biệt requester / receiver.
    //
    // Ví dụ:
    //   1 -> 2
    //   2 -> 1
    //
    // được xem là cùng một pair.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_friendships_user_pair
      ON friendships (
        LEAST(requester_id, receiver_id),
        GREATEST(requester_id, receiver_id)
      );
    `);

    // Query outgoing friend requests.
    await queryInterface.addIndex(
      'friendships',
      ['requester_id', 'status'],
      {
        name: 'idx_friendships_requester_status',
      }
    );

    // Query incoming friend requests.
    await queryInterface.addIndex(
      'friendships',
      ['receiver_id', 'status'],
      {
        name: 'idx_friendships_receiver_status',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_friendships_user_pair;
    `);

    await queryInterface.dropTable('friendships');
  },
};