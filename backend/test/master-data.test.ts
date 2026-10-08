import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { addDays, istDate, istToUtc } from "../src/lib/time.js";
import { Trip } from "../src/models/Trip.js";
import { setupTestApp } from "./helpers.js";

let t: Awaited<ReturnType<typeof setupTestApp>>;
before(async () => {
  t = await setupTestApp("vanya_test_master");
});
after(async () => {
  await t.teardown();
});

const today = istDate(new Date());
const D = addDays(today, 3); // first test day
const dep = (date: string, time: string) => istToUtc(date, time).toISOString();

// Shared state, filled in by the tests below (they run in order).
const s = {} as {
  admin: string; customer: string; opA: string; opB: string;
  delhi: string; manali: string; sharedDelhiPoint: string; sharedManaliPoint: string; ownDelhiPoint: string;
  operatorAId: string; operatorBId: string;
  busA: string; busA2: string; routeA: string; tripIds: string[];
};

describe("cities and admin", () => {
  test("admin creates cities; public autocomplete finds them", async () => {
    s.admin = await t.loginAdmin("9100000001");
    const d = await t.api("/admin/cities", { token: s.admin, body: { name: "Delhi", state: "Delhi" } });
    const m = await t.api("/admin/cities", { token: s.admin, body: { name: "Manali", state: "Himachal Pradesh" } });
    assert.equal(d.status, 201);
    assert.equal(d.json.city.slug, "delhi");
    s.delhi = d.json.city.id;
    s.manali = m.json.city.id;

    const found = await t.api("/cities?q=del");
    assert.equal(found.status, 200);
    assert.deepEqual(found.json.items.map((c: any) => c.name), ["Delhi"]);
  });

  test("duplicate city is rejected; a customer cannot manage cities", async () => {
    const dup = await t.api("/admin/cities", { token: s.admin, body: { name: "Delhi", state: "Delhi" } });
    assert.equal(dup.status, 409);

    s.customer = (await t.login("9100000002")).json.token;
    const r = await t.api("/admin/cities", { token: s.customer, body: { name: "Pune", state: "Maharashtra" } });
    assert.equal(r.status, 403);
  });

  test("inactive cities disappear from public search", async () => {
    const pune = await t.api("/admin/cities", { token: s.admin, body: { name: "Pune", state: "Maharashtra" } });
    await t.api(`/admin/cities/${pune.json.city.id}`, { method: "PATCH", token: s.admin, body: { isActive: false } });
    const r = await t.api("/cities?q=pune");
    assert.equal(r.json.items.length, 0);
  });

  test("admin adds shared boarding and dropping points", async () => {
    const a = await t.api("/admin/points", { token: s.admin, body: { city: s.delhi, name: "Kashmere Gate ISBT" } });
    const b = await t.api("/admin/points", { token: s.admin, body: { city: s.manali, name: "Manali Bus Stand" } });
    assert.equal(a.status, 201);
    s.sharedDelhiPoint = a.json.point.id;
    s.sharedManaliPoint = b.json.point.id;
  });
});

describe("operators", () => {
  test("a customer cannot use operator endpoints until registered", async () => {
    const r = await t.api("/operator/buses", { token: s.customer });
    assert.equal(r.status, 403);
    assert.equal(r.json.error.code, "FORBIDDEN");
  });

  test("register, then wait for approval", async () => {
    s.opA = (await t.login("9100000003")).json.token;
    const reg = await t.api("/operator/register", { token: s.opA, body: { businessName: "Test Travels A" } });
    assert.equal(reg.status, 201);
    assert.equal(reg.json.operator.status, "pending");
    s.operatorAId = reg.json.operator.id;

    const again = await t.api("/operator/register", { token: s.opA, body: { businessName: "Test Travels A" } });
    assert.equal(again.status, 409);

    const me = await t.api("/operator/me", { token: s.opA });
    assert.equal(me.json.operator.status, "pending");

    const blocked = await t.api("/operator/buses", { token: s.opA });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.error.code, "OPERATOR_NOT_APPROVED");
  });

  test("admin approves and sets commission; the operator can then work", async () => {
    const list = await t.api("/admin/operators?status=pending", { token: s.admin });
    assert.equal(list.json.total, 1);
    assert.equal(list.json.items[0].user.phone, "9100000003");

    const ok = await t.api(`/admin/operators/${s.operatorAId}`, {
      method: "PATCH", token: s.admin, body: { status: "approved", commissionPercent: 12 },
    });
    assert.equal(ok.json.operator.commissionPercent, 12);
    assert.equal((await t.api("/operator/buses", { token: s.opA })).status, 200);

    s.opB = (await t.login("9100000004")).json.token;
    const regB = await t.api("/operator/register", { token: s.opB, body: { businessName: "Test Travels B" } });
    s.operatorBId = regB.json.operator.id;
    await t.api(`/admin/operators/${s.operatorBId}`, { method: "PATCH", token: s.admin, body: { status: "approved" } });
  });

  test("an admin cannot register as an operator", async () => {
    const r = await t.api("/operator/register", { token: s.admin, body: { businessName: "Nope" } });
    assert.equal(r.status, 403);
  });
});

describe("buses", () => {
  test("create a bus from a preset layout", async () => {
    const r = await t.api("/operator/buses", {
      token: s.opA,
      body: { name: "Volvo 9400", registrationNumber: "dl 01 ab 1234", ac: true, amenities: ["wifi", "charging"], layout: { preset: { name: "seater_2x2", rows: 10 } } },
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.bus.registrationNumber, "DL01AB1234");
    assert.equal(r.json.bus.seatCount, 40);
    assert.equal(r.json.bus.type, "seater");
    s.busA = r.json.bus.id;

    const second = await t.api("/operator/buses", {
      token: s.opA,
      body: { name: "Scania Sleeper", registrationNumber: "DL01AB5678", ac: true, layout: { preset: { name: "sleeper_2x1", rows: 5 } } },
    });
    assert.equal(second.json.bus.seatCount, 30);
    s.busA2 = second.json.bus.id;
  });

  test("a bad layout, a bad registration and a duplicate registration are rejected", async () => {
    const seat = { no: "A1", deck: "lower", row: 0, col: 0, kind: "seater" };
    const dupSeats = await t.api("/operator/buses", {
      token: s.opA,
      body: { name: "X", registrationNumber: "MH12AB0001", ac: false, layout: { seats: [seat, { ...seat, col: 1 }] } },
    });
    assert.equal(dupSeats.status, 400);
    assert.equal(dupSeats.json.error.code, "INVALID_LAYOUT");

    const badReg = await t.api("/operator/buses", {
      token: s.opA, body: { name: "X", registrationNumber: "!!", ac: false, layout: { preset: { name: "seater_2x2", rows: 2 } } },
    });
    assert.equal(badReg.status, 400);
    assert.equal(badReg.json.error.code, "VALIDATION_ERROR");

    const dupReg = await t.api("/operator/buses", {
      token: s.opB, body: { name: "Copy", registrationNumber: "DL01AB1234", ac: false, layout: { preset: { name: "seater_2x2", rows: 2 } } },
    });
    assert.equal(dupReg.status, 409);
  });

  test("operators only see and change their own buses", async () => {
    assert.equal((await t.api(`/operator/buses/${s.busA}`, { token: s.opB })).status, 404);
    assert.equal((await t.api(`/operator/buses/${s.busA}`, { method: "PATCH", token: s.opB, body: { name: "Hacked" } })).status, 404);
    assert.equal((await t.api("/operator/buses", { token: s.opB })).json.items.length, 0);
    assert.equal((await t.api(`/operator/buses/not-an-id`, { token: s.opA })).status, 404);
  });
});

describe("routes", () => {
  test("operators can add their own points; routes check points belong to the right city", async () => {
    const own = await t.api("/operator/points", { token: s.opA, body: { city: s.delhi, name: "Majnu Ka Tila", landmark: "Near Gurudwara" } });
    assert.equal(own.status, 201);
    s.ownDelhiPoint = own.json.point.id;

    const base = { fromCity: s.delhi, toCity: s.manali, distanceKm: 540, durationMinutes: 750 };

    // Boarding point from the wrong city (a Manali point used in Delhi).
    const wrongCity = await t.api("/operator/routes", {
      token: s.opA,
      body: { ...base, boardingPoints: [{ point: s.sharedManaliPoint, offsetMinutes: 0 }], droppingPoints: [{ point: s.sharedManaliPoint, offsetMinutes: 750 }] },
    });
    assert.equal(wrongCity.status, 400);
    assert.equal(wrongCity.json.error.code, "INVALID_POINTS");

    // Operator B cannot use operator A's private point.
    const foreign = await t.api("/operator/routes", {
      token: s.opB,
      body: { ...base, boardingPoints: [{ point: s.ownDelhiPoint, offsetMinutes: 0 }], droppingPoints: [{ point: s.sharedManaliPoint, offsetMinutes: 750 }] },
    });
    assert.equal(foreign.status, 400);

    const sameCity = await t.api("/operator/routes", {
      token: s.opA,
      body: { ...base, toCity: s.delhi, boardingPoints: [{ point: s.sharedDelhiPoint, offsetMinutes: 0 }], droppingPoints: [{ point: s.sharedDelhiPoint, offsetMinutes: 750 }] },
    });
    assert.equal(sameCity.status, 400);

    const lateStop = await t.api("/operator/routes", {
      token: s.opA,
      body: { ...base, boardingPoints: [{ point: s.sharedDelhiPoint, offsetMinutes: 0 }], droppingPoints: [{ point: s.sharedManaliPoint, offsetMinutes: 9999 }] },
    });
    assert.equal(lateStop.status, 400);

    const ok = await t.api("/operator/routes", {
      token: s.opA,
      body: {
        ...base,
        boardingPoints: [{ point: s.sharedDelhiPoint, offsetMinutes: 0 }, { point: s.ownDelhiPoint, offsetMinutes: 30 }],
        droppingPoints: [{ point: s.sharedManaliPoint, offsetMinutes: 750 }],
      },
    });
    assert.equal(ok.status, 201);
    s.routeA = ok.json.route.id;
  });

  test("an operator cannot read another operator's route", async () => {
    assert.equal((await t.api(`/operator/routes/${s.routeA}`, { token: s.opB })).status, 404);
    assert.equal((await t.api(`/operator/routes/${s.routeA}`, { token: s.opA })).status, 200);
  });
});

describe("trips", () => {
  const body = (extra: object = {}) => ({ bus: s.busA, route: s.routeA, fare: 1100, ...extra });

  test("generate trips for several days from one departure time", async () => {
    const r = await t.api("/operator/trips/generate", {
      token: s.opA,
      body: body({ departureTime: "21:30", startDate: D, endDate: addDays(D, 2) }),
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.created, 3);
    s.tripIds = r.json.tripIds;

    const again = await t.api("/operator/trips/generate", {
      token: s.opA,
      body: body({ departureTime: "21:30", startDate: D, endDate: addDays(D, 2) }),
    });
    assert.equal(again.json.created, 0);
    assert.equal(again.json.skipped.length, 3);
  });

  test("daysOfWeek limits which days are generated", async () => {
    const start = addDays(D, 10);
    const r = await t.api("/operator/trips/generate", {
      token: s.opA,
      body: body({ bus: s.busA2, departureTime: "20:00", startDate: start, endDate: addDays(start, 6), daysOfWeek: [1] }),
    });
    assert.equal(r.json.created, 1);
  });

  test("a bus cannot run two overlapping trips; a trip after it arrives is fine", async () => {
    const overlap = await t.api("/operator/trips", { token: s.opA, body: body({ departureAt: dep(D, "22:00") }) });
    assert.equal(overlap.status, 409);
    assert.equal(overlap.json.error.code, "BUS_BUSY");

    // 06:00 + 12h30m = arrives 18:30, before the 21:30 departure.
    const ok = await t.api("/operator/trips", { token: s.opA, body: body({ departureAt: dep(D, "06:00") }) });
    assert.equal(ok.status, 201);
    assert.equal(ok.json.trip.seats.length, 40);
    assert.equal(ok.json.trip.operatorName, "Test Travels A");
  });

  test("trips in the past, bad ranges and other operators' buses are rejected", async () => {
    const past = await t.api("/operator/trips", { token: s.opA, body: body({ departureAt: dep(addDays(today, -2), "10:00") }) });
    assert.equal(past.status, 400);
    assert.equal(past.json.error.code, "IN_THE_PAST");

    const backwards = await t.api("/operator/trips/generate", {
      token: s.opA, body: body({ departureTime: "10:00", startDate: addDays(D, 5), endDate: D }),
    });
    assert.equal(backwards.status, 400);

    const tooLong = await t.api("/operator/trips/generate", {
      token: s.opA, body: body({ departureTime: "10:00", startDate: D, endDate: addDays(D, 100) }),
    });
    assert.equal(tooLong.status, 400);

    const foreignBus = await t.api("/operator/trips", { token: s.opB, body: body({ departureAt: dep(addDays(D, 20), "10:00") }) });
    assert.equal(foreignBus.status, 404);
  });

  test("upperFare prices the upper deck differently", async () => {
    const r = await t.api("/operator/trips", {
      token: s.opA,
      body: { bus: s.busA2, route: s.routeA, fare: 1500, upperFare: 1300, departureAt: dep(addDays(D, 20), "18:00") },
    });
    assert.equal(r.status, 201);
    const seats = r.json.trip.seats as { deck: string; price: number }[];
    assert.ok(seats.filter((x) => x.deck === "lower").every((x) => x.price === 1500));
    assert.ok(seats.filter((x) => x.deck === "upper").every((x) => x.price === 1300));
  });

  test("an invalid cancellation policy is rejected", async () => {
    const r = await t.api("/operator/trips", {
      token: s.opA,
      body: body({
        departureAt: dep(addDays(D, 30), "10:00"),
        cancellationPolicy: [{ hoursBeforeDeparture: 12, refundPercent: 50 }, { hoursBeforeDeparture: 24, refundPercent: 90 }],
      }),
    });
    assert.equal(r.status, 400);
  });

  test("the operator's trip list only shows their own trips", async () => {
    const mine = await t.api(`/operator/trips?from=${D}&to=${addDays(D, 2)}`, { token: s.opA });
    assert.equal(mine.json.items.length, 4); // three at 21:30 plus the 06:00 one
    assert.equal((await t.api("/operator/trips", { token: s.opB })).json.items.length, 0);
    assert.equal((await t.api(`/operator/trips/${s.tripIds[0]}`, { token: s.opB })).status, 404);
  });
});

describe("public search and trip detail", () => {
  test("search returns trips for the date, soonest first, with seat counts and fares", async () => {
    const r = await t.api(`/trips/search?from=delhi&to=manali&date=${D}`);
    assert.equal(r.status, 200);
    assert.equal(r.json.from.name, "Delhi");
    assert.equal(r.json.items.length, 2);
    const [first, second] = r.json.items;
    assert.ok(new Date(first.departureAt) < new Date(second.departureAt));
    assert.equal(first.availableSeats, 40);
    assert.equal(first.totalSeats, 40);
    assert.equal(first.fareFrom, 1100);
    assert.equal(first.operatorName, "Test Travels A");
    assert.equal(first.boardingPoints.length, 2);
    assert.equal(first.durationMinutes, 750);
    assert.equal("operator" in first, false, "the operator id must not be exposed");
  });

  test("search accepts city ids too, and filters by AC and type", async () => {
    const byId = await t.api(`/trips/search?from=${s.delhi}&to=${s.manali}&date=${D}`);
    assert.equal(byId.json.items.length, 2);
    assert.equal((await t.api(`/trips/search?from=delhi&to=manali&date=${D}&ac=false`)).json.items.length, 0);
    assert.equal((await t.api(`/trips/search?from=delhi&to=manali&date=${D}&type=sleeper`)).json.items.length, 0);
  });

  test("search validates input and unknown cities", async () => {
    assert.equal((await t.api("/trips/search?from=delhi&to=manali&date=tomorrow")).status, 400);
    assert.equal((await t.api(`/trips/search?from=atlantis&to=manali&date=${D}`)).status, 404);
    assert.equal((await t.api(`/trips/search?from=delhi&to=delhi&date=${D}`)).status, 400);
    assert.equal((await t.api(`/trips/search?from=manali&to=delhi&date=${D}`)).json.items.length, 0, "no trips the other way");
  });

  test("a trip just after midnight IST belongs to that IST date, not the day before", async () => {
    const day = addDays(D, 40);
    const late = await t.api("/operator/trips", { token: s.opA, body: { bus: s.busA, route: s.routeA, fare: 900, departureAt: dep(day, "00:10") } });
    assert.equal(late.status, 201);
    const onDay = await t.api(`/trips/search?from=delhi&to=manali&date=${day}`);
    const dayBefore = await t.api(`/trips/search?from=delhi&to=manali&date=${addDays(day, -1)}`);
    assert.equal(onDay.json.items.length, 1);
    assert.equal(dayBefore.json.items.length, 0);
  });

  test("trip detail shows the seat map; other people's holds are hidden and expired holds are free", async () => {
    const id = s.tripIds[0];
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 600_000);
    await Trip.updateOne(
      { _id: id },
      {
        $set: {
          "seats.0.status": "held", "seats.0.heldUntil": past,
          "seats.1.status": "held", "seats.1.heldUntil": future, "seats.1.heldBy": s.operatorAId,
          "seats.2.status": "booked",
        },
      },
    );

    const r = await t.api(`/trips/${id}`);
    assert.equal(r.status, 200);
    assert.equal(r.json.trip.seats[0].status, "available", "an expired hold counts as free");
    assert.equal(r.json.trip.seats[1].status, "held");
    assert.equal(r.json.trip.seats[2].status, "booked");
    const raw = JSON.stringify(r.json);
    assert.ok(!raw.includes("heldBy") && !raw.includes("bookingId") && !raw.includes("heldUntil"));
    assert.ok(r.json.trip.boardingPoints[0].name);
    assert.ok(r.json.trip.cancellationPolicy.length > 0);

    // 40 seats, one booked and one held: 38 can be picked.
    const search = await t.api(`/trips/search?from=delhi&to=manali&date=${D}`);
    const row = search.json.items.find((x: any) => x.id === id);
    assert.equal(row.availableSeats, 38);
  });

  test("an unknown or malformed trip id is a 404", async () => {
    assert.equal((await t.api("/trips/zzz")).status, 404);
    assert.equal((await t.api("/trips/aaaaaaaaaaaaaaaaaaaaaaaa")).status, 404);
  });
});

describe("cancelling a trip", () => {
  test("a trip with sold or held seats can be cancelled (bookings are refunded; see bookings.test.ts)", async () => {
    const r = await t.api(`/operator/trips/${s.tripIds[0]}/cancel`, { method: "POST", token: s.opA, body: {} });
    assert.equal(r.status, 200);
    assert.equal(r.json.trip.status, "cancelled");
    assert.equal(r.json.bookingsCancelled, 0, "no bookings exist for this trip in this test");
  });

  test("another operator cannot cancel it", async () => {
    const r = await t.api(`/operator/trips/${s.tripIds[1]}/cancel`, { method: "POST", token: s.opB, body: {} });
    assert.equal(r.status, 404);
  });

  test("an empty trip can be cancelled, disappears from search, and frees the bus", async () => {
    const id = s.tripIds[1];
    const day = istDate((await Trip.findById(id))!.departureAt);
    const r = await t.api(`/operator/trips/${id}/cancel`, { method: "POST", token: s.opA, body: {} });
    assert.equal(r.status, 200);
    assert.equal(r.json.trip.status, "cancelled");

    const search = await t.api(`/trips/search?from=delhi&to=manali&date=${day}`);
    assert.ok(!search.json.items.some((x: any) => x.id === id));

    const again = await t.api(`/operator/trips/${id}/cancel`, { method: "POST", token: s.opA, body: {} });
    assert.equal(again.status, 409);

    const rebook = await t.api("/operator/trips", { token: s.opA, body: { bus: s.busA, route: s.routeA, fare: 1100, departureAt: dep(day, "21:30") } });
    assert.equal(rebook.status, 201);
  });
});
