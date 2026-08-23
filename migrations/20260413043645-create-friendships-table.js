'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
   
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
        }
      },
      receiver_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        }
      },
      status: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      }
    }, {
      indexes: [
        { fields: ['requester_id'] },
        { fields: ['receiver_id'] },
        { fields: ['requester_id', 'receiver_id'], unique: true },
        { fields: ['status'] },
      ]
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('friendships'); 
  }
};
