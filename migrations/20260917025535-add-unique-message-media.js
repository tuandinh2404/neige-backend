'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_media_objects_attached_message"
    ON "media_objects" (attached_message_id)
    WHERE attached_message_id IS NOT NULL;
  `);
},

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "uq_media_objects_attached_message";
    `);
  },
};