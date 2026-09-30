import { z } from 'zod';

import {
  InvalidMessageContentError,
  InvalidMessageTypeError,
} from '../shared/chat.errors';

export type MessageContent =
  Record<string, unknown>;

type MessageContentSchema =
  z.ZodType<MessageContent>;

const messageContentSchemas =
  new Map<string, MessageContentSchema>();

/**
 * Đăng ký schema cho một message type.
 *
 * Ví dụ khi protocol đã chốt:
 *
 * registerMessageContentSchema(
 *   'text',
 *   z.object({
 *     text: z.string().min(1),
 *   }).strict(),
 * );
 */
export function registerMessageContentSchema(
  type: string,
  schema: MessageContentSchema,
): void {
  const normalizedType = type.trim();

  if (!normalizedType) {
    throw new Error(
      'Message type cannot be empty.',
    );
  }

  if (
    messageContentSchemas.has(
      normalizedType,
    )
  ) {
    throw new Error(
      `Message content schema already registered for type "${normalizedType}".`,
    );
  }

  messageContentSchemas.set(
    normalizedType,
    schema,
  );
}

/**
 * Schema chuẩn cho message type `text`.
 *
 * Đây là built-in protocol đầu tiên của chat.
 * Các type khác (image, file, ...) sẽ được đăng ký
 * riêng khi protocol của chúng được chốt.
 */
registerMessageContentSchema(
  'text',
  z
    .object({
      text: z.string().min(1),
    })
    .strict(),
);

/**
 * Kiểm tra type đã có schema hay chưa.
 */
export function hasMessageContentSchema(
  type: string,
): boolean {
  return messageContentSchemas.has(
    type,
  );
}

/**
 * Validate content theo type.
 *
 * Không trả unknown sau validation:
 * kết quả luôn là JSON object đúng theo schema
 * đã đăng ký.
 */
export function validateMessageContent(
  type: string,
  content: unknown,
): MessageContent {
  const normalizedType = type.trim();

  const schema =
    messageContentSchemas.get(
      normalizedType,
    );

  if (!schema) {
    throw new InvalidMessageTypeError(
      normalizedType,
    );
  }

  const result = schema.safeParse(
    content,
  );

  if (!result.success) {
    throw new InvalidMessageContentError(
      normalizedType,
    );
  }

  return result.data;
}

/**
 * Canonicalize JSON object để cùng một payload
 * luôn tạo ra cùng representation.
 *
 * Điều này quan trọng cho idempotency:
 *
 * { text: "hello", lang: "vi" }
 *
 * và
 *
 * { lang: "vi", text: "hello" }
 *
 * được xem là cùng payload.
 */
export function canonicalizeMessageContent(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(
      canonicalizeMessageContent,
    );
  }

  if (
    value !== null &&
    typeof value === 'object'
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    return Object.keys(object)
      .sort()
      .reduce<
        Record<string, unknown>
      >(
        (result, key) => {
          result[key] =
            canonicalizeMessageContent(
              object[key],
            );

          return result;
        },
        {},
      );
  }

  return value;
}

/**
 * Tạo representation ổn định để so sánh
 * hai message payload.
 */
export function serializeCanonicalContent(
  value: unknown,
): string {
  return JSON.stringify(
    canonicalizeMessageContent(
      value,
    ),
  );
}