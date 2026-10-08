import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { Types } from "mongoose";
import { addDays, istDate } from "../src/lib/time.js";
import { Booking } from "../src/models/Booking.js";
import { Payment } from "../src/models/Payment.js";
import { Refund } from "../src/models/Refund.js";
import { Trip } from "../src/models/Trip.js";
import { User } from "../src/models/User.js";
import { setupTestApp } from "./helpers.js";

// 5% extra fee on every booking, so the fee rules (charged, never refunded on cancel) are exercised.
process.env.CONVENIENCE_FEE_PERCENT = "5";

let t: Awaited<ReturnType<typeof setupTestApp>>;
type U = { id: string; token: string };
const state = {} as {
  admin: string; opA: string; opB: string; operatorAId: string;
  tripIds: string[]; ladiesTrip: string; board: string; drop: string; users: U[];
};
let userIdx = 0;
const nextUser = () => state.users[userIdx++];

const FARE = 1000; // rupees per seat
const FARE_PAISE = FARE * 100;
const feeOf = (seats: number) => Math.round(seats * FARE_PAISE * 0.05);
const totalOf = (seats: number) => seats * FARE_PAISE + feeOf(seats);

before(async () => {
  t = await setupTestApp("vanya_test_bookings");
  const { signToken } = await import("../src/modules/auth/auth.service.js");

  state.admin = await t.loginAdmin("9100000001");
  const delhi = (await t.api("/admin/cities", { token: state.admin, body: { name: "Delhi", state: "Delhi" } })).json.city.id;
  const manali = (await t.api("/admin/cities", { token: state.admin, body: { name: "Manali", state: "Himachal Pradesh" } })).json.city.id;
  const p1 = (await t.api("/admin/points", { token: state.admin, body: { city: delhi, name: "Kashmere Gate" } })).json.point.id;
  const p2 = (await t.api("/admin/points", { token: state.admin, body: { city: manali, name: "Manali Stand" } })).json.point.id;

  const mkOperator = async (phone: string, name: string) => {
    const token = (await t.login(phone)).json.token;
    const reg = await t.api("/operator/register", { token, body: { businessName: name } });
    await t.api(`/admin/operators/${reg.json.operator.id}`, { method: "PATCH", token: state.admin, body: { status: "approved" } });
    return { token, id: reg.json.operator.id as string };
  };
  const a = await mkOperator("9100000002", "Booking Test Travels");
  state.opA = a.token;
  state.operatorAId = a.id;
  state.opB = (await mkOperator("9100000003", "Other Travels")).token;

  const bus = (
    await t.api("/operator/buses", {
      token: state.opA,
      body: { name: "Volvo", registrationNumber: "DL01AB1234", ac: true, layout: { preset: { name: "seater_2x2", rows: 10 } } },
    })
  ).json.bus.id;
  const ladiesBus = (
    await t.api("/operator/buses", {
      token: state.opA,
      body: {
        name: "Mini", registrationNumber: "DL01AB9999", ac: false,
        layout: { seats: [
          { no: "W1", deck: "lower", row: 0, col: 0, kind: "seater", ladies: true },
          { no: "G1", deck: "lower", row: 0, col: 1, kind: "seater", ladies: false },
        ] },
      },
    })
  ).json.bus.id;
  const route = (
    await t.api("/operator/routes", {
      token: state.opA,
      body: {
        fromCity: delhi, toCity: manali, distanceKm: 540, durationMinutes: 750,
        boardingPoints: [{ point: p1, offsetMinutes: 0 }], droppingPoints: [{ point: p2, offsetMinutes: 750 }],
      },
    })
  ).json.route.id;

  const start = addDays(istDate(new Date()), 3);
  const gen = await t.api("/operator/trips/generate", {
    token: state.opA, body: { bus, route, fare: FARE, departureTime: "21:30", startDate: start, endDate: addDays(start, 5) },
  });
  state.tripIds = gen.json.tripIds;
  const ladies = await t.api("/operator/trips/generate", {
    token: state.opA, body: { bus: ladiesBus, route, fare: FARE, departureTime: "21:30", startDate: start, endDate: start },
  });
  state.ladiesTrip = ladies.json.tripIds[0];

  const detail = await t.api(`/trips/${state.tripIds[0]}`);
  state.board = detail.json.trip.boardingPoints[0].id;
  state.drop = detail.json.trip.droppingPoints[0].id;

  const docs = await User.insertMany(Array.from({ length: 150 }, (_, i) => ({ phone: `9${String(300000000 + i)}`, role: "customer" })));
  state.users = docs.map((u) => ({ id: u.id, token: signToken(u.id, "customer") }));
});

after(async () => {
  await t.teardown();
});

// ---------- helpers
const NAMES = ["Asha Rao", "Vikram Singh", "Meera Nair", "Dev Patel", "Isha Gupta", "Karan Shah"];

const hold = (u: U, tripId: string, seats: string[]) => t.api(`/trips/${tripId}/hold`, { token: u.token, body: { seats } });

function passengers(seats: string[], gender: "male" | "female" | "other" = "male") {
  return seats.map((seatNo, i) => ({ seatNo, name: NAMES[i % NAMES.length], age: 30 + i, gender }));
}

/** Holds the seats and creates the booking. Returns the booking response. */
async function book(u: U, tripId: string, seats: string[], extra: Record<string, unknown> = {}) {
  const h = await hold(u, tripId, seats);
  assert.equal(h.status, 200, `hold failed: ${JSON.stringify(h.json)}`);
  return t.api("/bookings", {
    token: u.token,
    body: { tripId, boardingPointId: state.board, droppingPointId: state.drop, passengers: passengers(seats), ...extra },
  });
}

const captureEvent = (orderId: string, p: { paymentId: string; amountPaise: number }, event = "payment.captured") => ({
  event,
  payload: { payment: { entity: { id: p.paymentId, order_id: orderId, amount: p.amountPaise, status: "captured" } } },
});

/** The customer pays and the provider tells us (webhook). */
async function pay(orderId: string, opts?: { amountPaise?: number }) {
  const p = t.gateway.simulatePayment(orderId, opts);
  const r = await t.webhook(captureEvent(orderId, p));
  return { p, r };
}

const seatsOf = async (tripId: string) =>
  (await Trip.collection.findOne({ _id: new Types.ObjectId(tripId) }))!.seats as { no: string; status: string; bookingId?: Types.ObjectId; heldUntil?: Date }[];
const seat = async (tripId: string, no: string) => (await seatsOf(tripId)).find((s) => s.no === no)!;

async function expireHold(tripId: string, no: string) {
  await Trip.collection.updateOne({ _id: new Types.ObjectId(tripId), "seats.no": no }, { $set: { "seats.$.heldUntil": new Date(Date.now() - 1000) } });
}

const get = (u: U, id: string) => t.api(`/bookings/${id}`, { token: u.token });

// ---------- creating a booking

describe("creating a booking", () => {
  test("needs a hold first", async () => {
    const u = nextUser();
    const r = await t.api("/bookings", {
      token: u.token,
      body: { tripId: state.tripIds[0], boardingPointId: state.board, droppingPointId: state.drop, passengers: passengers(["1A"]) },
    });
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "NO_HOLD");
  });

  test("creates a pending booking and a payment order with the right amounts", async () => {
    const u = nextUser();
    const r = await book(u, state.tripIds[0], ["1A", "1B"]);
    assert.equal(r.status, 201);
    const b = r.json.booking;
    assert.equal(b.status, "pending_payment");
    assert.match(b.pnr, /^[A-HJ-NP-Z2-9]{8}$/);
    assert.equal(b.pricing.farePaise, 2 * FARE_PAISE);
    assert.equal(b.pricing.convenienceFeePaise, feeOf(2));
    assert.equal(b.pricing.totalPaise, totalOf(2));
    assert.equal(b.commission, undefined, "customers never see the platform's commission");
    assert.deepEqual(b.passengers.map((p: any) => p.seatNo), ["1A", "1B"]);
    assert.equal(b.contact.phone.length, 10);

    assert.equal(r.json.payment.amountPaise, totalOf(2));
    assert.equal(r.json.payment.currency, "INR");
    assert.equal(r.json.payment.keyId, "mock_key_id");
    assert.match(r.json.payment.orderId, /^order_mock_/);

    assert.equal((await seat(state.tripIds[0], "1A")).status, "held", "seats stay held until payment");
    const mine = await get(u, b.id);
    assert.equal(mine.json.payment.status, "created");
  });

  test("passengers must match the held seats exactly", async () => {
    const u = nextUser();
    await hold(u, state.tripIds[0], ["2A", "2B"]);
    const body = (ps: any) => ({ tripId: state.tripIds[0], boardingPointId: state.board, droppingPointId: state.drop, passengers: ps });
    const fewer = await t.api("/bookings", { token: u.token, body: body(passengers(["2A"])) });
    assert.equal(fewer.status, 409);
    assert.equal(fewer.json.error.code, "HOLD_MISMATCH");
    const other = await t.api("/bookings", { token: u.token, body: body(passengers(["2A", "2C"])) });
    assert.equal(other.status, 409);
  });

  test("validates passenger details, points and contact", async () => {
    const u = nextUser();
    await hold(u, state.tripIds[0], ["3A"]);
    const base = { tripId: state.tripIds[0], boardingPointId: state.board, droppingPointId: state.drop };
    const post = (b: object) => t.api("/bookings", { token: u.token, body: b });

    assert.equal((await post({ ...base, passengers: [{ seatNo: "3A", name: "X", age: 30, gender: "male" }] })).status, 400);
    assert.equal((await post({ ...base, passengers: [{ seatNo: "3A", name: "Asha Rao", age: 0, gender: "male" }] })).status, 400);
    assert.equal((await post({ ...base, passengers: [{ seatNo: "3A", name: "Asha Rao", age: 30, gender: "robot" }] })).status, 400);
    assert.equal((await post({ ...base, passengers: [{ seatNo: "3A", name: "<script>", age: 30, gender: "male" }] })).status, 400);
    assert.equal((await post({ ...base, passengers: passengers(["3A"]), contactPhone: "12345" })).status, 400);
    assert.equal((await post({ ...base, passengers: passengers(["3A"]), contactEmail: "nope" })).status, 400);

    const wrongPoint = await post({ ...base, boardingPointId: "aaaaaaaaaaaaaaaaaaaaaaaa", passengers: passengers(["3A"]) });
    assert.equal(wrongPoint.status, 400);
    assert.equal(wrongPoint.json.error.code, "INVALID_POINT");

    assert.equal((await t.api("/bookings", { body: { ...base, passengers: passengers(["3A"]) } })).status, 401);
  });

  test("a women-only seat needs a female passenger", async () => {
    const u = nextUser();
    await hold(u, state.ladiesTrip, ["W1"]);
    const body = (gender: "male" | "female") => ({
      tripId: state.ladiesTrip, boardingPointId: state.board, droppingPointId: state.drop, passengers: passengers(["W1"], gender),
    });
    const male = await t.api("/bookings", { token: u.token, body: body("male") });
    assert.equal(male.status, 400);
    assert.equal(male.json.error.code, "LADIES_SEAT");
    assert.equal((await t.api("/bookings", { token: u.token, body: body("female") })).status, 201);
  });

  test("a hold that is about to run out is too late to book", async () => {
    const u = nextUser();
    await hold(u, state.tripIds[0], ["4A"]);
    await Trip.collection.updateOne({ _id: new Types.ObjectId(state.tripIds[0]), "seats.no": "4A" }, { $set: { "seats.$.heldUntil": new Date(Date.now() + 20_000) } });
    const r = await t.api("/bookings", {
      token: u.token,
      body: { tripId: state.tripIds[0], boardingPointId: state.board, droppingPointId: state.drop, passengers: passengers(["4A"]) },
    });
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "HOLD_EXPIRING");
  });

  test("trying again replaces the earlier unpaid booking", async () => {
    const u = nextUser();
    const first = await book(u, state.tripIds[0], ["5A"]);
    const second = await t.api("/bookings", {
      token: u.token,
      body: { tripId: state.tripIds[0], boardingPointId: state.board, droppingPointId: state.drop, passengers: passengers(["5A"]) },
    });
    assert.equal(second.status, 201);
    assert.notEqual(second.json.booking.id, first.json.booking.id);
    assert.equal((await Booking.findById(first.json.booking.id))!.status, "expired");
    assert.notEqual(second.json.payment.orderId, first.json.payment.orderId);
  });

  test("if the payment provider is down, no booking is left behind and the seats stay held", async () => {
    const u = nextUser();
    await hold(u, state.tripIds[0], ["6A"]);
    t.gateway.failOrders = true;
    const r = await t.api("/bookings", {
      token: u.token,
      body: { tripId: state.tripIds[0], boardingPointId: state.board, droppingPointId: state.drop, passengers: passengers(["6A"]) },
    });
    t.gateway.failOrders = false;
    assert.equal(r.status, 502);
    assert.equal(r.json.error.code, "PAYMENT_UNAVAILABLE");
    assert.equal(await Booking.countDocuments({ user: u.id }), 0);
    assert.equal((await t.api(`/trips/${state.tripIds[0]}/hold`, { token: u.token })).json.hold.seats.length, 1);
  });

  test("customers only see their own bookings", async () => {
    const a = nextUser();
    const b = nextUser();
    const made = await book(a, state.tripIds[0], ["7A"]);
    assert.equal((await get(b, made.json.booking.id)).status, 404);
    assert.equal((await t.api("/bookings", { token: b.token })).json.items.length, 0);
    const mine = await t.api("/bookings?status=pending_payment", { token: a.token });
    assert.equal(mine.json.items.length, 1);
    assert.equal((await get(a, "not-an-id")).status, 404);
  });
});

// ---------- paying

describe("paying", () => {
  test("a captured payment confirms the booking and books the seats", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[1], ["1A", "1B"]);
    const { r } = await pay(made.json.payment.orderId);
    assert.equal(r.status, 200);

    const mine = await get(u, made.json.booking.id);
    assert.equal(mine.json.booking.status, "confirmed");
    assert.ok(mine.json.booking.confirmedAt);
    assert.equal(mine.json.payment.status, "captured");
    for (const no of ["1A", "1B"]) {
      const s = await seat(state.tripIds[1], no);
      assert.equal(s.status, "booked");
      assert.equal(String(s.bookingId), made.json.booking.id);
    }
    assert.equal(t.gateway.refunds.length, 0);

    // The platform's cut: 10% of the fare (not of the fee), the rest goes to the operator.
    const admin = await t.api(`/admin/bookings/${made.json.booking.id}`, { token: state.admin });
    assert.equal(admin.json.booking.commission.paise, 20_000);
    assert.equal(admin.json.booking.commission.operatorEarningPaise, 180_000);
  });

  test("a forged webhook is rejected and changes nothing", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[1], ["2A"]);
    const p = t.gateway.simulatePayment(made.json.payment.orderId);
    const r = await t.webhook(captureEvent(made.json.payment.orderId, p), { signature: "0".repeat(64) });
    assert.equal(r.status, 401);
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "pending_payment");
    assert.equal((await Payment.findById(made.json.payment.paymentId))!.status, "created");
  });

  test("the same webhook delivered many times at once confirms once and refunds nothing", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[1], ["3A", "3B"]);
    const orderId = made.json.payment.orderId;
    const p = t.gateway.simulatePayment(orderId);
    const results = await Promise.all(Array.from({ length: 8 }, () => t.webhook(captureEvent(orderId, p))));

    assert.ok(results.every((r) => r.status === 200));
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "confirmed");
    assert.equal(await Booking.countDocuments({ _id: made.json.booking.id, status: "confirmed" }), 1);
    assert.equal(await Refund.countDocuments({ booking: made.json.booking.id }), 0);
    assert.equal((await seat(state.tripIds[1], "3A")).status, "booked");
  });

  test("the app's own confirmation works, and a wrong signature does not", async () => {
    const u = nextUser();
    const other = nextUser();
    const made = await book(u, state.tripIds[1], ["4A"]);
    const orderId = made.json.payment.orderId;
    const id = made.json.booking.id;

    const early = t.gateway.checkoutSignature(orderId, "pay_not_made_yet");
    const unpaid = await t.api(`/bookings/${id}/verify-payment`, { token: u.token, body: { orderId, paymentId: "pay_not_made_yet", signature: early } });
    assert.equal(unpaid.status, 200);
    assert.equal(unpaid.json.confirmed, false, "the provider has no such payment, so nothing is confirmed");

    const p = t.gateway.simulatePayment(orderId);
    const bad = await t.api(`/bookings/${id}/verify-payment`, { token: u.token, body: { orderId, paymentId: p.paymentId, signature: "bad" } });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error.code, "BAD_SIGNATURE");

    const stranger = await t.api(`/bookings/${id}/verify-payment`, {
      token: other.token, body: { orderId, paymentId: p.paymentId, signature: t.gateway.checkoutSignature(orderId, p.paymentId) },
    });
    assert.equal(stranger.status, 404);

    const ok = await t.api(`/bookings/${id}/verify-payment`, {
      token: u.token, body: { orderId, paymentId: p.paymentId, signature: t.gateway.checkoutSignature(orderId, p.paymentId) },
    });
    assert.equal(ok.json.confirmed, true);
    assert.equal(ok.json.booking.status, "confirmed");
  });

  test("the app's confirmation and the webhook arriving together confirm once", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[1], ["5A"]);
    const orderId = made.json.payment.orderId;
    const p = t.gateway.simulatePayment(orderId);
    const [a, b] = await Promise.all([
      t.api(`/bookings/${made.json.booking.id}/verify-payment`, { token: u.token, body: { orderId, paymentId: p.paymentId, signature: t.gateway.checkoutSignature(orderId, p.paymentId) } }),
      t.webhook(captureEvent(orderId, p)),
    ]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "confirmed");
    assert.equal(await Refund.countDocuments({ booking: made.json.booking.id }), 0);
  });

  test("a failed attempt is recorded, and a later successful payment on the same order still works", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[1], ["6A"]);
    const orderId = made.json.payment.orderId;
    const failed = t.gateway.simulatePayment(orderId, { status: "failed" });
    await t.webhook({ event: "payment.failed", payload: { payment: { entity: { id: failed.paymentId, order_id: orderId, error_description: "Card declined" } } } });
    const mid = await Payment.findById(made.json.payment.paymentId);
    assert.equal(mid!.status, "failed");
    assert.equal(mid!.failureReason, "Card declined");
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "pending_payment");

    await pay(orderId);
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "confirmed");
    assert.equal((await Payment.findById(made.json.payment.paymentId))!.status, "captured");
  });

  test("a payment for the wrong amount is never confirmed; it is flagged for a person", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[1], ["7A"]);
    await pay(made.json.payment.orderId, { amountPaise: 100 });
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "pending_payment");
    const flagged = await t.api("/admin/payments/needs-review", { token: state.admin });
    assert.ok(flagged.json.items.some((p: any) => p.orderId === made.json.payment.orderId));
  });

  test("the development shortcut pays an order with the fake gateway", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[1], ["8A"]);
    const r = await t.api(`/dev/payments/${made.json.payment.orderId}/pay`, { method: "POST", body: {} });
    assert.equal(r.status, 200);
    assert.equal(r.json.booking.status, "confirmed");
    assert.equal((await t.api("/dev/payments/order_nope/pay", { method: "POST", body: {} })).status, 404);
  });

  test("unknown orders and unknown events are acknowledged and ignored", async () => {
    const r1 = await t.webhook(captureEvent("order_does_not_exist", { paymentId: "pay_x", amountPaise: 100 }));
    assert.equal(r1.status, 200);
    const r2 = await t.webhook({ event: "refund.created", payload: {} });
    assert.equal(r2.status, 200);
  });
});

// ---------- late payments and recovery

describe("late payments and crash recovery", () => {
  test("paid just after the hold ended, seats still free: the booking is confirmed", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[2], ["1A"]);
    await expireHold(state.tripIds[2], "1A");
    await pay(made.json.payment.orderId);
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "confirmed");
    assert.equal((await seat(state.tripIds[2], "1A")).status, "booked");
  });

  test("paid after the hold ended and someone else took the seat: automatic full refund", async () => {
    const a = nextUser();
    const b = nextUser();
    const made = await book(a, state.tripIds[2], ["2A"]);
    await expireHold(state.tripIds[2], "2A");
    const theirs = await book(b, state.tripIds[2], ["2A"]); // b now legitimately holds it
    assert.equal(theirs.status, 201);

    const before = t.gateway.refunds.length;
    await pay(made.json.payment.orderId);

    const lost = (await Booking.findById(made.json.booking.id))!;
    assert.equal(lost.status, "cancelled");
    assert.equal(lost.cancellation!.reason, "seats_unavailable");
    assert.equal(lost.cancellation!.refundPaise, totalOf(1));
    const refund = await Refund.findOne({ booking: made.json.booking.id });
    assert.equal(refund!.status, "processed");
    assert.equal(refund!.amountPaise, totalOf(1));
    assert.equal(t.gateway.refunds.length, before + 1);
    assert.equal(t.gateway.refunds.at(-1)!.amountPaise, totalOf(1));

    // The other customer's booking is untouched and can still be paid for.
    await pay(theirs.json.payment.orderId);
    assert.equal((await Booking.findById(theirs.json.booking.id))!.status, "confirmed");
  });

  test("paid after the operator cancelled the trip: automatic full refund", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[2], ["3A"]);
    await t.api(`/operator/trips/${state.tripIds[2]}/cancel`, { method: "POST", token: state.opA, body: {} });
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "expired");

    await pay(made.json.payment.orderId);
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "cancelled");
    assert.equal((await Refund.findOne({ booking: made.json.booking.id }))!.status, "processed");
  });

  test("two payments for one seat: only one booking wins and the other is refunded", async () => {
    const a = nextUser();
    const b = nextUser();
    const first = await book(a, state.tripIds[3], ["1A"]);
    await expireHold(state.tripIds[3], "1A");
    const second = await book(b, state.tripIds[3], ["1A"]);
    await Promise.all([pay(first.json.payment.orderId), pay(second.json.payment.orderId)]);

    const statuses = [(await Booking.findById(first.json.booking.id))!.status, (await Booking.findById(second.json.booking.id))!.status].sort();
    assert.deepEqual(statuses, ["cancelled", "confirmed"]);
    assert.equal(await Refund.countDocuments({ booking: { $in: [first.json.booking.id, second.json.booking.id] } }), 1);
    const s = await seat(state.tripIds[3], "1A");
    assert.equal(s.status, "booked");
    const winner = (await Booking.findOne({ _id: { $in: [first.json.booking.id, second.json.booking.id] }, status: "confirmed" }))!;
    assert.equal(String(s.bookingId), winner.id);
  });

  test("reconcile finishes a booking whose payment was captured but never finalised", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[3], ["2A"]);
    // Simulate a crash right after the payment was recorded.
    await Payment.updateOne(
      { _id: made.json.payment.paymentId },
      { status: "captured", gatewayPaymentId: "pay_crashed_1", capturedAt: new Date(Date.now() - 5 * 60_000) },
    );
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "pending_payment");
    const stats = await t.bookings.reconcile();
    assert.ok(stats.finalized >= 1);
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "confirmed");
    assert.equal(await Refund.countDocuments({ booking: made.json.booking.id }), 0);
  });

  test("a crash after the seats were booked is not mistaken for 'seats gone' (no wrong refund)", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[3], ["3A"]);
    const { confirmSeats } = await import("../src/modules/trips/seatHold.js");
    assert.equal(await confirmSeats(state.tripIds[3], u.id, ["3A"], made.json.booking.id), true);
    await Payment.updateOne(
      { _id: made.json.payment.paymentId },
      { status: "captured", gatewayPaymentId: "pay_crashed_2", capturedAt: new Date(Date.now() - 5 * 60_000) },
    );
    // Seats are booked, the booking still says pending. Finish it.
    await t.bookings.reconcile();
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "confirmed");
    assert.equal(await Refund.countDocuments({ booking: made.json.booking.id }), 0);
  });

  test("reconcile recovers a payment whose webhook never arrived", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[3], ["4A"]);
    t.gateway.simulatePayment(made.json.payment.orderId); // paid, but no webhook and no app callback
    await Booking.updateOne({ _id: made.json.booking.id }, { holdExpiresAt: new Date(Date.now() - 10 * 60_000) });
    await expireHold(state.tripIds[3], "4A");

    const stats = await t.bookings.reconcile();
    assert.ok(stats.recoveredFromGateway >= 1);
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "confirmed");
  });

  test("reconcile expires unpaid bookings once their hold is long gone", async () => {
    const u = nextUser();
    const made = await book(u, state.tripIds[3], ["5A"]);
    await Booking.updateOne({ _id: made.json.booking.id }, { holdExpiresAt: new Date(Date.now() - 10 * 60_000) });
    const stats = await t.bookings.reconcile();
    assert.ok(stats.expired >= 1);
    assert.equal((await Booking.findById(made.json.booking.id))!.status, "expired");
    // A fresh unpaid booking is left alone.
    const fresh = await book(nextUser(), state.tripIds[3], ["6A"]);
    await t.bookings.reconcile();
    assert.equal((await Booking.findById(fresh.json.booking.id))!.status, "pending_payment");
  });
});

// ---------- cancelling

async function confirmed(tripId: string, seats: string[], u = nextUser()) {
  const made = await book(u, tripId, seats);
  await pay(made.json.payment.orderId);
  assert.equal((await Booking.findById(made.json.booking.id))!.status, "confirmed");
  return { u, id: made.json.booking.id as string, orderId: made.json.payment.orderId as string };
}

const departIn = (tripId: string, hours: number) =>
  Trip.updateOne({ _id: tripId }, { departureAt: new Date(Date.now() + hours * 3_600_000), arrivalAt: new Date(Date.now() + (hours + 12) * 3_600_000) });

describe("cancelling a booking", () => {
  test("90% of the fare is refunded a day ahead; the fee is not; the seats are freed", async () => {
    const c = await confirmed(state.tripIds[4], ["1A", "1B"]);
    const quote = await t.api(`/bookings/${c.id}/cancellation-quote`, { token: c.u.token });
    assert.equal(quote.json.quote.refundPercent, 90);
    assert.equal(quote.json.quote.refundPaise, 180_000 * 1); // 90% of 2 x 1000 rupees = 1800 rupees
    assert.equal(quote.json.quote.nonRefundablePaise, totalOf(2) - 180_000);

    const r = await t.api(`/bookings/${c.id}/cancel`, { method: "POST", token: c.u.token, body: {} });
    assert.equal(r.status, 200);
    assert.equal(r.json.booking.status, "cancelled");
    assert.equal(r.json.refund.amountPaise, 180_000);
    assert.equal(r.json.refund.status, "processed");
    assert.equal(t.gateway.refunds.at(-1)!.amountPaise, 180_000);

    for (const no of ["1A", "1B"]) assert.equal((await seat(state.tripIds[4], no)).status, "available");
    // And someone else can book those seats now.
    assert.equal((await hold(nextUser(), state.tripIds[4], ["1A"])).status, 200);
  });

  test("a double tap or two phones cancel only once, and refund only once", async () => {
    const c = await confirmed(state.tripIds[4], ["2A"]);
    const before = t.gateway.refunds.length;
    const results = await Promise.all(Array.from({ length: 4 }, () => t.api(`/bookings/${c.id}/cancel`, { method: "POST", token: c.u.token, body: {} })));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.ok(results.filter((r) => r.status !== 200).every((r) => r.status === 409));
    assert.equal(await Refund.countDocuments({ booking: c.id }), 1);
    assert.equal(t.gateway.refunds.length, before + 1);
  });

  test("the refund shrinks as departure gets closer, and is nothing at the end", async () => {
    const cases: [hours: number, percent: number][] = [[30, 90], [13, 60], [5, 30], [2, 0]];
    for (const [i, [hours, percent]] of cases.entries()) {
      const c = await confirmed(state.tripIds[4], [`${3 + i}A`]);
      await departIn(state.tripIds[4], hours);
      const quote = await t.api(`/bookings/${c.id}/cancellation-quote`, { token: c.u.token });
      assert.equal(quote.json.quote.refundPercent, percent, `${hours}h before departure`);
      const before = t.gateway.refunds.length;
      const r = await t.api(`/bookings/${c.id}/cancel`, { method: "POST", token: c.u.token, body: {} });
      assert.equal(r.status, 200);
      assert.equal(r.json.booking.cancellation.refundPaise, Math.round((FARE_PAISE * percent) / 100));
      assert.equal(t.gateway.refunds.length, before + (percent > 0 ? 1 : 0), "no gateway call when nothing is refunded");
      if (percent > 0) assert.equal(r.json.refund.status, "processed");
      else assert.equal(r.json.refund, null);
    }
  });

  test("cannot cancel after departure, someone else's booking, or an unpaid booking", async () => {
    const c = await confirmed(state.tripIds[4], ["8A"]);
    await departIn(state.tripIds[4], -1);
    const late = await t.api(`/bookings/${c.id}/cancel`, { method: "POST", token: c.u.token, body: {} });
    assert.equal(late.status, 409);
    assert.equal(late.json.error.code, "DEPARTED");

    const other = nextUser();
    assert.equal((await t.api(`/bookings/${c.id}/cancel`, { method: "POST", token: other.token, body: {} })).status, 404);

    await departIn(state.tripIds[4], 48);
    const unpaid = await book(nextUser(), state.tripIds[4], ["9A"]);
    const u = state.users[userIdx - 1];
    const r = await t.api(`/bookings/${unpaid.json.booking.id}/cancel`, { method: "POST", token: u.token, body: {} });
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "NOT_CANCELLABLE");
  });

  test("if the refund fails it is kept and retried by the reconcile job, then by an admin", async () => {
    await departIn(state.tripIds[5], 72);
    const c = await confirmed(state.tripIds[5], ["1A"]);
    t.gateway.failRefunds = true;
    const r = await t.api(`/bookings/${c.id}/cancel`, { method: "POST", token: c.u.token, body: {} });
    assert.equal(r.status, 200, "the cancellation itself succeeds");
    assert.equal(r.json.refund.status, "pending");

    let refund = (await Refund.findOne({ booking: c.id }))!;
    assert.equal(refund.status, "pending");
    assert.ok(refund.lastError);

    // The gateway recovers: the next reconcile run sends it.
    t.gateway.failRefunds = false;
    await t.bookings.reconcile();
    refund = (await Refund.findOne({ booking: c.id }))!;
    assert.equal(refund.status, "processed");
    assert.ok(refund.gatewayRefundId);

    // A refund that keeps failing is parked as "failed" so an admin sees it, and can retry it.
    const c2 = await confirmed(state.tripIds[5], ["2A"]);
    t.gateway.failRefunds = true;
    await t.api(`/bookings/${c2.id}/cancel`, { method: "POST", token: c2.u.token, body: {} });
    for (let i = 0; i < 8; i++) {
      await Refund.updateOne({ booking: c2.id }, { leaseUntil: null });
      await t.bookings.reconcile();
    }
    const stuck = (await Refund.findOne({ booking: c2.id }))!;
    assert.equal(stuck.status, "failed");
    const listed = await t.api("/admin/refunds?status=failed", { token: state.admin });
    assert.ok(listed.json.items.some((x: any) => x.id === stuck.id));

    t.gateway.failRefunds = false;
    const retry = await t.api(`/admin/refunds/${stuck.id}/retry`, { method: "POST", token: state.admin, body: {} });
    assert.equal(retry.status, 200);
    assert.equal((await Refund.findById(stuck.id))!.status, "processed");
  });

  test("reconcile releases seats of a cancelled booking if the server stopped halfway", async () => {
    const c = await confirmed(state.tripIds[5], ["3A"]);
    // Cancelled in the database, but the seat was never released (crash between the two steps).
    await Booking.updateOne({ _id: c.id }, { status: "cancelled", cancellation: { at: new Date(), by: "customer", reason: "customer_cancelled", refundPercent: 0, refundPaise: 0 } });
    assert.equal((await seat(state.tripIds[5], "3A")).status, "booked");
    const stats = await t.bookings.reconcile();
    assert.ok(stats.seatsReleased >= 1);
    assert.equal((await seat(state.tripIds[5], "3A")).status, "available");
  });
});

// ---------- the ticket

describe("the ticket", () => {
  test("a confirmed booking has a full ticket with a QR text; other people and unpaid bookings do not", async () => {
    const c = await confirmed(state.tripIds[5], ["10A", "10B"]);
    const r = await t.api(`/bookings/${c.id}/ticket`, { token: c.u.token });
    assert.equal(r.status, 200);
    const k = r.json.ticket;
    assert.equal(k.status, "confirmed");
    assert.match(k.pnr, /^[A-HJ-NP-Z2-9]{8}$/);
    assert.equal(k.qrText, `VANYA:${k.pnr}`);
    assert.equal(k.from, "Delhi");
    assert.equal(k.to, "Manali");
    assert.equal(k.operatorName, "Booking Test Travels");
    assert.equal(k.boardingPoint.name, "Kashmere Gate");
    assert.equal(k.droppingPoint.name, "Manali Stand");
    assert.deepEqual(k.passengers.map((p: any) => p.seatNo), ["10A", "10B"]);
    assert.equal(k.pricing.totalPaise, totalOf(2));
    assert.equal(k.durationMinutes, 750);
    assert.ok(k.cancellationPolicy.length > 0);
    assert.equal(k.cancellation, null);
    assert.equal(k.pricing.commission, undefined);

    assert.equal((await t.api(`/bookings/${c.id}/ticket`, { token: nextUser().token })).status, 404);
    assert.equal((await t.api(`/bookings/${c.id}/ticket`)).status, 401);

    const unpaid = await book(nextUser(), state.tripIds[5], ["10C"]);
    const owner = state.users[userIdx - 1];
    const none = await t.api(`/bookings/${unpaid.json.booking.id}/ticket`, { token: owner.token });
    assert.equal(none.status, 409);
    assert.equal(none.json.error.code, "NO_TICKET");
  });

  test("after cancelling, the ticket still opens and shows it as cancelled with the refund", async () => {
    const c = await confirmed(state.tripIds[5], ["4A"]);
    await t.api(`/bookings/${c.id}/cancel`, { method: "POST", token: c.u.token, body: {} });
    const r = await t.api(`/bookings/${c.id}/ticket`, { token: c.u.token });
    assert.equal(r.status, 200);
    assert.equal(r.json.ticket.status, "cancelled");
    assert.equal(r.json.ticket.cancellation.by, "customer");
    assert.equal(r.json.ticket.cancellation.refundPaise, 90_000);
  });
});

// ---------- operator and admin

describe("operator cancels a trip, manifest, admin", () => {
  test("the passenger list shows confirmed passengers only", async () => {
    const trip = state.tripIds[0];
    const a = await confirmed(trip, ["10A", "10B"]);
    const pending = await book(nextUser(), trip, ["10C"]);
    assert.equal(pending.status, 201);

    const m = await t.api(`/operator/trips/${trip}/manifest`, { token: state.opA });
    assert.equal(m.status, 200);
    const seats = m.json.passengers.map((p: any) => p.seatNo);
    assert.ok(seats.includes("10A") && seats.includes("10B"));
    assert.ok(!seats.includes("10C"), "unpaid seats are not on the manifest");
    const first = m.json.passengers.find((p: any) => p.seatNo === "10A");
    assert.equal(first.boardingPoint, "Kashmere Gate");
    assert.ok(first.pnr && first.phone && first.name);
    assert.ok(a.id);

    assert.equal((await t.api(`/operator/trips/${trip}/manifest`, { token: state.opB })).status, 404);
  });

  test("cancelling a trip cancels every booking and refunds everyone in full, fee included", async () => {
    const trip = state.tripIds[0];
    // tripIds[0] already has confirmed bookings from the tests above; add two known ones.
    const x = await confirmed(trip, ["9B"]);
    const y = await confirmed(trip, ["9C"]);
    const pending = await book(nextUser(), trip, ["9D"]);
    const confirmedBefore = await Booking.countDocuments({ trip, status: "confirmed" });
    const refundsBefore = t.gateway.refunds.length;

    const r = await t.api(`/operator/trips/${trip}/cancel`, { method: "POST", token: state.opA, body: {} });
    assert.equal(r.status, 200);
    assert.equal(r.json.bookingsCancelled, confirmedBefore);

    for (const c of [x, y]) {
      const b = (await Booking.findById(c.id))!;
      assert.equal(b.status, "cancelled");
      assert.equal(b.cancellation!.by, "operator");
      assert.equal(b.cancellation!.refundPaise, totalOf(1), "the fee is refunded too");
      assert.equal((await Refund.findOne({ booking: c.id }))!.status, "processed");
    }
    assert.equal((await Booking.findById(pending.json.booking.id))!.status, "expired");
    assert.equal(t.gateway.refunds.length, refundsBefore + confirmedBefore);
    assert.equal(await Booking.countDocuments({ trip, status: "confirmed" }), 0);

    const again = await t.api(`/operator/trips/${trip}/cancel`, { method: "POST", token: state.opA, body: {} });
    assert.equal(again.status, 409);
  });

  test("admins can list and inspect bookings; other roles cannot", async () => {
    const list = await t.api("/admin/bookings?status=confirmed", { token: state.admin });
    assert.equal(list.status, 200);
    assert.ok(list.json.total >= 1);
    assert.ok(list.json.items.every((b: any) => b.status === "confirmed"));

    const one = list.json.items[0];
    const detail = await t.api(`/admin/bookings/${one.id}`, { token: state.admin });
    assert.equal(detail.json.booking.pnr, one.pnr);
    assert.ok(detail.json.payments.length >= 1);

    const byPnr = await t.api(`/admin/bookings?pnr=${one.pnr.slice(0, 4)}`, { token: state.admin });
    assert.ok(byPnr.json.items.some((b: any) => b.pnr === one.pnr));

    assert.equal((await t.api("/admin/bookings", { token: state.opA })).status, 403);
    assert.equal((await t.api("/admin/bookings", { token: nextUser().token })).status, 403);
    assert.equal((await t.api("/admin/refunds", { token: state.opA })).status, 403);
  });
});
