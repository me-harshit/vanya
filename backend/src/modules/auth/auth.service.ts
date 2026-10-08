import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../../config.js";
import type { Role } from "../../constants.js";
import { AppError } from "../../errors.js";
import { OtpRequest } from "../../models/OtpRequest.js";
import { User } from "../../models/User.js";
import type { SmsProvider } from "./sms.js";

function hashCode(phone: string, code: string) {
  return createHmac("sha256", `${config.JWT_SECRET}:otp`).update(`${phone}:${code}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function signToken(userId: string, role: Role) {
  return jwt.sign({ role }, config.JWT_SECRET, {
    subject: userId,
    expiresIn: config.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export async function requestOtp(phone: string, sms: SmsProvider) {
  const now = new Date();
  const existing = await OtpRequest.findOne({ phone });

  if (existing) {
    const waitMs = existing.lastSentAt.getTime() + config.OTP_RESEND_SECONDS * 1000 - now.getTime();
    if (waitMs > 0) {
      throw new AppError(429, "OTP_TOO_SOON", "Please wait before requesting another code.", {
        retryAfterSeconds: Math.ceil(waitMs / 1000),
      });
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await OtpRequest.findOneAndUpdate(
    { phone },
    {
      codeHash: hashCode(phone, code),
      attempts: 0,
      lastSentAt: now,
      expiresAt: new Date(now.getTime() + config.OTP_TTL_MINUTES * 60_000),
    },
    { upsert: true },
  );

  try {
    await sms.sendOtp(phone, code);
  } catch (err) {
    await OtpRequest.deleteOne({ phone });
    console.error("Failed to send OTP", err);
    throw new AppError(502, "SMS_FAILED", "We could not send the code. Please try again.");
  }

  return { expiresInSeconds: config.OTP_TTL_MINUTES * 60, resendInSeconds: config.OTP_RESEND_SECONDS };
}

export async function verifyOtp(phone: string, code: string) {
  const now = new Date();
  const invalid = new AppError(400, "OTP_INVALID", "That code is incorrect or has expired.");

  // Count the attempt atomically. Past the limit (or after expiry) nothing matches, so guessing is capped.
  const otp = await OtpRequest.findOneAndUpdate(
    { phone, expiresAt: { $gt: now }, attempts: { $lt: config.OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true },
  );
  if (!otp) throw invalid;
  if (!safeEqual(otp.codeHash, hashCode(phone, code))) throw invalid;

  // Single use: only one concurrent request can delete the code and succeed.
  const consumed = await OtpRequest.findOneAndDelete({ _id: otp._id });
  if (!consumed) throw invalid;

  const user = await User.findOneAndUpdate(
    { phone },
    { $set: { lastLoginAt: now }, $setOnInsert: { role: "customer" } },
    { upsert: true, new: true },
  );

  const profile = { id: user.id as string, phone: user.phone, name: user.name, role: user.role };
  return { token: signToken(profile.id, profile.role), user: publicUser(profile) };
}

export function publicUser(u: { id: string; phone: string; name?: string | null; role: Role }) {
  return { id: u.id, phone: u.phone, name: u.name ?? null, role: u.role };
}
