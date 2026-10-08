import { Schema, model } from "mongoose";

// One active OTP per phone number. Only a hash of the code is stored.
const otpSchema = new Schema({
  phone: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true },
  // MongoDB deletes the document automatically once this time passes.
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const OtpRequest = model("OtpRequest", otpSchema);
