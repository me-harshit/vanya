import { Schema, model } from "mongoose";
import { REFUND_REASONS, REFUND_STATUSES } from "../constants.js";
import { applyJson } from "./shared.js";

// At most one refund per booking (the unique index), so a refund can never be created twice.
const refundSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    payment: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    reason: { type: String, enum: REFUND_REASONS, required: true },
    status: { type: String, enum: REFUND_STATUSES, default: "pending", required: true },
    gatewayRefundId: String,
    attempts: { type: Number, default: 0 },
    lastError: String,
    // While set to a future time, one worker is already sending this refund to the gateway.
    leaseUntil: Date,
    processedAt: Date,
  },
  { timestamps: true },
);
applyJson(refundSchema);
refundSchema.index({ status: 1, leaseUntil: 1 });

export const Refund = model("Refund", refundSchema);
