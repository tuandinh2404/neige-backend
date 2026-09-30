import { Message } from '../message.model';

export interface MessageDTO {
  id: string;
  clientMessageId: string | null;
  conversationId: string;
  sender: {
    id: number;
    username: string;
    avatarUrl: string | null;
  };
  type: string;
  content: Record<string, unknown>;
  replyToMessageId: string | null;
  createdAt: string;
  deletedAt: string | null;
}

type MessageWithSender = Message & {
  sender?: {
    id: number;
    username: string;
    avatar_url: string | null;
  };
};

export function toMessageDTO(
  message: MessageWithSender,
): MessageDTO {
  if (!message.sender) {
    throw new Error(
      `Sender ${message.senderId} was not loaded for message ${message.id}.`,
    );
  }

  return {
    id: message.id,
    clientMessageId: message.clientMessageId ?? null,
    conversationId: message.conversationId,
    sender: {
      id: message.sender.id,
      username: message.sender.username,
      avatarUrl: message.sender.avatar_url ?? null,
    },
    type: message.type,
    content: message.content,
    replyToMessageId: message.replyToMessageId ?? null,
    createdAt: message.createdAt.toISOString(),
    deletedAt: message.deletedAt
      ? message.deletedAt.toISOString()
      : null,
  };
}
