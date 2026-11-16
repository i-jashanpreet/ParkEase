export default function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status =
    Number.isInteger(err?.status) && err.status >= 400 && err.status <= 599
      ? err.status
      : 500;

  if (err?.isOperational === true && status >= 400 && status < 500) {
    const payload = {
      success: false,
      message: err.message || "Request failed",
    };
    if (err.code || err.details !== undefined) {
      payload.error = {
        ...(err.code ? { code: err.code } : {}),
        ...(err.details !== undefined ? { details: err.details } : {}),
      };
    }
    return res.status(status).json(payload);
  }

  const message =
    status === 400
      ? "Invalid request body"
      : status === 413
        ? "Request body too large"
        : "Something went wrong";
  res.status(status).json({ success: false, message });
}
