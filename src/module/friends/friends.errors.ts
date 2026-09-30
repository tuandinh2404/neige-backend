import { AppError } from "@/core/errors/AppError";

export class FriendError extends AppError {
  constructor(message: string, code: string, statusCode = 400) {
    super(message, statusCode, code);

    this.name = "FriendError";

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class FriendTargetNotFoundError extends FriendError {
  constructor(userId: number) {
    super(`User ${userId} does not exist.`, "FRIEND_TARGET_NOT_FOUND", 404);
  }
}

export class SelfFriendRequestError extends FriendError {
  constructor() {
    super(
      "A user cannot send a friend request to itself.",
      "SELF_FRIEND_REQUEST",
      400,
    );
  }
}

export class FriendRequestAlreadyPendingError extends FriendError {
  constructor() {
    super(
      "A friend request for this user pair is already pending.",
      "FRIEND_REQUEST_ALREADY_PENDING",
      409,
    );
  }
}

export class AlreadyFriendsError extends FriendError {
  constructor() {
    super("These users are already friends.", "ALREADY_FRIENDS", 409);
  }
}

export class FriendRequestNotFoundError extends FriendError {
  constructor() {
    super("Friend request does not exist.", "FRIEND_REQUEST_NOT_FOUND", 404);
  }
}

export class FriendRequestForbiddenError extends FriendError {
  constructor() {
    super(
      "You are not allowed to perform this action on the friend request.",
      "FRIEND_REQUEST_FORBIDDEN",
      403,
    );
  }
}

export class NotFriendsError extends FriendError {
  constructor() {
    super("These users are not friends.", "NOT_FRIENDS", 409);
  }
}
