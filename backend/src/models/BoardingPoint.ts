import { Schema, model } from "mongoose";
import { applyJson } from "./shared.js";

// A place where passengers get on or off. `operator` empty means a shared point created by an admin.
const pointSchema = new Schema(
  {
    city: { type: Schema.Types.ObjectId, ref: "City", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    address: { type: String, trim: true, maxlength: 200 },
    landmark: { type: String, trim: true, maxlength: 100 },
    operator: { type: Schema.Types.ObjectId, ref: "Operator", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
applyJson(pointSchema);
pointSchema.index({ city: 1, isActive: 1 });

export const BoardingPoint = model("BoardingPoint", pointSchema);
