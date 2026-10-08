import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { DeviceToken } from "../../models/DeviceToken.js";

const registerBody = z.object({
  token: z.string().trim().min(10).max(400),
  platform: z.enum(["android", "ios"]),
  appVersion: z.string().trim().max(20).optional(),
});

// The app registers its push-notification token after sign-in and removes it on sign-out.
export function deviceRoutes() {
  const r = Router();
  r.use(requireAuth);

  // A token belongs to one phone, so if another customer signs in on it, it moves to them.
  r.post("/", async (req, res) => {
    const body = registerBody.parse(req.body);
    await DeviceToken.findOneAndUpdate(
      { token: body.token },
      { user: req.user!.id, platform: body.platform, appVersion: body.appVersion, lastSeenAt: new Date() },
      { upsert: true },
    );
    res.status(204).end();
  });

  r.delete("/", async (req, res) => {
    const { token } = z.object({ token: z.string().min(10).max(400) }).parse(req.body);
    await DeviceToken.deleteOne({ token, user: req.user!.id }); // only your own
    res.status(204).end();
  });

  return r;
}
