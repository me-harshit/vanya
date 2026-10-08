import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../errors.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { Operator } from "../../models/Operator.js";
import { User } from "../../models/User.js";
import type { BookingService } from "../bookings/bookings.service.js";
import { busRoutes } from "./buses.routes.js";
import { operatorContext } from "./context.js";
import { pointRoutes } from "./points.routes.js";
import { routeRoutes } from "./routes.routes.js";
import { tripRoutes } from "./trips.routes.js";

const registerBody = z.object({
  businessName: z.string().trim().min(2).max(100),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, "Invalid GSTIN")
    .optional(),
});

export function operatorRoutes(bookings: BookingService) {
  const r = Router();
  r.use(requireAuth);

  // Any signed-in customer can apply. An admin must approve before they can list anything.
  r.post("/register", async (req, res) => {
    if (req.user!.role === "admin") throw new AppError(403, "FORBIDDEN", "Admin accounts cannot be operators.");
    const body = registerBody.parse(req.body);
    if (await Operator.exists({ user: req.user!.id })) {
      throw new AppError(409, "ALREADY_REGISTERED", "You have already registered as an operator.");
    }
    const operator = await Operator.create({ user: req.user!.id, ...body });
    await User.updateOne({ _id: req.user!.id }, { role: "operator" });
    res.status(201).json({ operator });
  });

  // Everything below needs the operator role.
  r.use(requireRole("operator"));

  r.get("/me", operatorContext({ approvedOnly: false }), (req, res) => {
    res.json({ operator: req.operator });
  });

  // Listing buses, routes and trips needs an approved operator.
  const approved = operatorContext({ approvedOnly: true });
  r.use("/points", approved, pointRoutes());
  r.use("/buses", approved, busRoutes());
  r.use("/routes", approved, routeRoutes());
  r.use("/trips", approved, tripRoutes(bookings));

  return r;
}
