import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { Types } from "mongoose";
import { addDays, istDate } from "../src/lib/time.js";
import { Trip } from "../src/models/Trip.js";
import { User } from "../src/models/User.js";
import { setupTestApp } from "./helpers.js";

let t: Awaited<ReturnType<typeof setupTestApp>>;
let eng: typeof import("../src/modules/trips/seatHold.js"); // loaded after the test database is chosen
let signToken: typeof import("../src/modules/auth/auth.service.js")["signToken"];

const FARE = 1000;
const state = {} as { tripIds: string[]; users: { id: string; token: string }[] };
const bookingId = () => new Types.ObjectId().toString();

before(async () => {
  t = await setupTestApp("vanya_test_holds");
  eng = await import("../src/modules/trips/seatHold.js");
  signToken = (await import("../src/modules/auth/auth.service.js")).signToken;

  // An approved operator with one bus, one route and six trips.
  const admin = await t.loginAdmin("9100000001");
  const delhi = (await t.api("/admin/cities", { token: admin, body: { name: "Delhi", state: "Delhi" } })).json.city.id;
  const manali = (await t.api("/admin/cities", { token: admin, body: { name: "Manali", state: "Himachal Pradesh" } })).json.city.id;
  const p1 = (await t.api("/admin/points", { token: admin, body: { city: delhi, name: "Kashmere Gate" } })).json.point.id;
  const p2 = (await t.api("/admin/points", { token: admin, body: { city: manali, name: "Manali Stand" } })).json.point.id;

  const op = (await t.login("9100000002")).json.token;
  const reg = await t.api("/operator/register", { token: op, body: { businessName: "Hold Test Travels" } });
  await t.api(`/admin/operators/${reg.json.operator.id}`, { method: "PATCH", token: admin, body: { status: "approved" } });

  const bus = (
    await t.api("/operator/buses", {
      token: op,
      body: { name: "Volvo", registrationNumber: "DL01AB1234", ac: true, layout: { preset: { name: "seater_2x2", rows: 10 } } },
    })
  ).json.bus.id;
  const route = (
    await t.api("/operator/routes", {
      token: op,
      body: {
        fromCity: delhi, toCity: manali, distanceKm: 540, durationMinutes: 750,
        boardingPoints: [{ point: p1, offsetMinutes: 0 }], droppingPoints: [{ point: p2, offsetMinutes: 750 }],
      },
    })
  ).json.route.id;

  const start = addDays(istDate(new Date()), 3);
  const gen = await t.api("/operator/trips/generate", {
    token: op, body: { bus, route, fare: FARE, departureTime: "21:30", startDate: start, endDate: addDays(start, 5) },
  });
  assert.equal(gen.json.created, 6);
  state.tripIds = gen.json.tripIds;

  // Many customers, created directly so tests do not need an OTP each.
  const docs = await User.insertMany(Array.from({ length: 60 }, (_, i) => ({ phone: `9${String(200000000 + i)}`, role: "customer" })));
  state.users = docs.map((u) => ({ id: u.id, token: signToken(u.id, "customer") }));
});

after(async () => {
  await t.teardown();
});

const hold = (u: { token: string }, tripId: string, seats: string[]) =>
  t.api(`/trips/${tripId}/hold`, { token: u.token, body: { seats } });

// Puts every seat of a trip back to available.
async function reset(tripId: string) {
  await Trip.collection.updateOne(
    { _id: new Types.ObjectId(tripId) },
    { $set: { "seats.$[].status": "available" }, $unset: { "seats.$[].heldBy": "", "seats.$[].heldUntil": "", "seats.$[].bookingId": "" } },
  );
}

async function seatsOf(tripId: string) {
  const trip = await Trip.collection.findOne({ _id: new Types.ObjectId(tripId) });
  return trip!.seats as { no: string; status: string; heldBy?: Types.ObjectId; heldUntil?: Date; bookingId?: Types.ObjectId }[];
}

describe("holding seats", () => {
  test("a hold lasts 10 minutes, prices the seats, and shows on the public seat map", async () => {
    const [a] = state.users;
    const r = await hold(a, state.tripIds[0], ["1A", "1B"]);
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.hold.seats.map((s: any) => s.no).sort(), ["1A", "1B"]);
    assert.equal(r.json.hold.totalPrice, 2 * FARE);
    assert.ok(r.json.hold.expiresInSeconds >= 595 && r.json.hold.expiresInSeconds <= 600, `got ${r.json.hold.expiresInSeconds}`);

    const detail = await t.api(`/trips/${state.tripIds[0]}`);
    const byNo = Object.fromEntries(detail.json.trip.seats.map((s: any) => [s.no, s.status]));
    assert.equal(byNo["1A"], "held");
    assert.equal(byNo["1C"], "available");
    assert.ok(!JSON.stringify(detail.json).includes(a.id), "who holds a seat is never shown");

    // Search counts held seats as taken: 40 seats, 2 held.
    const day = istDate(new Date(detail.json.trip.departureAt));
    const search = await t.api(`/trips/search?from=delhi&to=manali&date=${day}`);
    assert.equal(search.json.items.find((x: any) => x.id === state.tripIds[0]).availableSeats, 38);
  });

  test("another customer cannot take held seats, and a failed request holds nothing", async () => {
    const [, b] = state.users;
    const r = await hold(b, state.tripIds[0], ["1C", "1A"]); // 1A is held by the first customer
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "SEATS_UNAVAILABLE");
    assert.deepEqual(r.json.error.seats, ["1A"]);

    const seats = await seatsOf(state.tripIds[0]);
    assert.equal(seats.find((s) => s.no === "1C")!.status, "available", "all or nothing: 1C must not be held");
  });

  test("bad requests: unknown seat, too many seats, duplicates, empty, no sign-in", async () => {
    const [a] = state.users;
    const unknown = await hold(a, state.tripIds[0], ["99Z"]);
    assert.equal(unknown.status, 400);
    assert.equal(unknown.json.error.code, "UNKNOWN_SEAT");

    assert.equal((await hold(a, state.tripIds[0], ["1A", "1B", "1C", "1D", "2A", "2B", "2C"])).status, 400);
    assert.equal((await hold(a, state.tripIds[0], ["1A", "1A"])).status, 400);
    assert.equal((await hold(a, state.tripIds[0], [])).status, 400);
    assert.equal((await t.api(`/trips/${state.tripIds[0]}/hold`, { body: { seats: ["1A"] } })).status, 401);
    assert.equal((await hold(a, "aaaaaaaaaaaaaaaaaaaaaaaa", ["1A"])).status, 404);
  });

  test("changing the selection frees dropped seats, takes new ones, and does NOT extend the timer", async () => {
    await reset(state.tripIds[0]);
    const [a, b] = state.users;
    const first = await hold(a, state.tripIds[0], ["1A", "1B"]);
    await new Promise((r) => setTimeout(r, 1200));
    const second = await hold(a, state.tripIds[0], ["1B", "1C"]);

    assert.equal(second.status, 200);
    assert.deepEqual(second.json.hold.seats.map((s: any) => s.no).sort(), ["1B", "1C"]);
    assert.equal(second.json.hold.expiresAt, first.json.hold.expiresAt, "the original deadline is kept");

    // 1A was dropped, so somebody else can have it now.
    assert.equal((await hold(b, state.tripIds[0], ["1A"])).status, 200);
  });

  test("GET returns the current hold; DELETE releases it and can be repeated", async () => {
    await reset(state.tripIds[0]);
    const [a, b] = state.users;
    assert.equal((await t.api(`/trips/${state.tripIds[0]}/hold`, { token: a.token })).json.hold, null);

    await hold(a, state.tripIds[0], ["2A", "2B"]);
    const mine = await t.api(`/trips/${state.tripIds[0]}/hold`, { token: a.token });
    assert.equal(mine.json.hold.seats.length, 2);

    // Someone else's DELETE changes nothing.
    await t.api(`/trips/${state.tripIds[0]}/hold`, { method: "DELETE", token: b.token });
    assert.equal((await t.api(`/trips/${state.tripIds[0]}/hold`, { token: a.token })).json.hold.seats.length, 2);

    assert.equal((await t.api(`/trips/${state.tripIds[0]}/hold`, { method: "DELETE", token: a.token })).status, 200);
    assert.equal((await t.api(`/trips/${state.tripIds[0]}/hold`, { token: a.token })).json.hold, null);
    assert.equal((await t.api(`/trips/${state.tripIds[0]}/hold`, { method: "DELETE", token: a.token })).status, 200);
    assert.ok((await seatsOf(state.tripIds[0])).every((s) => s.status === "available"));
  });
});

describe("expiry", () => {
  test("once a hold runs out, the seats are free for someone else straight away", async () => {
    await reset(state.tripIds[0]);
    const [a, b] = state.users;
    await hold(a, state.tripIds[0], ["3A"]);
    await Trip.collection.updateOne(
      { _id: new Types.ObjectId(state.tripIds[0]), "seats.no": "3A" },
      { $set: { "seats.$.heldUntil": new Date(Date.now() - 1000) } },
    );

    assert.equal((await t.api(`/trips/${state.tripIds[0]}/hold`, { token: a.token })).json.hold, null, "the old hold no longer counts");
    const detail = await t.api(`/trips/${state.tripIds[0]}`);
    assert.equal(detail.json.trip.seats.find((s: any) => s.no === "3A").status, "available");

    const r = await hold(b, state.tripIds[0], ["3A"]);
    assert.equal(r.status, 200);
  });

  test("the sweep frees expired holds and leaves live ones alone", async () => {
    await reset(state.tripIds[1]);
    const [a, b] = state.users;
    await hold(a, state.tripIds[1], ["1A"]);
    await hold(b, state.tripIds[1], ["1B"]);
    await Trip.collection.updateOne(
      { _id: new Types.ObjectId(state.tripIds[1]), "seats.no": "1A" },
      { $set: { "seats.$.heldUntil": new Date(Date.now() - 1000) } },
    );

    assert.ok((await eng.sweepExpiredHolds()) >= 1);
    const seats = await seatsOf(state.tripIds[1]);
    const a1 = seats.find((s) => s.no === "1A")!;
    assert.equal(a1.status, "available");
    assert.equal(a1.heldBy, undefined);
    assert.equal(seats.find((s) => s.no === "1B")!.status, "held");
  });
});

describe("limits and closed trips", () => {
  test("a customer can hold seats on at most 3 trips at once", async () => {
    for (const id of state.tripIds.slice(0, 4)) await reset(id);
    const u = state.users[10];
    for (const id of state.tripIds.slice(0, 3)) assert.equal((await hold(u, id, ["1A"])).status, 200);

    const fourth = await hold(u, state.tripIds[3], ["1A"]);
    assert.equal(fourth.status, 429);
    assert.equal(fourth.json.error.code, "TOO_MANY_HOLDS");

    // Changing the hold on a trip they already hold is fine.
    assert.equal((await hold(u, state.tripIds[0], ["1B"])).status, 200);

    await t.api(`/trips/${state.tripIds[2]}/hold`, { method: "DELETE", token: u.token });
    assert.equal((await hold(u, state.tripIds[3], ["1A"])).status, 200);
  });

  test("no holds close to departure", async () => {
    const id = state.tripIds[4];
    await Trip.collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: { departureAt: new Date(Date.now() + 10 * 60_000) } });
    const r = await hold(state.users[11], id, ["1A"]);
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "TRIP_CLOSED");
  });

  test("no holds on a cancelled trip", async () => {
    const id = state.tripIds[5];
    const op = await User.findOne({ role: "operator" });
    const token = signToken(op!.id, "operator");
    assert.equal((await t.api(`/operator/trips/${id}/cancel`, { method: "POST", token, body: {} })).status, 200);
    const r = await hold(state.users[12], id, ["1A"]);
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "TRIP_CLOSED");
  });
});

describe("concurrency: nobody can ever get a seat somebody else has", () => {
  test("50 customers grab the same seat at the same instant: exactly one wins", async () => {
    const id = state.tripIds[0];
    await reset(id);
    const results = await Promise.all(state.users.slice(0, 50).map((u) => hold(u, id, ["4A"])));

    const winners = results.filter((r) => r.status === 200);
    const losers = results.filter((r) => r.status === 409);
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 49);
    assert.ok(losers.every((r) => r.json.error.code === "SEATS_UNAVAILABLE"));

    const seat = (await seatsOf(id)).find((s) => s.no === "4A")!;
    assert.equal(seat.status, "held");
    const winnerIndex = results.findIndex((r) => r.status === 200);
    assert.equal(String(seat.heldBy), state.users[winnerIndex].id, "the seat belongs to the one who got the success");
  });

  test("overlapping multi-seat requests: every request is all-or-nothing, no seat is shared", async () => {
    const id = state.tripIds[1];
    await reset(id);
    const SEATS = ["1A", "1B", "1C", "1D", "2A", "2B"];
    // 36 customers, each asking for two neighbouring seats in a ring, so almost every pair collides.
    const asks = state.users.slice(20, 56).map((u, i) => ({ u, seats: [SEATS[i % 6], SEATS[(i + 1) % 6]] }));
    const results = await Promise.all(asks.map((a) => hold(a.u, id, a.seats)));

    const seats = await seatsOf(id);
    const heldBy = new Map<string, string[]>();
    for (const s of seats.filter((x) => x.status === "held")) {
      const k = String(s.heldBy);
      heldBy.set(k, [...(heldBy.get(k) ?? []), s.no]);
    }

    let wins = 0;
    results.forEach((r, i) => {
      const mine = (heldBy.get(asks[i].u.id) ?? []).sort();
      if (r.status === 200) {
        wins++;
        assert.deepEqual(mine, [...asks[i].seats].sort(), "a winner holds exactly the seats they asked for");
      } else {
        assert.equal(r.status, 409);
        assert.deepEqual(mine, [], "a loser holds nothing at all");
      }
    });
    assert.ok(wins >= 1 && wins <= 3, `with 6 seats in pairs, 1 to 3 customers can win (got ${wins})`);
    assert.equal(seats.filter((s) => s.status === "held").length, wins * 2);
  });

  test("the same customer sending the same request many times at once holds the seats once", async () => {
    const id = state.tripIds[2];
    await reset(id);
    const u = state.users[57];
    const results = await Promise.all(Array.from({ length: 10 }, () => hold(u, id, ["5A", "5B"])));
    assert.ok(results.every((r) => r.status === 200));
    const held = (await seatsOf(id)).filter((s) => s.status === "held");
    assert.equal(held.length, 2);
    assert.equal(new Set(held.map((s) => s.heldUntil!.getTime())).size, 1, "one shared deadline");
  });

  test("a hold and a sweep running together never lose or duplicate a seat", async () => {
    const id = state.tripIds[3];
    await reset(id);
    const users = state.users.slice(30, 40);
    const work = [...users.map((u, i) => hold(u, id, [`${i + 1}A`])), ...Array.from({ length: 5 }, () => eng.sweepExpiredHolds())];
    await Promise.all(work);
    const held = (await seatsOf(id)).filter((s) => s.status === "held");
    assert.equal(held.length, 10);
  });
});

describe("turning a hold into a booking", () => {
  test("confirm books the held seats; nobody else can then hold them", async () => {
    const id = state.tripIds[0];
    await reset(id);
    const [a, b] = state.users;
    await hold(a, id, ["6A", "6B"]);
    const bid = bookingId();
    assert.equal(await eng.confirmSeats(id, a.id, ["6A", "6B"], bid), true);

    const seats = await seatsOf(id);
    for (const no of ["6A", "6B"]) {
      const s = seats.find((x) => x.no === no)!;
      assert.equal(s.status, "booked");
      assert.equal(String(s.bookingId), bid);
      assert.equal(s.heldBy, undefined);
      assert.equal(s.heldUntil, undefined);
    }
    assert.equal((await hold(b, id, ["6A"])).status, 409);
    // The customer's own hold request cannot take a booked seat either.
    assert.equal((await hold(a, id, ["6A"])).status, 409);
  });

  test("confirm needs a live hold by the same customer, for every seat", async () => {
    const id = state.tripIds[0];
    await reset(id);
    const [a, b] = state.users;
    assert.equal(await eng.confirmSeats(id, a.id, ["7A"], bookingId()), false, "no hold at all");

    await hold(a, id, ["7A"]);
    assert.equal(await eng.confirmSeats(id, b.id, ["7A"], bookingId()), false, "someone else's hold");
    assert.equal(await eng.confirmSeats(id, a.id, ["7A", "7B"], bookingId()), false, "7B was never held, so nothing is booked");
    assert.equal((await seatsOf(id)).find((s) => s.no === "7A")!.status, "held", "all or nothing");
  });

  test("paying just after the timer ended: books if the seats are still free, fails if someone took them", async () => {
    const id = state.tripIds[0];
    await reset(id);
    const [a, b] = state.users;
    const expire = (no: string) =>
      Trip.collection.updateOne({ _id: new Types.ObjectId(id), "seats.no": no }, { $set: { "seats.$.heldUntil": new Date(Date.now() - 1000) } });

    await hold(a, id, ["8A"]);
    await expire("8A");
    assert.equal(await eng.confirmSeats(id, a.id, ["8A"], bookingId()), false, "strict mode: the hold must still be live");
    assert.equal(await eng.confirmSeats(id, a.id, ["8A"], bookingId(), { allowExpiredHold: true }), true, "late but still free");

    await hold(a, id, ["8B"]);
    await expire("8B");
    assert.equal((await hold(b, id, ["8B"])).status, 200, "someone else took it after expiry");
    assert.equal(await eng.confirmSeats(id, a.id, ["8B"], bookingId(), { allowExpiredHold: true }), false, "must refund");
    assert.equal(String((await seatsOf(id)).find((s) => s.no === "8B")!.heldBy), b.id);
  });

  test("releasing a booking's seats makes them available again", async () => {
    const id = state.tripIds[0];
    await reset(id);
    const [a] = state.users;
    const bid = bookingId();
    await hold(a, id, ["9A", "9B"]);
    await eng.confirmSeats(id, a.id, ["9A", "9B"], bid);
    assert.equal(await eng.releaseBookedSeats(id, bid), true);
    const seats = await seatsOf(id);
    assert.ok(["9A", "9B"].every((no) => seats.find((s) => s.no === no)!.status === "available"));
    assert.equal(await eng.releaseBookedSeats(id, bid), false, "second call changes nothing");
  });

  test("two payments for the same seat: only one booking can win", async () => {
    const id = state.tripIds[0];
    await reset(id);
    const [a, b] = state.users;
    await hold(a, id, ["10A"]);
    await Trip.collection.updateOne({ _id: new Types.ObjectId(id), "seats.no": "10A" }, { $set: { "seats.$.heldUntil": new Date(Date.now() - 1000) } });
    await hold(b, id, ["10A"]); // b now legitimately holds it
    const results = await Promise.all([
      eng.confirmSeats(id, a.id, ["10A"], bookingId(), { allowExpiredHold: true }),
      eng.confirmSeats(id, b.id, ["10A"], bookingId(), { allowExpiredHold: true }),
    ]);
    assert.equal(results.filter(Boolean).length, 1);
  });
});
