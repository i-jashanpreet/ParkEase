import AppError from "../utils/AppError.js";

export function accountRateLimit(limit, windowMs = 60_000) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.user?._id ?? "anonymous"}:${req.ip}`;
    const previous = buckets.get(key);
    const bucket = previous && previous.until > now ? previous : { count: 0, until: now + windowMs };
    if (bucket.count >= limit) {
      res.set("Retry-After", String(Math.ceil((bucket.until - now) / 1000)));
      return next(new AppError(429, "Too many requests", "RATE_LIMITED"));
    }
    bucket.count++;
    buckets.set(key, bucket);
    if (buckets.size > 10_000) for (const [id, value] of buckets) if (value.until <= now) buckets.delete(id);
    next();
  };
}
