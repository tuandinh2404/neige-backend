export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode = 500,
    public readonly code?: string,
  ) {
    super(message);

    this.name = 'AppError';

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Yêu cầu không hợp lệ') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Chưa xác thực') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Đã tồn tại') {
    super(message, 409, 'CONFLICT');
  }
}