import ROLES from "../constants/roles.js";
import Mall from "../models/Mall.js";
import GuardAssignment from "../models/GuardAssignment.js";
import AppError from "../utils/AppError.js";

export async function requireBookingAccess(user, booking) {
  if (user.role === ROLES.ADMIN) return;
  if (user.role === ROLES.USER && String(user._id) === String(booking.driverId)) return;
  if (user.role === ROLES.MALL_OWNER && user.status === "ACTIVE" &&
      await Mall.exists({ _id: booking.mallId, ownerId: user._id })) return;
  if (user.role === ROLES.GUARD && user.status === "ACTIVE" && !user.mustChangePassword &&
      await GuardAssignment.exists({ guardId: user._id, mallId: booking.mallId, isActive: true })) return;
  throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
}
