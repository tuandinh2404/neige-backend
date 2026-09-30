import { Router } from "express";

import auth from "@/middlewares/auth.middleware";

import authRoutes from "@/module/auth/auth.routes";
import userRoutes from "@/module/user/user.routes";

import { sequelize } from "./sequelize";

import { ConversationRepository } from "@/module/chat/conversation/conversation.repository";
import { ParticipantRepository } from "@/module/chat/participant/participant.repository";
import { ConversationService } from "@/module/chat/conversation/conversation.service";
import { ConversationController } from "@/module/chat/conversation/conversation.controller";
import { createConversationRoutes } from "@/module/chat/conversation/conversation.routes";

import { MessageRepository } from "@/module/chat/message/message.repository";
import { MessageService } from "@/module/chat/message/message.service";
import { MessageController } from "@/module/chat/message/message.controller";
import { createMessageRoutes } from "@/module/chat/message/message.routes";

import { ParticipantService } from "@/module/chat/participant/participant.service";
import { ParticipantController } from "@/module/chat/participant/participant.controller";
import { createParticipantRoutes } from "@/module/chat/participant/participant.routes";

import { ReactionService } from "@/module/chat/message/reaction.service";
import { ReactionRepository } from "@/module/chat/message/reaction.repository";
import { ReactionController } from "@/module/chat/message/reaction.controller";
import { createReactionRoutes } from "@/module/chat/message/reaction.routes";

import { FriendshipService } from "@/module/friends/friends.service";
import { FriendshipRepository } from "@/module/friends/friends.repository";
import { FriendshipController } from "@/module/friends/friends.controller";
import { UserRepository } from "@/module/user/user.repository";
import { createFriendshipRoutes } from "@/module/friends/friends.routes";

import { MessageRequestService } from "@/module/chat/messageRequest/messageRequest.service";
import { MessageRequestController } from "@/module/chat/messageRequest/messageRequest.controller";
import { createMessageRequestRoutes } from "@/module/chat/messageRequest/messageRequest.routes";

import { CallService } from "@/module/chat/call/call.service";
import { CallRepository } from "@/module/chat/call/call.repository";
import { CallController } from "@/module/chat/call/call.controller";
import { createCallRoutes } from "@/module/chat/call/call.routes";

import { MediaService } from "@/module/chat/media/media.service";
import { MediaRepository } from "@/module/chat/media/media.repository";
import { MediaController } from "@/module/chat/media/media.controller";
import { createMediaRoutes } from "@/module/chat/media/media.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);

const conversationRepository = new ConversationRepository(sequelize);
const participantRepository = new ParticipantRepository(sequelize);
const friendshipRepository = new FriendshipRepository();

const conversationService = new ConversationService(
  sequelize,
  conversationRepository,
  participantRepository,
);

const conversationController = new ConversationController(
  conversationService,
);

const messageRepository = new MessageRepository(sequelize);

const messageService = new MessageService(
  messageRepository,
  participantRepository,
  conversationRepository,
  friendshipRepository,
  sequelize,
);

const messageController = new MessageController(messageService);

const participantService = new ParticipantService(
  participantRepository,
  conversationRepository,
  sequelize,
  new UserRepository(),
);

const participantController = new ParticipantController(
  participantService,
);

const reactionService = new ReactionService(
  new ReactionRepository(sequelize),
  participantRepository,
  messageRepository,
);

const reactionController = new ReactionController(
  reactionService,
);

const friendshipService = new FriendshipService(
  sequelize,
  friendshipRepository,
  new UserRepository(),
);

const friendshipController = new FriendshipController(
  friendshipService,
);

const messageRequestService = new MessageRequestService(
  sequelize,
  conversationRepository,
  participantRepository,
);

const messageRequestController = new MessageRequestController(
  messageRequestService,
);

const callService = new CallService(
  new CallRepository(),
  participantRepository,
);

const callController = new CallController(callService);

const mediaService = new MediaService(
  new MediaRepository(),
  participantRepository,
  messageRepository,
);

const mediaController = new MediaController(mediaService);

router.use(
  "/conversations/requests",
  createMessageRequestRoutes({
    controller: messageRequestController,
    authMiddleware: auth,
  }),
);

router.use("/conversations", auth);

router.use(
  "/conversations",
  createConversationRoutes({
    controller: conversationController,
  }),
);

router.use(
  "/conversations",
  createMessageRoutes({
    controller: messageController,
  }),
);

router.use(
  "/conversations",
  createParticipantRoutes({
    controller: participantController,
  }),
);

router.use(
  "/conversations",
  createReactionRoutes({
    controller: reactionController,
  }),
);

router.use(
  "/conversations",
  createCallRoutes({
    controller: callController,
  }),
);

router.use(
  "/conversations",
  createMediaRoutes({
    controller: mediaController,
  }),
);

router.use(
  "/friends",
  createFriendshipRoutes({
    controller: friendshipController,
    authMiddleware: auth,
  }),
);

export default router;