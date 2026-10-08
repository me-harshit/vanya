import { Router } from "express";
import { z } from "zod";
import { PHONE_REGEX } from "../../constants.js";
import { requireAuth } from "../../middleware/auth.js";
import { User } from "../../models/User.js";
import { publicUser, requestOtp, verifyOtp } from "./auth.service.js";
import type { SmsProvider } from "./sms.js";

const phone = z.string().regex(PHONE_REGEX, "Enter a valid 10-digit mobile number");
const requestBody = z.object({ phone });
const profileBody = z.object({
  name: z.string().trim().min(2).max(60).regex(/^[\p{L}][\p{L} .'-]*$/u, "Use letters only"),
});
const verifyBody =z.object({ phone, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") });

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

  // Edit your own profile. Only the name can be changed (never the role or phone number).
  r.patch("/me", requireAuth, async (req, res) => {
    const { name } = profileBody.parse(req.body);
    const user = await User.findByIdAndUpdate(req.user!.id, { name }, { new: true });
    res.json({ user: publicUser({ id: user!.id, phone: user!.phone, name: user!.name, role: user!.role }) });
  });

  return r;
}
