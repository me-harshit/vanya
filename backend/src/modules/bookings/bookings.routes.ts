import { Router } from "express";
import { z } from "zod";
import { BOOKING_STATUSES, GENDERS, MAX_SEATS_PER_HOLD, PHONE_REGEX } from "../../constants.js";
import { AppError } from "../../errors.js";
import { idParam, objectId, pageQuery } from "../../lib/ids.js";
import { requireAuth } from "../../middleware/auth.js";
import { Booking } from "../../models/Booking.js";
import { Payment } from "../../models/Payment.js";
import { Refund } from "../../models/Refund.js";
import type { BookingService } from "./bookings.service.js";

const passenger = z.object({
  seatNo: z.string().regex(/^[A-Za-z0-9]{1,6}$/),
  name: z.string().trim().min(2).max(60).regex(/^[\p{L}][\p{L} .'-]*$/u, "Use letters only"),
  age: z.number().int().min(1).max(120),
  gender: z.enum(GENDERS),
});

const createBody = z.object({
  tripId: objectId,
  boardingPointId: objectId,
  droppingPointId: objectId,
  passengers: z
    .array(passenger)
    .min(1)
    .max(MAX_SEATS_PER_HOLD)
    .refine((a) => new Set(a.map((p) => p.seatNo)).size === a.length, "A seat is listed twice"),
  contactPhone: z.string().regex(PHONE_REGEX).optional(),
  contactEmail: z.string().trim().email().max(120).optional(),
});

const verifyBody = z.object({
  orderId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100),
  signature: z.string().min(1).max(200),
});

// What a customer may see: everything except the platform's commission figures.
function customerView(b: { toJSON(): Record<string, unknown> }) {
  const json = b.toJSON();
  delete json.commission;
  return json;
}

export function bookingRoutes(service: BookingService) {
  const r = Router();
  r.use(requireAuth);

  // Turn the held seats into a booking and start the payment.
  r.post("/", async (req, res) => {
    const input = createBody.parse(req.body);
    const { booking, payment } = await service.createBooking({ id: req.user!.id, phone: req.user!.phone }, input);
    res.status(201).json({ booking: customerView(booking), payment });
  });

  r.get("/", async (req, res) => {
    const q = pageQuery.extend({ status: z.enum(BOOKING_STATUSES).optional() }).parse(req.query);
    const filter = { user: req.user!.id, ...(q.status ? { status: q.status } : {}) };
    const items = await Booking.find(filter).sort({ createdAt: -1 }).skip(q.skip).limit(q.limit);
    res.json({ items: items.map(customerView) });
  });

  r.get("/:id", async (req, res) => {
    const booking = await Booking.findOne({ _id: idParam(req.params.id), user: req.user!.id });
    if (!booking) throw new AppError(404, "NOT_FOUND", "Booking not found.");
    const [payment, refund] = await Promise.all([
      Payment.findOne({ booking: booking.id }).sort({ createdAt: -1 }),
      Refund.findOne({ booking: booking.id }),
    ]);
    res.json({
      booking: customerView(booking),
      payment: payment && { status: payment.status, orderId: payment.orderId, amountPaise: payment.amountPaise },
      refund: refund && { status: refund.status, amountPaise: refund.amountPaise },
    });
  });

  // The app calls this right after the payment screen closes, so the customer sees the result at once.
  r.post("/:id/verify-payment", async (req, res) => {
    const body = verifyBody.parse(req.body);
    const booking = await service.verifyCheckout(req.user!, idParam(req.params.id), body);
    res.json({ booking: customerView(booking), confirmed: booking.status === "confirmed" });
  });

  r.get("/:id/cancellation-quote", async (req, res) => {
    const id = idParam(req.params.id);
    if (!(await Booking.exists({ _id: id, user: req.user!.id }))) throw new AppError(404, "NOT_FOUND", "Booking not found.");
    res.json({ quote: await service.quoteCancellation(id) });
  });

  r.post("/:id/cancel", async (req, res) => {
    const { booking, refund } = await service.cancelBooking(req.user!, idParam(req.params.id));
    res.json({
      booking: customerView(booking),
      refund: refund && { status: refund.status, amountPaise: refund.amountPaise },
    });
  });

  return r;
}
