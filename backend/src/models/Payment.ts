import { Schema, model } from "mongoose";
import { PAYMENT_STATUSES } from "../constants.js";
import { applyJson } from "./shared.js";

// One payment attempt (a gateway "order") for a booking. Money in paise.
const paymentSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    gateway: { type: String, required: true },
    orderId: { type: String, required: true, unique: true },
    gatewayPaymentId: { type: String },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: PAYMENT_STATUSES, default: "created", required: true },
    failureReason: String,
    capturedAt: Date,
    // Set when something looks wrong (for example the paid amount differs). An admin must look.
    needsReview: { type: Boolean, default: false },
  },
  { timestamps: true },
);
applyJson(paymentSchema);
paymentSchema.index({ gatewayPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ status: 1, capturedAt: 1 });

export const Payment = model("Payment", paymentSchema);
