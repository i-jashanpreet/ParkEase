import AppError from "./AppError.js";

const minute = 60_000;
const indiaOffset = 330 * minute;
const day = 1440 * minute;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function parseDate(value) {
  if (typeof value !== "string" || !timestamp.test(value)) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value ? parsed : null;
}

export function bookingWindow(input, now = Date.now()) {
  const startTime = parseDate(input?.startTime);
  const endTime = parseDate(input?.endTime);
  const duration = (endTime - startTime) / minute;
  if (!startTime || !endTime || duration < 30 || duration > 480 || duration % 30 !== 0 ||
      startTime.getTime() % minute !== 0 || startTime < now || startTime > now + 90 * day) {
    throw new AppError(400, "Choose a future start within 90 days and a duration of 30 minutes to 8 hours.", "INVALID_BOOKING_WINDOW");
  }
  return { startTime, endTime };
}

export function checkOperatingHours(mall, { startTime, endTime }) {
  const toMinutes = (time) => {
    const [hour, minutes] = time.split(":").map(Number);
    return hour * 60 + minutes;
  };
  const opens = toMinutes(mall.openingTime ?? "08:00");
  const closes = toMinutes(mall.closingTime ?? "23:00");
  const startsAt = ((startTime.getTime() + indiaOffset) % day) / minute;
  const endsAt = startsAt + (endTime - startTime) / minute;
  const inside = closes < opens
    ? (startsAt >= opens && endsAt <= closes + 1440) || endsAt <= closes
    : startsAt >= opens && endsAt <= closes;
  if (!inside) {
    throw new AppError(400, `Choose a window within mall hours (${mall.openingTime ?? "08:00"}–${mall.closingTime ?? "23:00"} IST).`, "OUTSIDE_MALL_HOURS");
  }
}

export function overlappingBookings(mallId, { startTime, endTime }) {
  return { mallId, status: "CONFIRMED", startTime: { $lt: endTime }, endTime: { $gt: startTime } };
}
