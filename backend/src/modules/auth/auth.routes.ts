import { Router } from "express";
import { z } from "zod";
import { PHONE_REGEX } from "../../constants.js";
import { requireAuth } from "../../middleware/auth.js";
import { publicUser, requestOtp, verifyOtp } from "./auth.service.js";
import type { SmsProvider } from "./sms.js";

const phone = z.string().regex(PHONE_REGEX, "Enter a valid 10-digit mobile number");
const requestBody = z.object({ phone });
const verifyBody = z.object({ phone, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") });

export function authRoutes(sms: SmsProvider) {
  const r = Router();

  r.post("/otp/request", async (req, res) => {
    const { phone } = requestBody.parse(req.body);
    res.json(await requestOtp(phone, sms));
  });

  r.post("/otp/verify", async (req, res) => {
    const { phone, code } = verifyBody.parse(req.body);
    res.json(await verifyOtp(phone, code));
  });

  r.get("/me", requireAuth, (req, res) => {
    res.json({ user: publicUser(req.user!) });
  });

  return r;
}
