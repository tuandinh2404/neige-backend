import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import dotenv from "dotenv";

process.env.NODE_ENV = "test";

const envResult = dotenv.config({
  path: ".env.test",
  override: true,
});

if (envResult.error) {
  throw envResult.error;
}

/*
 * Phải import các module application SAU khi .env.test đã được load.
 */
const { sequelize } = await import("../src/loaders/sequelize");
const { initChatModels, initFriendshipModels } = await import("../src/models");

const { default: User } = await import("../src/module/user/user.model");

const {
  Conversation,
} = await import("../src/module/chat/conversation/conversation.model");

const {
  ConversationParticipant,
} = await import(
  "../src/module/chat/participant/participant.model"
);

const {
  Message,
} = await import("../src/module/chat/message/message.model");

const {
  ConversationRepository,
} = await import(
  "../src/module/chat/conversation/conversation.repository"
);

const {
  ParticipantRepository,
} = await import(
  "../src/module/chat/participant/participant.repository"
);

const {
  ConversationService,
} = await import(
  "../src/module/chat/conversation/conversation.service"
);

const {
  MessageRepository,
} = await import(
  "../src/module/chat/message/message.repository"
);

const {
  MessageService,
} = await import(
  "../src/module/chat/message/message.service"
);

const {
  FriendshipRepository,
} = await import(
  "../src/module/friends/friends.repository"
);

const {
  FriendshipService,
} = await import(
  "../src/module/friends/friends.service"
);

const {
  UserRepository,
} = await import("../src/module/user/user.repository");

describe("PostgreSQL integration - concurrency", () => {
  beforeAll(async () => {
    /*
     * Kiểm tra đúng DB test thực sự có thể kết nối.
     */
    await sequelize.authenticate();

    /*
     * Dùng đúng cùng Sequelize instance mà application đang dùng.
     */
    initChatModels(sequelize);
    initFriendshipModels(sequelize);
  });

  beforeEach(async () => {
    /*
     * users là root của phần lớn FK.
     *
     * CASCADE sẽ dọn các row phụ thuộc:
     * conversations, participants, messages,
     * friendships, sessions, reactions, media, calls...
     *
     * Không dùng sync({ force: true }):
     * migration mới là source of truth của schema.
     */
    await sequelize.query(`
      TRUNCATE TABLE "users"
      RESTART IDENTITY
      CASCADE;
    `);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  async function createUser(
    username: string,
    uid: string,
  ) {
    return User.create({
      username,
      password_hash: "integration-test-password",
      uid,
      full_name: username,
      is_active: true,
      role: "user",
    });
  }

  async function createDirectConversation(
    userAId: number,
    userBId: number,
  ) {
    const conversationRepo = new ConversationRepository(sequelize);
    const participantRepo = new ParticipantRepository(sequelize);

    return sequelize.transaction(async (transaction) => {
      const userLowId = Math.min(userAId, userBId);
      const userHighId = Math.max(userAId, userBId);

      const conversation = await conversationRepo.createDirect(
        {
          userLowId,
          userHighId,
        },
        transaction,
      );

      await participantRepo.add(
        conversation.id,
        userLowId,
        transaction,
      );

      await participantRepo.add(
        conversation.id,
        userHighId,
        transaction,
      );

      return conversation;
    });
  }

  it("getOrCreateDirect: concurrent same pair creates exactly one conversation", async () => {
    const userA = await createUser("integration_direct_a", "integration-direct-a");
    const userB = await createUser("integration_direct_b", "integration-direct-b");

    const conversationRepo = new ConversationRepository(sequelize);
    const participantRepo = new ParticipantRepository(sequelize);

    const service = new ConversationService(
      sequelize,
      conversationRepo,
      participantRepo,
    );

    const [resultA, resultB] = await Promise.all([
      service.getOrCreateDirect(userA.id, userB.id),
      service.getOrCreateDirect(userB.id, userA.id),
    ]);

    expect(resultA.id).toBe(resultB.id);

    const conversations = await Conversation.findAll({
      where: {
        type: "direct",
        userLowId: Math.min(userA.id, userB.id),
        userHighId: Math.max(userA.id, userB.id),
      },
    });

    expect(conversations).toHaveLength(1);

    const participants = await ConversationParticipant.findAll({
      where: {
        conversationId: resultA.id,
      },
    });

    expect(participants).toHaveLength(2);
  });

  it("sendMessage: concurrent same clientMessageId creates exactly one message", async () => {
    const userA = await createUser("integration_message_a", "integration-message-a");
    const userB = await createUser("integration_message_b", "integration-message-b");

    const conversation = await createDirectConversation(
      userA.id,
      userB.id,
    );

    const messageRepo = new MessageRepository(sequelize);
    const participantRepo = new ParticipantRepository(sequelize);
    const conversationRepo = new ConversationRepository(sequelize);
    const friendshipRepo = new FriendshipRepository();

    const service = new MessageService(
      messageRepo,
      participantRepo,
      conversationRepo,
      friendshipRepo,
      sequelize,
    );

    const clientMessageId =
      "11111111-1111-4111-8111-111111111111";

    const input = {
      conversationId: conversation.id,
      senderId: userA.id,
      clientMessageId,
      type: "text",
      content: {
        text: "integration race test",
      },
    };

    const [resultA, resultB] = await Promise.all([
      service.sendMessage(input),
      service.sendMessage(input),
    ]);

    expect(
      [resultA.created, resultB.created].sort(),
    ).toEqual([false, true]);

    expect(resultA.message.id).toBe(resultB.message.id);

    const messages = await Message.findAll({
      where: {
        senderId: userA.id,
        clientMessageId,
      },
    });

    expect(messages).toHaveLength(1);

    const recipientParticipant =
      await ConversationParticipant.findOne({
        where: {
          conversationId: conversation.id,
          userId: userB.id,
        },
      });

    expect(recipientParticipant).not.toBeNull();
    expect(
      recipientParticipant?.messageRequestStatus,
    ).toBe("PENDING");
  });

  it("friends.sendRequest: concurrent same pair creates one friendship", async () => {
    const userA = await createUser("integration_friend_a", "integration-friend-a");
    const userB = await createUser("integration_friend_b", "integration-friend-b");

    const friendshipRepo = new FriendshipRepository();
    const userRepo = new UserRepository();

    const service = new FriendshipService(
      sequelize,
      friendshipRepo,
      userRepo,
    );

    const results = await Promise.allSettled([
      service.sendRequest(userA.id, userB.id),
      service.sendRequest(userA.id, userB.id),
    ]);

    const fulfilled = results.filter(
      (result) => result.status === "fulfilled",
    );

    const rejected = results.filter(
      (result) => result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    expect(
      fulfilled[0].status === "fulfilled"
        ? fulfilled[0].value.status
        : null,
    ).toBe("PENDING");

    expect(
      rejected[0].status === "rejected"
        ? rejected[0].reason.code
        : null,
    ).toBe("FRIEND_REQUEST_ALREADY_PENDING");

    const friendshipCount = await (
      await import("../src/module/friends/friends.model")
    ).Friendship.count({
      where: {
        requesterId: userA.id,
        receiverId: userB.id,
      },
    });

    expect(friendshipCount).toBe(1);
  });
});