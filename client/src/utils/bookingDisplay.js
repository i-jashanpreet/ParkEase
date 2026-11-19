const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const date = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export const formatRupees = (amount) => currency.format(amount);
export const formatBookingTime = (stamp) => stamp ? date.format(new Date(stamp)) : "—";
