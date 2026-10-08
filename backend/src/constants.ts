export const ROLES = ["customer", "operator", "admin"] as const;
export type Role = (typeof ROLES)[number];

// 10-digit Indian mobile number.
export const PHONE_REGEX = /^[6-9]\d{9}$/;

export const OPERATOR_STATUSES = ["pending", "approved", "suspended", "rejected"] as const;
export type OperatorStatus = (typeof OPERATOR_STATUSES)[number];

export const LISTING_MODES = ["direct", "erp", "quota"] as const;

// TO CONFIRM WITH THE CLIENT: default commission taken from each booking.
export const DEFAULT_COMMISSION_PERCENT = 10;

export const SEAT_KINDS = ["seater", "sleeper"] as const;
export const DECKS = ["lower", "upper"] as const;
export const BUS_TYPES = ["seater", "sleeper", "seater_sleeper"] as const;
export const AMENITIES = ["wifi", "charging", "blanket", "water", "reading_light", "tv", "toilet"] as const;

export const SEAT_STATUSES = ["available", "held", "booked"] as const;
export const TRIP_STATUSES = ["scheduled", "cancelled", "completed"] as const;

// Seat holds. TO CONFIRM WITH THE CLIENT: cutoff (operators may want their own) and per-booking limit.
export const MAX_SEATS_PER_HOLD = 6;
export const MAX_HOLD_TRIPS_PER_USER = 3; // a customer can hold seats on at most this many trips at once
export const BOOKING_CUTOFF_MINUTES = 30; // no new holds this close to departure

// Bookings and payments.
export const BOOKING_STATUSES = ["pending_payment", "confirmed", "cancelled", "expired"] as const;
export const GENDERS = ["male", "female", "other"] as const;
export const PAYMENT_STATUSES = ["created", "captured", "failed"] as const;
export const REFUND_STATUSES = ["pending", "processed", "failed"] as const;
export const REFUND_REASONS = ["customer_cancelled", "operator_cancelled", "seats_unavailable"] as const;
export const MAX_REFUND_ATTEMPTS = 6;
// The customer needs time to finish paying, so a hold with less than this left is too late to book.
export const MIN_HOLD_SECONDS_TO_BOOK = 60;

export const MAX_SEATS_PER_BUS = 60;
export const MAX_GENERATE_DAYS = 62;

// TO CONFIRM WITH THE CLIENT: default refund rules, applied when the operator does not set their own.
// A rule applies when the time left before departure is at least `hoursBeforeDeparture`.
export const DEFAULT_CANCELLATION_POLICY = [
  { hoursBeforeDeparture: 24, refundPercent: 90 },
  { hoursBeforeDeparture: 12, refundPercent: 60 },
  { hoursBeforeDeparture: 4, refundPercent: 30 },
  { hoursBeforeDeparture: 0, refundPercent: 0 },
];
