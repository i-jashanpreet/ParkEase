export default class AppError extends Error {
  constructor(status, message, code = "APP_ERROR", details = undefined) {
    super(message);
    this.name = "AppError";
    this.status =
      Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
