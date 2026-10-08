import { Schema, model } from "mongoose";
import { BOOKING_STATUSES, GENDERS } from "../constants.js";
import { applyJson } from "./shared.js";

const passengerSchema = new Schema(
  {
    seatNo: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: GENDERS, required: true },
    pricePaise: { type: Number, required: true },
  },
  { _id: false },
);

// Copied from the trip, so the ticket never changes even if the trip is edited later.
const stopSchema = new Schema(
  {
    point: { type: Schema.Types.ObjectId, ref: "BoardingPoint", required: true },
    name: { type: String, required: true },
    address: String,
    landmark: String,
    time: { type: Date, required: true },
  },
  { _id: false },
);

const contactSchema = new Schema({ phone: { type: String, required: true }, email: String }, { _id: false });

const pricingSchema = new Schema(
  {
    farePaise: { type: Number, required: true },
    convenienceFeePaise: { type: Number, default: 0 },
    discountPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, required: true },
  },
  { _id: false },
);

// All money is stored in paise (whole numbers).
const bookingSchema = new Schema(
  {
    pnr: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    operator: { type: Schema.Types.ObjectId, ref: "Operator", required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: "pending_payment", required: true },
    passengers: { type: [passengerSchema], required: true },
    seatNos: { type: [String], required: true },
    boardingPoint: { type: stopSchema, required: true },
    droppingPoint: { type: stopSchema, required: true },
    contact: { type: contactSchema, required: true },
    tripInfo: {
      operatorName: String,
      busName: String,
      busKind: String,
      ac: Boolean,
      fromCityName: String,
      toCityName: String,
      departureAt: Date,
      arrivalAt: Date,
    },
    pricing: { type: pricingSchema, required: true },
    commission: { percent: Number, paise: Number, operatorEarningPaise: Number },
    holdExpiresAt: { type: Date, required: true },
    confirmedAt: Date,
    cancellation: {
      at: Date,
      by: { type: String, enum: ["customer", "operator", "system"] },
      reason: String,
      refundPercent: Number,
      refundPaise: Number,
    },
  },
  { timestamps: true },
);
applyJson(bookingSchema);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ trip: 1, status: 1 });
bookingSchema.index({ operator: 1, createdAt: -1 });
bookingSchema.index({ status: 1, holdExpiresAt: 1 }); // expiry job

export const Booking = model("Booking", bookingSchema);
