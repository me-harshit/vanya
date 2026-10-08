import { Router } from "express";
import { z } from "zod";
import { BOOKING_STATUSES, REFUND_STATUSES } from "../../constants.js";
import { AppError } from "../../errors.js";
import { escapeRegex, idParam, pageQuery } from "../../lib/ids.js";
import { Booking } from "../../models/Booking.js";
import { Payment } from "../../models/Payment.js";
import { Refund } from "../../models/Refund.js";
import type { BookingService } from "../bookings/bookings.service.js";

// Mounted under /admin (already restricted to admins).
export function adminBookingRoutes(service: BookingService) {
  const r = Router();

  r.get("/bookings", async (req, res) => {
    const q = pageQuery.extend({ status: z.enum(BOOKING_STATUSES).optional(), pnr: z.string().trim().max(12).optional() }).parse(req.query);
    const filter = { ...(q.status ? { status: q.status } : {}), ...(q.pnr ? { pnr: new RegExp(`^${escapeRegex(q.pnr)}`, "i") } : {}) };
    const [items, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip(q.skip).limit(q.limit),
      Booking.countDocuments(filter),
    ]);
    res.json({ items, total });
  });

  r.get("/bookings/:id", async (req, res) => {
    const booking = await Booking.findById(idParam(req.params.id));
    if (!booking) throw new AppError(404, "NOT_FOUND", "Booking not found.");
    const [payments, refund] = await Promise.all([Payment.find({ booking: booking.id }), Refund.findOne({ booking: booking.id })]);
    res.json({ booking, payments, refund });
  });

  // Refunds that are stuck, and payments flagged for a person to look at.
  r.get("/refunds", async (req, res) => {
    const q = pageQuery.extend({ status: z.enum(REFUND_STATUSES).optional() }).parse(req.query);
    const items = await Refund.find(q.status ? { status: q.status } : {}).sort({ createdAt: -1 }).skip(q.skip).limit(q.limit);
    res.json({ items });
  });

  r.post("/refunds/:id/retry", async (req, res) => {
    const refund = await service.retryRefund(idParam(req.params.id));
    res.json({ refund });
  });

  r.get("/payments/needs-review", async (_req, res) => {
    res.json({ items: await Payment.find({ needsReview: true }).sort({ updatedAt: -1 }).limit(100) });
  });

  return r;
}
