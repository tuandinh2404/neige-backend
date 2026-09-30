'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ============================================================
    // 1. conversations
    // ============================================================

    await queryInterface.createTable('conversations', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('uuidv7()'),
      },

      type: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      // Chỉ dùng cho conversation.type = 'direct'
      // user_low_id < user_high_id
      user_low_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      user_high_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      // FK được thêm sau khi messages được tạo.
      last_message_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },

      last_message_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "conversations"
      ADD CONSTRAINT "chk_conversations_type"
      CHECK (
        type IN ('direct', 'group')
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "conversations"
      ADD CONSTRAINT "chk_conversations_direct_pair"
      CHECK (
        (
          type = 'direct'
          AND user_low_id IS NOT NULL
          AND user_high_id IS NOT NULL
          AND user_low_id < user_high_id
        )
        OR
        (
          type = 'group'
          AND user_low_id IS NULL
          AND user_high_id IS NULL
        )
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "uq_conversations_direct_pair"
      ON "conversations" (user_low_id, user_high_id)
      WHERE type = 'direct';
    `);

    await queryInterface.addIndex(
      'conversations',
      ['last_message_at'],
      {
        name: 'idx_conversations_last_message_at',
        order: 'DESC',
      }
    );

    // ============================================================
    // 2. conversation_participants
    // ============================================================

    await queryInterface.createTable('conversation_participants', {
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'conversations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },

      left_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      archived_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      muted_until: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      last_read_message_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },

      last_delivered_message_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
    });

    await queryInterface.addConstraint(
      'conversation_participants',
      {
        fields: ['conversation_id', 'user_id'],
        type: 'primary key',
        name: 'pk_conversation_participants',
      }
    );

    await queryInterface.addIndex(
      'conversation_participants',
      ['user_id', 'conversation_id'],
      {
        name: 'idx_participants_user',
      }
    );

    // ============================================================
    // 3. messages
    // ============================================================

    await queryInterface.createTable('messages', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('uuidv7()'),
      },

      // ID do client dùng cho idempotency.
      client_message_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },

      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'conversations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      type: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      content: {
        type: Sequelize.JSONB,
        allowNull: false,
      },

      reply_to_message_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },

      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // JSONB bắt buộc phải là object.
    await queryInterface.sequelize.query(`
      ALTER TABLE "messages"
      ADD CONSTRAINT "chk_messages_content_is_object"
      CHECK (
        jsonb_typeof(content) = 'object'
      );
    `);

    // Message không được reply chính nó.
    await queryInterface.sequelize.query(`
      ALTER TABLE "messages"
      ADD CONSTRAINT "chk_messages_no_self_reply"
      CHECK (
        reply_to_message_id IS NULL
        OR reply_to_message_id <> id
      );
    `);

    // type là discriminator của message.
    // Payload cụ thể của từng type sẽ được validate ở service.
    await queryInterface.addIndex(
      'messages',
      ['conversation_id', 'created_at', 'id'],
      {
        name: 'idx_messages_timeline',
      }
    );

    // Một sender không được dùng lại cùng client_message_id.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "uq_messages_client_id"
      ON "messages" (sender_id, client_message_id)
      WHERE client_message_id IS NOT NULL;
    `);

    // ============================================================
    // 4. Composite FK
    //    sender phải thuộc conversation
    // ============================================================

    await queryInterface.addConstraint(
      'messages',
      {
        fields: ['conversation_id', 'sender_id'],
        type: 'foreign key',
        name: 'fk_messages_sender_is_participant',
        references: {
          table: 'conversation_participants',
          fields: ['conversation_id', 'user_id'],
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }
    );

    // ============================================================
    // 5. Composite key cho message trong conversation
    // ============================================================

    await queryInterface.addConstraint(
      'messages',
      {
        fields: ['conversation_id', 'id'],
        type: 'unique',
        name: 'uq_messages_conversation_id_id',
      }
    );

    // ============================================================
    // 6. reply_to phải cùng conversation
    // ============================================================

    await queryInterface.addConstraint(
      'messages',
      {
        fields: ['conversation_id', 'reply_to_message_id'],
        type: 'foreign key',
        name: 'fk_messages_reply_same_conversation',
        references: {
          table: 'messages',
          fields: ['conversation_id', 'id'],
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }
    );

    // ============================================================
    // 7. last_message phải cùng conversation
    // ============================================================

    await queryInterface.addConstraint(
      'conversations',
      {
        fields: ['id', 'last_message_id'],
        type: 'foreign key',
        name: 'fk_conversations_last_message_same_conversation',
        references: {
          table: 'messages',
          fields: ['conversation_id', 'id'],
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }
    );

    // ============================================================
    // 8. message_reactions
    // ============================================================

    await queryInterface.createTable('message_reactions', {
      message_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'messages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      reaction: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    await queryInterface.addConstraint(
      'message_reactions',
      {
        fields: ['message_id', 'user_id'],
        type: 'primary key',
        name: 'pk_message_reactions',
      }
    );

    await queryInterface.sequelize.query(`
      ALTER TABLE "message_reactions"
      ADD CONSTRAINT "chk_message_reactions_length"
      CHECK (
        length(reaction) <= 8
      );
    `);

    // ============================================================
    // 9. media_objects
    // ============================================================

    await queryInterface.createTable('media_objects', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('uuidv7()'),
      },

      object_key: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      status: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: 'pending',
      },

      attached_message_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'messages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "media_objects"
      ADD CONSTRAINT "chk_media_objects_status"
      CHECK (
        status IN ('pending', 'ready', 'orphaned')
      );
    `);

    await queryInterface.addIndex(
      'media_objects',
      ['attached_message_id'],
      {
        name: 'idx_media_objects_attached_message',
      }
    );

    // ============================================================
    // 10. calls
    // ============================================================

    await queryInterface.createTable('calls', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('uuidv7()'),
      },

      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'conversations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      initiated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      type: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      status: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      answered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      ended_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "calls"
      ADD CONSTRAINT "chk_calls_type"
      CHECK (
        type IN ('voice', 'video')
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "calls"
      ADD CONSTRAINT "chk_calls_status"
      CHECK (
        status IN (
          'initiated',
          'ringing',
          'accepted',
          'rejected',
          'missed',
          'ended',
          'cancelled'
        )
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "calls"
      ADD CONSTRAINT "chk_calls_duration"
      CHECK (
        duration IS NULL
        OR duration >= 0
      );
    `);

    await queryInterface.addIndex(
      'calls',
      ['conversation_id', 'created_at'],
      {
        name: 'idx_calls_conversation',
      }
    );

    // ============================================================
    // 11. Composite FK
    //      caller phải thuộc conversation
    // ============================================================

    await queryInterface.addConstraint(
      'calls',
      {
        fields: ['conversation_id', 'initiated_by'],
        type: 'foreign key',
        name: 'fk_calls_initiator_is_participant',
        references: {
          table: 'conversation_participants',
          fields: ['conversation_id', 'user_id'],
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }
    );
  },

  async down(queryInterface) {
    // ============================================================
    // Reverse dependency order
    // ============================================================

    await queryInterface.removeConstraint(
      'calls',
      'fk_calls_initiator_is_participant'
    );

    await queryInterface.dropTable('calls');

    await queryInterface.dropTable('media_objects');

    await queryInterface.dropTable('message_reactions');

    await queryInterface.removeConstraint(
      'conversations',
      'fk_conversations_last_message_same_conversation'
    );

    await queryInterface.removeConstraint(
      'messages',
      'fk_messages_reply_same_conversation'
    );

    await queryInterface.removeConstraint(
      'messages',
      'fk_messages_sender_is_participant'
    );

    await queryInterface.dropTable('messages');

    await queryInterface.dropTable('conversation_participants');

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "uq_conversations_direct_pair";
    `);

    await queryInterface.dropTable('conversations');
  },
};