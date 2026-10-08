import { Schema, model } from "mongoose";
import { applyJson } from "./shared.js";

// A phone that can receive push notifications. Sending them comes later; this just keeps the list.
const deviceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ["android", "ios"], required: true },
    appVersion: String,
    lastSeenAt: { type: Date, required: true },
  },
  { timestamps: true },
);
applyJson(deviceSchema);

export const DeviceToken = model("DeviceToken", deviceSchema);
