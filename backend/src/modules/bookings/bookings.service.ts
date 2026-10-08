import { randomBytes } from "node:crypto";
import { config } from "../../config.js";
import { MAX_REFUND_ATTEMPTS, MIN_HOLD_SECONDS_TO_BOOK } from "../../constants.js";
import { AppError } from "../../errors.js";
import { addMinutes } from "../../lib/time.js";
import { Booking } from "../../models/Booking.js";
import { Operator } from "../../models/Operator.js";
import { Payment } from "../../models/Payment.js";
import { Refund } from "../../models/Refund.js";
import { Trip } from "../../models/Trip.js";
import type { PaymentGateway } from "../payments/types.js";
import { getHold, releaseBookedSeats, confirmSeats } from "../trips/seatHold.js";

// Letters and digits without look-alikes (no 0/O, 1/I). 32 symbols, so a random byte maps evenly.
const PNR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newPnr = () => Array.from(randomBytes(8), (b) => PNR_ALPHABET[b % 32]).join("");

const toPaise = (rupees: number) => Math.round(rupees * 100);
const percentOf = (paise: number, percent: number) => Math.round((paise * percent) / 100);
const isDuplicateKey = (err: unknown) => (err as { code?: number })?.code === 11000;

export type CreateBookingInput = {
  tripId: string;
  boardingPointId: string;
  droppingPointId: string;
  passengers: { seatNo: string; name: string; age: number; gender: "male" | "female" | "other" }[];
  contactPhone?: string;
  contactEmail?: string;
};

/**
 * Bookings, payments and refunds.
 *
 * The rules that keep money and seats correct:
 *  - A booking is only CONFIRMED after the payment is captured AND the seats were secured.
 *  - If the payment is captured but the seats are gone, the money is refunded automatically.
 *  - Every step can safely run twice (webhook retries, app callback plus webhook, crash recovery).
 *  - A background job (reconcile) finishes anything that was interrupted.
 */
export function createBookingService(gateway: PaymentGateway) {
  // ---------------------------------------------------------------- creating a booking

  async function createBooking(user: { id: string; phone: string }, input: CreateBookingInput) {
    const hold = await getHold(input.tripId, user.id);
    if (!hold) throw new AppError(409, "NO_HOLD", "Your seats are no longer held. Please select them again.");
    if (hold.expiresInSeconds < MIN_HOLD_SECONDS_TO_BOOK) {
      throw new AppError(409, "HOLD_EXPIRING", "Your hold is about to run out. Please select your seats again.");
    }

    // Exactly the held seats, one passenger each.
    const held = new Set(hold.seats.map((s) => s.no));
    const asked = new Set(input.passengers.map((p) => p.seatNo));
    if (held.size !== asked.size || [...held].some((n) => !asked.has(n))) {
      throw new AppError(409, "HOLD_MISMATCH", "Passenger details must match the seats you are holding.", {
        heldSeats: [...held],
        passengerSeats: [...asked],
      });
    }

    const trip = await Trip.findById(input.tripId);
    if (!trip || trip.status !== "scheduled" || trip.departureAt <= new Date()) {
      throw new AppError(409, "TRIP_CLOSED", "Bookings are closed for this trip.");
    }
    const boarding = trip.boardingPoints.find((p) => String(p.point) === input.boardingPointId);
    const dropping = trip.droppingPoints.find((p) => String(p.point) === input.droppingPointId);
    if (!boarding || !dropping) throw new AppError(400, "INVALID_POINT", "Choose a boarding and a dropping point from this trip.");

    const priceOf = new Map(hold.seats.map((s) => [s.no, toPaise(s.price)]));
    const ladies = new Set(trip.seats.filter((s) => s.ladies).map((s) => s.no));
    for (const p of input.passengers) {
      if (ladies.has(p.seatNo) && p.gender !== "female") {
        throw new AppError(400, "LADIES_SEAT", `Seat ${p.seatNo} is reserved for women.`, { seat: p.seatNo });
      }
    }

    const operator = await Operator.findById(trip.operator);
    if (!operator) throw new AppError(409, "TRIP_CLOSED", "This operator is not available.");

    const farePaise = input.passengers.reduce((sum, p) => sum + priceOf.get(p.seatNo)!, 0);
    const convenienceFeePaise = percentOf(farePaise, config.CONVENIENCE_FEE_PERCENT);
    const totalPaise = farePaise + convenienceFeePaise;
    const commissionPaise = percentOf(farePaise, operator.commissionPercent);

    // A new attempt replaces any earlier unpaid booking for this trip.
    await Booking.updateMany({ user: user.id, trip: trip.id, status: "pending_payment" }, { status: "expired" });

    const doc = {
      user: user.id,
      trip: trip.id,
      operator: operator.id,
      status: "pending_payment" as const,
      passengers: input.passengers.map((p) => ({ ...p, pricePaise: priceOf.get(p.seatNo)! })),
      seatNos: input.passengers.map((p) => p.seatNo),
      boardingPoint: { point: boarding.point, name: boarding.name, address: boarding.address, landmark: boarding.landmark, time: boarding.time },
      droppingPoint: { point: dropping.point, name: dropping.name, address: dropping.address, landmark: dropping.landmark, time: dropping.time },
      contact: { phone: input.contactPhone ?? user.phone, email: input.contactEmail },
      tripInfo: {
        operatorName: trip.operatorName,
        busName: trip.busInfo.name,
        busKind: trip.busInfo.type,
        ac: trip.busInfo.ac,
        fromCityName: trip.fromCityName,
        toCityName: trip.toCityName,
        departureAt: trip.departureAt,
        arrivalAt: trip.arrivalAt,
      },
      pricing: { farePaise, convenienceFeePaise, discountPaise: 0, totalPaise },
      commission: { percent: operator.commissionPercent, paise: commissionPaise, operatorEarningPaise: farePaise - commissionPaise },
      holdExpiresAt: hold.expiresAt,
    };

    let booking;
    for (let attempt = 0; ; attempt++) {
      try {
        booking = await Booking.create({ ...doc, pnr: newPnr() });
        break;
      } catch (err) {
        if (!isDuplicateKey(err) || attempt >= 4) throw err;
      }
    }

    let orderId: string;
    try {
      ({ orderId } = await gateway.createOrder({ amountPaise: totalPaise, receipt: booking.pnr, notes: { bookingId: booking.id, tripId: trip.id } }));
    } catch (err) {
      await Booking.deleteOne({ _id: booking.id }); // nothing was charged, so nothing to keep
      console.error("Payment order failed", err);
      throw new AppError(502, "PAYMENT_UNAVAILABLE", "We could not start the payment. Your seats are still held, please try again.");
    }

    const payment = await Payment.create({
      booking: booking.id,
      user: user.id,
      gateway: gateway.name,
      orderId,
      amountPaise: totalPaise,
    });

    return {
      booking,
      payment: { gateway: gateway.name, keyId: gateway.publicKeyId, orderId, amountPaise: totalPaise, currency: "INR", paymentId: payment.id },
    };
  }

  // ---------------------------------------------------------------- payments

  /**
   * Called when a payment is known to be captured, by the webhook, by the app's confirmation call,
   * or by the reconcile job. Safe to call any number of times for the same payment.
   */
  async function settlePayment(input: { orderId: string; paymentId: string; amountPaise: number }) {
    const payment = await Payment.findOne({ orderId: input.orderId });
    if (!payment) return { outcome: "unknown_order" as const, booking: null };

    if (input.amountPaise !== payment.amountPaise) {
      // Never confirm a booking for the wrong amount. A person has to look at it.
      console.error(`Payment amount mismatch on order ${input.orderId}: paid ${input.amountPaise}, expected ${payment.amountPaise}`);
      await Payment.updateOne(
        { _id: payment.id },
        { needsReview: true, gatewayPaymentId: input.paymentId, failureReason: `Paid ${input.amountPaise} paise, expected ${payment.amountPaise}` },
      );
      return { outcome: "amount_mismatch" as const, booking: null };
    }

    // Only one caller can flip the payment to captured; everyone else just finishes the booking.
    await Payment.findOneAndUpdate(
      { _id: payment.id, status: { $ne: "captured" } },
      { status: "captured", gatewayPaymentId: input.paymentId, capturedAt: new Date(), failureReason: null },
    );
    const captured = (await Payment.findById(payment.id))!;
    const booking = await finalizeBooking(captured);
    return { outcome: (booking?.status ?? "unknown_order") as string, booking };
  }

  async function recordPaymentFailure(input: { orderId: string; reason?: string }) {
    await Payment.updateOne({ orderId: input.orderId, status: "created" }, { status: "failed", failureReason: input.reason ?? "Payment failed" });
  }

  /** The step after money is captured: secure the seats, or give the money back. */
  async function finalizeBooking(payment: InstanceType<typeof Payment>) {
    const booking = await Booking.findById(payment.booking);
    if (!booking) return null;
    if (booking.status === "confirmed") return booking;

    if (booking.status === "cancelled") {
      // Cancelled while the payment was on its way. Make sure the money goes back.
      const refund = await ensureRefund(booking.id, payment.id, "seats_unavailable", booking.pricing.totalPaise);
      await processRefund(refund.id);
      return booking;
    }

    const ok = await confirmSeats(String(booking.trip), String(booking.user), booking.seatNos, booking.id, { allowExpiredHold: true });
    if (ok) {
      const confirmed = await Booking.findOneAndUpdate(
        { _id: booking.id, status: { $in: ["pending_payment", "expired"] } },
        { status: "confirmed", confirmedAt: new Date() },
        { new: true },
      );
      return confirmed ?? (await Booking.findById(booking.id));
    }

    // The seats were taken or the trip was cancelled. Cancel and refund everything.
    await Booking.findOneAndUpdate(
      { _id: booking.id, status: { $in: ["pending_payment", "expired"] } },
      {
        status: "cancelled",
        cancellation: { at: new Date(), by: "system", reason: "seats_unavailable", refundPercent: 100, refundPaise: booking.pricing.totalPaise },
      },
    );
    const refund = await ensureRefund(booking.id, payment.id, "seats_unavailable", booking.pricing.totalPaise);
    await processRefund(refund.id);
    return Booking.findById(booking.id);
  }

  /** The app calls this right after paying so the customer sees the result at once. */
  async function verifyCheckout(
    user: { id: string },
    bookingId: string,
    input: { orderId: string; paymentId: string; signature: string },
  ) {
    const booking = await Booking.findOne({ _id: bookingId, user: user.id });
    if (!booking) throw new AppError(404, "NOT_FOUND", "Booking not found.");
    const payment = await Payment.findOne({ booking: booking.id, orderId: input.orderId });
    if (!payment) throw new AppError(400, "INVALID_PAYMENT", "That payment does not belong to this booking.");
    if (!gateway.verifyCheckoutSignature(input)) throw new AppError(400, "BAD_SIGNATURE", "Payment could not be verified.");

    // Never trust the amount from the phone: ask the provider.
    try {
      const found = (await gateway.fetchOrderPayments(input.orderId)).find((p) => p.paymentId === input.paymentId);
      if (found?.status === "captured") {
        await settlePayment({ orderId: input.orderId, paymentId: input.paymentId, amountPaise: found.amountPaise });
      }
    } catch (err) {
      console.error("Could not confirm payment with the provider yet", err); // the webhook or reconcile will finish it
    }
    return (await Booking.findById(booking.id))!;
  }

  // ---------------------------------------------------------------- refunds

  async function ensureRefund(bookingId: string, paymentId: string, reason: "customer_cancelled" | "operator_cancelled" | "seats_unavailable", amountPaise: number) {
    const make = () =>
      Refund.findOneAndUpdate(
        { booking: bookingId },
        { $setOnInsert: { payment: paymentId, amountPaise, reason, status: "pending", attempts: 0 } },
        { upsert: true, new: true },
      );
    try {
      return (await make())!;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err; // two callers created it at once: the other one won
      return (await Refund.findOne({ booking: bookingId }))!;
    }
  }

  /** Sends one pending refund to the gateway. Only one worker can hold the refund at a time. */
  async function processRefund(refundId: string) {
    const now = new Date();
    const refund = await Refund.findOneAndUpdate(
      {
        _id: refundId,
        status: "pending",
        attempts: { $lt: MAX_REFUND_ATTEMPTS },
        $or: [{ leaseUntil: null }, { leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } }],
      },
      { leaseUntil: addMinutes(now, 2), $inc: { attempts: 1 } },
      { new: true },
    );
    if (!refund) return null; // already done, or someone else is on it

    const payment = await Payment.findById(refund.payment);
    try {
      if (!payment?.gatewayPaymentId) throw new Error("payment has no gateway payment id");
      const r = await gateway.refund({ paymentId: payment.gatewayPaymentId, amountPaise: refund.amountPaise, receipt: refund.id });
      return Refund.findByIdAndUpdate(refund.id, { status: "processed", gatewayRefundId: r.refundId, processedAt: new Date(), leaseUntil: null, lastError: null }, { new: true });
    } catch (err) {
      const exhausted = refund.attempts >= MAX_REFUND_ATTEMPTS;
      console.error(`Refund ${refund.id} attempt ${refund.attempts} failed`, err);
      return Refund.findByIdAndUpdate(
        refund.id,
        { leaseUntil: null, lastError: (err as Error).message, ...(exhausted ? { status: "failed" } : {}) },
        { new: true },
      );
    }
  }

  /** Admin: try a failed refund again. */
  async function retryRefund(refundId: string) {
    const r = await Refund.findOneAndUpdate({ _id: refundId, status: { $in: ["pending", "failed"] } }, { status: "pending", attempts: 0, leaseUntil: null });
    if (!r) throw new AppError(404, "NOT_FOUND", "No refund to retry.");
    return processRefund(refundId);
  }

  // ---------------------------------------------------------------- cancelling

  /** How much would be refunded if the booking were cancelled now. */
  async function quoteCancellation(bookingId: string, now = new Date()) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError(404, "NOT_FOUND", "Booking not found.");
    const trip = await Trip.findById(booking.trip, { cancellationPolicy: 1, departureAt: 1 });
    if (!trip) throw new AppError(404, "NOT_FOUND", "Trip not found.");

    const hoursLeft = (trip.departureAt.getTime() - now.getTime()) / 3_600_000;
    const rules = [...trip.cancellationPolicy].sort((a, b) => b.hoursBeforeDeparture - a.hoursBeforeDeparture);
    const rule = rules.find((r) => hoursLeft >= r.hoursBeforeDeparture);
    const refundPercent = rule?.refundPercent ?? 0;
    return {
      allowed: booking.status === "confirmed" && hoursLeft > 0,
      hoursLeft: Math.max(0, Math.round(hoursLeft * 10) / 10),
      refundPercent,
      refundPaise: percentOf(booking.pricing.farePaise, refundPercent), // the convenience fee is not refunded
      nonRefundablePaise: booking.pricing.totalPaise - percentOf(booking.pricing.farePaise, refundPercent),
    };
  }

  async function cancelBooking(user: { id: string }, bookingId: string) {
    const booking = await Booking.findOne({ _id: bookingId, user: user.id });
    if (!booking) throw new AppError(404, "NOT_FOUND", "Booking not found.");
    if (booking.status !== "confirmed") throw new AppError(409, "NOT_CANCELLABLE", "Only confirmed bookings can be cancelled.");

    const quote = await quoteCancellation(bookingId);
    if (!quote.allowed) throw new AppError(409, "DEPARTED", "This trip has already departed.");

    // Only one cancel can win (a double tap, or two phones).
    const cancelled = await Booking.findOneAndUpdate(
      { _id: bookingId, status: "confirmed" },
      { status: "cancelled", cancellation: { at: new Date(), by: "customer", reason: "customer_cancelled", refundPercent: quote.refundPercent, refundPaise: quote.refundPaise } },
      { new: true },
    );
    if (!cancelled) throw new AppError(409, "NOT_CANCELLABLE", "This booking was already cancelled.");

    await releaseBookedSeats(String(cancelled.trip), cancelled.id);

    let refund = null;
    if (quote.refundPaise > 0) {
      const payment = await Payment.findOne({ booking: cancelled.id, status: "captured" });
      if (payment) {
        refund = await ensureRefund(cancelled.id, payment.id, "customer_cancelled", quote.refundPaise);
        refund = (await processRefund(refund.id)) ?? refund;
      }
    }
    return { booking: cancelled, refund };
  }

  /** The operator cancelled the whole trip: everyone gets 100% back, including the fee. */
  async function cancelBookingsForTrip(tripId: string) {
    await Booking.updateMany({ trip: tripId, status: "pending_payment" }, { status: "expired" });
    const bookings = await Booking.find({ trip: tripId, status: "confirmed" });
    let cancelled = 0;
    for (const b of bookings) {
      const claimed = await Booking.findOneAndUpdate(
        { _id: b.id, status: "confirmed" },
        { status: "cancelled", cancellation: { at: new Date(), by: "operator", reason: "operator_cancelled", refundPercent: 100, refundPaise: b.pricing.totalPaise } },
        { new: true },
      );
      if (!claimed) continue;
      cancelled++;
      try {
        const payment = await Payment.findOne({ booking: b.id, status: "captured" });
        if (payment) {
          const refund = await ensureRefund(b.id, payment.id, "operator_cancelled", b.pricing.totalPaise);
          await processRefund(refund.id);
        }
      } catch (err) {
        console.error(`Refund for booking ${b.id} will be retried by the reconcile job`, err);
      }
    }
    return cancelled;
  }

  // ---------------------------------------------------------------- background job

  /** Finishes anything that was interrupted. Runs every minute and can be run any time. */
  async function reconcile(now = new Date()) {
    const stats = { finalized: 0, refundsTried: 0, expired: 0, recoveredFromGateway: 0, seatsReleased: 0 };

    // 1. Money captured, but the booking never got finished (crash, or an error after payment).
    const stuck = await Payment.aggregate([
      { $match: { status: "captured", capturedAt: { $lt: new Date(now.getTime() - 30_000) } } },
      { $lookup: { from: Booking.collection.name, localField: "booking", foreignField: "_id", as: "b" } },
      { $match: { "b.status": { $in: ["pending_payment", "expired"] } } },
      { $limit: 50 },
      { $project: { _id: 1 } },
    ]);
    for (const row of stuck) {
      const payment = await Payment.findById(row._id);
      if (payment) {
        await finalizeBooking(payment);
        stats.finalized++;
      }
    }

    // 2. Refunds that did not go through yet.
    const refunds = await Refund.find({ status: "pending", attempts: { $lt: MAX_REFUND_ATTEMPTS }, $or: [{ leaseUntil: null }, { leaseUntil: { $lte: now } }] }).limit(50);
    for (const r of refunds) {
      await processRefund(r.id);
      stats.refundsTried++;
    }

    // 3. Unpaid bookings whose hold ran out. First ask the provider, in case a webhook never arrived.
    const stale = await Booking.find({ status: "pending_payment", holdExpiresAt: { $lt: addMinutes(now, -2) } }).limit(50);
    for (const b of stale) {
      try {
        const payments = await Payment.find({ booking: b.id, status: { $ne: "captured" } });
        let paid = false;
        for (const p of payments) {
          const hit = (await gateway.fetchOrderPayments(p.orderId)).find((x) => x.status === "captured");
          if (hit) {
            await settlePayment({ orderId: p.orderId, paymentId: hit.paymentId, amountPaise: hit.amountPaise });
            stats.recoveredFromGateway++;
            paid = true;
            break;
          }
        }
        if (!paid) {
          const res = await Booking.updateOne({ _id: b.id, status: "pending_payment" }, { status: "expired" });
          stats.expired += res.modifiedCount;
        }
      } catch (err) {
        console.error(`Could not check booking ${b.id} with the payment provider; will retry`, err);
      }
    }

    // 4. Cancelled bookings whose seats were not released (crash between the two steps).
    const recentlyCancelled = await Booking.find({ status: "cancelled", "cancellation.at": { $gt: addMinutes(now, -60) }, "cancellation.by": { $ne: "system" } }, { trip: 1 }).limit(200);
    for (const b of recentlyCancelled) {
      if (await releaseBookedSeats(String(b.trip), b.id)) stats.seatsReleased++;
    }

    return stats;
  }

  /** Runs the reconcile job every minute for as long as the server is up. */
  function startReconciler(everyMs = 60_000) {
    const timer = setInterval(() => {
      reconcile().catch((err) => console.error("Reconcile failed", err));
    }, everyMs);
    timer.unref();
    return () => clearInterval(timer);
  }

  return {
    gateway,
    createBooking,
    settlePayment,
    recordPaymentFailure,
    verifyCheckout,
    quoteCancellation,
    cancelBooking,
    cancelBookingsForTrip,
    processRefund,
    retryRefund,
    reconcile,
    startReconciler,
  };
}

export type BookingService = ReturnType<typeof createBookingService>;
