'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'conversation_participants',
      'role',
      {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
    );

    await queryInterface.sequelize.query(`
      ALTER TABLE "conversation_participants"
      ADD CONSTRAINT "chk_participants_role"
      CHECK (
        role IS NULL
        OR role IN ('OWNER', 'MEMBER')
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "uq_participants_group_owner"
      ON "conversation_participants" ("conversation_id")
      WHERE role = 'OWNER';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "uq_participants_group_owner";
    `);

    await queryInterface.removeConstraint(
      'conversation_participants',
      'chk_participants_role',
    );

    await queryInterface.removeColumn(
      'conversation_participants',
      'role',
    );
  },
};