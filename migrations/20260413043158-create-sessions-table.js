'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('sessions', { 
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        }
      },
      refresh_token: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      device_info: {
        type: Sequelize.STRING,

      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      }
    }, {
      indexes: [
        {fields: ['user_id']},
        {fields: ['refresh_token'], unique: true},
        {fields: ['expires_at']},
      ]
    }
  );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('sessions');
  }
};
