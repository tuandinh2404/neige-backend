import { Sequelize } from 'sequelize';
import User from '../module/user/user.model';
import {
  Conversation,
  initConversationModel,
} from '../module/chat/conversation/conversation.model';

import {
  ConversationParticipant,
  initParticipantModel,
} from '../module/chat/participant/participant.model';

import {
  Message,
  initMessageModel,
} from '../module/chat/message/message.model';

import {
  MessageReaction,
  initMessageReactionModel,
} from '../module/chat/message/reaction.model';

import {
  MediaObject,
  initMediaObjectModel,
} from '../module/chat/media/media.model';

import {
  Call,
  initCallModel,
} from '../module/chat/call/call.model';
import { Friendship, initFriendshipModel } from '@/module/friends/friends.model';

export function initChatModels(sequelize: Sequelize): void {
  if (User.sequelize !== sequelize) {
    throw new Error(
      'initChatModels() nhận Sequelize instance khác với instance mà User đã init() lúc import — ' +
      'association User ↔ chat models sẽ không hoạt động đúng.',
    );
  }

  initConversationModel(sequelize);
  initParticipantModel(sequelize);
  initMessageModel(sequelize);
  initMessageReactionModel(sequelize);
  initMediaObjectModel(sequelize);
  initCallModel(sequelize);

  Conversation.hasMany(Message, {
    foreignKey: 'conversationId',
    as: 'messages',
  });

  Conversation.hasMany(ConversationParticipant, {
    foreignKey: 'conversationId',
    as: 'participants',
  });

  Conversation.hasMany(Call, {
    foreignKey: 'conversationId',
    as: 'calls',
  });

  Conversation.belongsTo(Message, {
    foreignKey: 'lastMessageId',
    as: 'lastMessage',
    constraints: false,
  });

  ConversationParticipant.belongsTo(Conversation, {
    foreignKey: 'conversationId',
    as: 'conversation',
  });

  ConversationParticipant.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  Message.belongsTo(Conversation, {
    foreignKey: 'conversationId',
    as: 'conversation',
  });

  Message.belongsTo(User, {
    foreignKey: 'senderId',
    as: 'sender',
  });

  Message.hasMany(MessageReaction, {
    foreignKey: 'messageId',
    as: 'reactions',
  });

  Message.belongsTo(Message, {
    foreignKey: 'replyToMessageId',
    as: 'replyTo',
    constraints: false,
  });

  Message.hasOne(MediaObject, {
    foreignKey: 'attachedMessageId',
    as: 'media',
  });

  MessageReaction.belongsTo(Message, {
    foreignKey: 'messageId',
    as: 'message',
  });

  MessageReaction.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  MediaObject.belongsTo(User, {
    foreignKey: 'uploadedBy',
    as: 'uploader',
  });

  MediaObject.belongsTo(Message, {
    foreignKey: 'attachedMessageId',
    as: 'attachedMessage',
  });

  Call.belongsTo(Conversation, {
    foreignKey: 'conversationId',
    as: 'conversation',
  });

  Call.belongsTo(User, {
    foreignKey: 'initiatedBy',
    as: 'initiator',
  });
}

export function initFriendshipModels(sequelize: Sequelize): void {
  if (User.sequelize !== sequelize) {
    throw new Error(
      'initFriendshipModels() nhận Sequelize instance khác với instance mà User đã init() lúc import.',
    );
  }

  initFriendshipModel(sequelize);

  User.hasMany(Friendship, {
    foreignKey: 'requesterId',
    as: 'sentFriendships',
  });

  User.hasMany(Friendship, {
    foreignKey: 'receiverId',
    as: 'receivedFriendships',
  });

  Friendship.belongsTo(User, {
    foreignKey: 'requesterId',
    as: 'requester',
  });

  Friendship.belongsTo(User, {
    foreignKey: 'receiverId',
    as: 'receiver',
  });
}
