import { Schema, model } from "mongoose";
import { DEFAULT_COMMISSION_PERCENT, LISTING_MODES, OPERATOR_STATUSES } from "../constants.js";
import { applyJson } from "./shared.js";

const operatorSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 100 },
    gstin: { type: String, trim: true, uppercase: true },
    status: { type: String, enum: OPERATOR_STATUSES, default: "pending", required: true },
    commissionPercent: { type: Number, default: DEFAULT_COMMISSION_PERCENT, min: 0, max: 50 },
    // direct = buses added in the portal. erp / quota come later.
    listingMode: { type: String, enum: LISTING_MODES, default: "direct" },
  },
  { timestamps: true },
);
applyJson(operatorSchema);

export const Operator = model("Operator", operatorSchema);
