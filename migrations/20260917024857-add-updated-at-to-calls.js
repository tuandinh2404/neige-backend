'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('calls', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('now()'),
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('calls', 'updated_at');
  },
};