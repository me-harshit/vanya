import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import type { SmsProvider } from "./modules/auth/sms.js";
import type { BookingService } from "./modules/bookings/bookings.service.js";
import { bookingRoutes } from "./modules/bookings/bookings.routes.js";
import { cityRoutes } from "./modules/catalog/cities.routes.js";
import { operatorRoutes } from "./modules/operators/operators.routes.js";
import { devPaymentRoutes, paymentRoutes } from "./modules/payments/payments.routes.js";
import { publicTripRoutes } from "./modules/trips/trips.routes.js";

export function createApp(deps: { sms: SmsProvider; bookings: BookingService }) {
  const app = express();

  app.disable("x-powered-by");
  // Behind Nginx/Cloudflare in production, so the real client IP comes from the proxy.
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(
    express.json({
      limit: "100kb",
      // Payment webhooks are signed over the exact bytes received, so keep them.
      verify: (req, _res, buf) => {
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 });
  });

  app.use("/auth", authRoutes(deps.sms));
  app.use("/cities", cityRoutes()); // public
  app.use("/trips", publicTripRoutes()); // public browsing; holds need sign-in
  app.use("/bookings", bookingRoutes(deps.bookings));
  app.use("/payments", paymentRoutes(deps.bookings)); // payment provider webhooks
  app.use("/operator", operatorRoutes(deps.bookings));
  app.use("/admin", adminRoutes(deps.bookings));

  // Lets the apps be tried end to end without a real payment provider. Never exists in production.
  if (deps.bookings.gateway.name === "mock" && config.NODE_ENV !== "production") {
    app.use("/dev", devPaymentRoutes(deps.bookings));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
