'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE conversation_participants
      ALTER COLUMN message_request_status
      SET DEFAULT 'NONE';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE conversation_participants
      ALTER COLUMN message_request_status
      SET DEFAULT 'ACCEPTED';
    `);
  },
};