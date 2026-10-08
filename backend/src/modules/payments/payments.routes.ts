import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../errors.js";
import type { BookingService } from "../bookings/bookings.service.js";
import { MockGateway } from "./mock.js";

// The parts of a Razorpay webhook we use. Everything else in the payload is ignored.
const entity = z.object({
  id: z.string(),
  order_id: z.string().nullish(),
  amount: z.number().optional(),
  error_description: z.string().nullish(),
});
const webhook = z.object({
  event: z.string(),
  payload: z
    .object({
      payment: z.object({ entity }).optional(),
    })
    .optional(),
});

export function paymentRoutes(service: BookingService) {
  const r = Router();

  /**
   * Razorpay calls this when a payment succeeds or fails. It is the source of truth: even if the
   * app never reports back, this confirms the booking. It must answer 200 quickly or Razorpay
   * will keep retrying; processing is safe to repeat, so retries do no harm.
   */
  r.post("/razorpay/webhook", async (req, res) => {
    const raw = (req as { rawBody?: Buffer }).rawBody;
    const signature = req.header("x-razorpay-signature") ?? "";
    if (!raw || !service.gateway.verifyWebhookSignature(raw, signature)) {
      throw new AppError(401, "BAD_SIGNATURE", "Invalid signature.");
    }

    const ev = webhook.parse(req.body);
    const pay = ev.payload?.payment?.entity;
    if (pay?.order_id) {
      if (ev.event === "payment.captured" || ev.event === "order.paid") {
        if (pay.amount === undefined) throw new AppError(400, "BAD_EVENT", "Missing amount.");
        await service.settlePayment({ orderId: pay.order_id, paymentId: pay.id, amountPaise: pay.amount });
      } else if (ev.event === "payment.failed") {
        await service.recordPaymentFailure({ orderId: pay.order_id, reason: pay.error_description ?? undefined });
      }
    }
    res.json({ ok: true }); // unknown events are acknowledged and ignored
  });

  return r;
}

/** Development only: "pay" an order with the fake gateway, as if the customer finished paying. */
export function devPaymentRoutes(service: BookingService) {
  const r = Router();
  r.post("/payments/:orderId/pay", async (req, res) => {
    const g = service.gateway;
    if (!(g instanceof MockGateway)) throw new AppError(404, "NOT_FOUND", "Not found.");
    const orderId = String(req.params.orderId);
    if (!g.orders.has(orderId)) throw new AppError(404, "NOT_FOUND", "Unknown order.");
    const p = g.simulatePayment(orderId);
    const result = await service.settlePayment({ orderId, paymentId: p.paymentId, amountPaise: p.amountPaise });
    res.json({ paymentId: p.paymentId, outcome: result.outcome, booking: result.booking });
  });
  return r;
}
