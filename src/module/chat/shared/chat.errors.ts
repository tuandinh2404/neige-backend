import { AppError } from '@/core/errors/AppError';

export class ChatError extends AppError {
  constructor(
    message: string,
    code: string,
    statusCode = 400,
  ) {
    super(
      message,
      statusCode,
      code,
    );

    this.name = 'ChatError';

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );
  }
}

export class ConversationNotFoundError
  extends ChatError {
  constructor(
    conversationId: string,
  ) {
    super(
      `Conversation ${conversationId} does not exist.`,
      'CONVERSATION_NOT_FOUND',
      404,
    );
  }
}

export class NotConversationParticipantError
  extends ChatError {
  constructor(
    userId: number,
    conversationId: string,
  ) {
    super(
      `User ${userId} is not an active participant of conversation ${conversationId}.`,
      'NOT_CONVERSATION_PARTICIPANT',
      403,
    );
  }
}

export class OnlyGroupOwnerCanAddMemberError extends ChatError {
  constructor() {
    super(
      'Only the group owner can add members.',
      'ONLY_GROUP_OWNER_CAN_ADD_MEMBER',
      403,
    );
  }
}

export class ParticipantAlreadyExistsError extends ChatError {
  constructor(userId: number, conversationId: string) {
    super(
      `User ${userId} is already an active participant of conversation ${conversationId}.`,
      'PARTICIPANT_ALREADY_EXISTS',
      409,
    );
  }
}

export class OwnerCannotLeaveGroupError extends ChatError {
  constructor() {
    super(
      'The group owner cannot leave the group. Transfer ownership or dissolve the group first.',
      'OWNER_CANNOT_LEAVE_GROUP',
      409,
    );
  }
}

export class SelfConversationError
  extends ChatError {
  constructor() {
    super(
      'A user cannot create a direct conversation with itself.',
      'SELF_CONVERSATION',
      400,
    );
  }
}

export class MessageNotFoundError
  extends ChatError {
  constructor(
    messageId: string,
  ) {
    super(
      `Message ${messageId} does not exist.`,
      'MESSAGE_NOT_FOUND',
      404,
    );
  }
}

export class MessageConversationMismatchError
  extends ChatError {
  constructor() {
    super(
      'Message does not belong to this conversation.',
      'MESSAGE_CONVERSATION_MISMATCH',
      400,
    );
  }
}

export class MessageAlreadyDeletedError
  extends ChatError {
  constructor(
    messageId: string,
  ) {
    super(
      `Message ${messageId} has already been deleted.`,
      'MESSAGE_ALREADY_DELETED',
      409,
    );
  }
}

export class MessageOwnershipError
  extends ChatError {
  constructor() {
    super(
      'User can only delete their own message.',
      'MESSAGE_NOT_OWNER',
      403,
    );
  }
}

export class InvalidReplyTargetError
  extends ChatError {
  constructor(
    messageId: string,
  ) {
    super(
      `Message ${messageId} cannot be used as a reply target.`,
      'INVALID_REPLY_TARGET',
      400,
    );
  }
}

export class MessagePayloadConflictError
  extends ChatError {
  constructor(
    clientMessageId: string,
  ) {
    super(
      `clientMessageId ${clientMessageId} already exists with a different payload.`,
      'MESSAGE_IDEMPOTENCY_CONFLICT',
      409,
    );
  }
}

export class InvalidMessageTypeError
  extends ChatError {
  constructor(
    type: string,
  ) {
    super(
      `Unsupported message type "${type}".`,
      'INVALID_MESSAGE_TYPE',
      400,
    );
  }
}

export class InvalidMessageContentError
  extends ChatError {
  constructor(
    type: string,
  ) {
    super(
      `Invalid content for message type "${type}".`,
      'INVALID_MESSAGE_CONTENT',
      400,
    );
  }
}

export class MediaNotFoundError
  extends ChatError {
  constructor(
    mediaObjectId: string,
  ) {
    super(
      `MediaObject ${mediaObjectId} does not exist.`,
      'MEDIA_NOT_FOUND',
      404,
    );
  }
}

export class MediaOwnershipError
  extends ChatError {
  constructor() {
    super(
      'User does not own this media object.',
      'MEDIA_NOT_OWNER',
      403,
    );
  }
}

export class MediaNotReadyError
  extends ChatError {
  constructor(
    mediaObjectId: string,
  ) {
    super(
      `MediaObject ${mediaObjectId} is not ready.`,
      'MEDIA_NOT_READY',
      409,
    );
  }
}

export class MediaAlreadyAttachedError
  extends ChatError {
  constructor(
    mediaObjectId: string,
  ) {
    super(
      `MediaObject ${mediaObjectId} is already attached to a message.`,
      'MEDIA_ALREADY_ATTACHED',
      409,
    );
  }
}

export class CallNotFoundError
  extends ChatError {
  constructor(
    callId: string,
  ) {
    super(
      `Call ${callId} does not exist.`,
      'CALL_NOT_FOUND',
      404,
    );
  }
}

export class InvalidCallTransitionError
  extends ChatError {
  constructor(
    from: string,
    to: string,
  ) {
    super(
      `Invalid call transition: ${from} -> ${to}.`,
      'INVALID_CALL_TRANSITION',
      400,
    );
  }
}

export class CallStateConflictError
  extends ChatError {
  constructor(
    callId: string,
  ) {
    super(
      `Call ${callId} state was changed by another request.`,
      'CALL_STATE_CONFLICT',
      409,
    );
  }
}

export class InvalidReactionError
  extends ChatError {
  constructor() {
    super(
      'Reaction is invalid.',
      'INVALID_REACTION',
      400,
    );
  }
}

export class ParticipantAlreadyLeftError
  extends ChatError {
  constructor(
    userId: number,
    conversationId: string,
  ) {
    super(
      `User ${userId} has already left conversation ${conversationId}.`,
      'PARTICIPANT_ALREADY_LEFT',
      409,
    );
  }
}

export class InvalidCallTypeError
  extends ChatError {
  constructor(
    type: string,
  ) {
    super(
      `Unsupported call type "${type}".`,
      'INVALID_CALL_TYPE',
      400,
    );
  }
}

export class MessageRequestPendingError extends ChatError {
  constructor() {
    super(
      'Accept the message request before sending messages in this conversation.',
      'MESSAGE_REQUEST_PENDING',
      403,
    );
  }
}
export class MediaAttachConflictError
  extends ChatError {
  constructor(
    mediaObjectId: string,
  ) {
    super(
      `MediaObject ${mediaObjectId} attach state was changed by another request.`,
      'MEDIA_ATTACH_CONFLICT',
      409,
    );
  }
}
export class GroupSelfJoinNotAllowedError
  extends ChatError {
  constructor() {
    super(
      'Users cannot join group conversations directly.',
      'GROUP_SELF_JOIN_NOT_ALLOWED',
      403,
    );
  }
}