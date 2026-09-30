'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'conversation_participants',
      'message_request_status',
      {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: 'ACCEPTED',
      },
    );

    await queryInterface.sequelize.query(`
      ALTER TABLE "conversation_participants"
      ADD CONSTRAINT "chk_participants_message_request_status"
      CHECK (
        message_request_status IN (
          'NONE',
          'PENDING',
          'ACCEPTED',
          'HIDDEN'
        )
      );
    `);

    await queryInterface.addIndex(
      'conversation_participants',
      ['user_id', 'message_request_status', 'conversation_id'],
      {
        name: 'idx_participants_user_message_request_status',
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'conversation_participants',
      'idx_participants_user_message_request_status',
    );

    await queryInterface.removeConstraint(
      'conversation_participants',
      'chk_participants_message_request_status',
    );

    await queryInterface.removeColumn(
      'conversation_participants',
      'message_request_status',
    );
  },
};
