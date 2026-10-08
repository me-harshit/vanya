import { Schema, model } from "mongoose";
import { applyJson } from "./shared.js";

const citySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
applyJson(citySchema);
citySchema.index({ name: 1 });

export const City = model("City", citySchema);
