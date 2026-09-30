'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addConstraint(
      'conversation_participants',
      {
        fields: ['conversation_id', 'last_read_message_id'],
        type: 'foreign key',
        name: 'fk_participants_last_read_same_conversation',
        references: {
          table: 'messages',
          fields: ['conversation_id', 'id'],
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
    );

    await queryInterface.addConstraint(
      'conversation_participants',
      {
        fields: ['conversation_id', 'last_delivered_message_id'],
        type: 'foreign key',
        name: 'fk_participants_last_delivered_same_conversation',
        references: {
          table: 'messages',
          fields: ['conversation_id', 'id'],
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'conversation_participants',
      'fk_participants_last_delivered_same_conversation',
    );

    await queryInterface.removeConstraint(
      'conversation_participants',
      'fk_participants_last_read_same_conversation',
    );
  },
};