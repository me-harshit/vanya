import "dotenv/config";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1),
    // Optional override of the database name (the tests use this to stay out of the real database).
    MONGODB_DB: z.string().optional(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    OTP_PROVIDER: z.enum(["console", "msg91"]).default("console"),
    OTP_TTL_MINUTES: z.coerce.number().positive().default(5),
    OTP_RESEND_SECONDS: z.coerce.number().nonnegative().default(30),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    // How long a customer's selected seats are kept for them while they pay.
    HOLD_MINUTES: z.coerce.number().positive().default(10),
    // mock = a built-in fake gateway for development and tests. razorpay needs the three keys below.
    PAYMENT_GATEWAY: z.enum(["mock", "razorpay"]).default("mock"),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    // TO CONFIRM WITH THE CLIENT: extra fee charged to the customer on top of the fare (percent of fare).
    CONVENIENCE_FEE_PERCENT: z.coerce.number().min(0).max(20).default(0),
    CORS_ORIGINS: z.string().default("http://localhost:5173"),
  })
  .refine((c) => !(c.NODE_ENV === "production" && c.OTP_PROVIDER === "console"), {
    message: "OTP_PROVIDER=console is not allowed in production",
    path: ["OTP_PROVIDER"],
  })
  .refine((c) => !(c.NODE_ENV === "production" && c.PAYMENT_GATEWAY === "mock"), {
    message: "PAYMENT_GATEWAY=mock is not allowed in production",
    path: ["PAYMENT_GATEWAY"],
  })
  .refine((c) => c.PAYMENT_GATEWAY !== "razorpay" || (c.RAZORPAY_KEY_ID && c.RAZORPAY_KEY_SECRET && c.RAZORPAY_WEBHOOK_SECRET), {
    message: "RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are required when PAYMENT_GATEWAY=razorpay",
    path: ["PAYMENT_GATEWAY"],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Print which settings are wrong, never their values (they may be secrets).
  const problems = parsed.error.issues.map((i) => `  ${i.path.join(".") || "(config)"}: ${i.message}`).join("\n");
  console.error(`Invalid environment configuration:\n${problems}\nSee .env.example.`);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
};
