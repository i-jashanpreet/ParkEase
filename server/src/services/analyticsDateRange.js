import AppError from "../utils/AppError.js";

export const day = 86_400_000;
const ist = 330 * 60_000;
export const dateKey = (date) => new Date(date.getTime() + ist).toISOString().slice(0, 10);
export function analyticsRange(query, now = new Date()) {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  const from = query.from ?? dateKey(new Date(now.getTime() - 6 * day));
  const to = query.to ?? dateKey(now);
  const valid = (value) => typeof value === "string" && pattern.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
  if (!valid(from) || !valid(to)) throw new AppError(400, "Invalid date range", "INVALID_DATE_RANGE");
  const start = Date.parse(`${from}T00:00:00.000Z`) - ist;
  const end = Date.parse(`${to}T00:00:00.000Z`) - ist + day;
  if (end <= start || end - start > 90 * day) throw new AppError(400, "Date range exceeds 90 days", "INVALID_DATE_RANGE");
  return { start: new Date(start), end: new Date(end) };
}
