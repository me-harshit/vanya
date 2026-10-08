import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { addDays, istDate } from "../src/lib/time.js";
import { Bus } from "../src/models/Bus.js";
import { City } from "../src/models/City.js";
import { Operator } from "../src/models/Operator.js";
import { Trip } from "../src/models/Trip.js";
import { User } from "../src/models/User.js";
import { setupTestApp } from "./helpers.js";

let t: Awaited<ReturnType<typeof setupTestApp>>;
let demo: typeof import("../src/seed/demo.js");
let realOperatorBus: string;

before(async () => {
  t = await setupTestApp("vanya_test_seed");
  demo = await import("../src/seed/demo.js");

  // A real (non-demo) operator and bus, to prove the demo tools never touch real data.
  const user = await User.create({ phone: "9811111111", role: "operator" });
  const op = await Operator.create({ user: user.id, businessName: "Real Operator", status: "approved" });
  realOperatorBus = (
    await Bus.create({
      operator: op.id, name: "Real Bus", registrationNumber: "MH12REAL01", ac: true, amenities: [],
      seats: [{ no: "1", deck: "lower", row: 0, col: 0, kind: "seater", ladies: false }], type: "seater", seatCount: 1,
    })
  ).id;
});
after(async () => {
  await t.teardown();
});

describe("demo data", () => {
  test("creates operators, buses, routes and trips that the public search can find", async () => {
    const s = await demo.seedDemo({ days: 3 });
    assert.equal(s.operators, 3);
    assert.equal(s.buses, 48, "16 route directions for each of 3 operators");
    assert.equal(s.routes, 48);
    assert.ok(s.trips >= 48 * 2, `expected trips for several days, got ${s.trips}`);
    assert.ok((await City.countDocuments()) >= 40, "cities are added as needed");

    const day = addDays(istDate(new Date()), 2);
    const r = await t.api(`/trips/search?from=delhi&to=manali&date=${day}`);
    assert.equal(r.status, 200);
    assert.equal(r.json.items.length, 3, "one trip per demo operator");
    const names = r.json.items.map((i: any) => i.operatorName).sort();
    assert.ok(names.every((n: string) => n.startsWith("Demo ")), "demo operators are clearly marked");
    for (const trip of r.json.items) {
      assert.ok(trip.fareFrom >= 250);
      assert.ok(trip.availableSeats > 0 && trip.availableSeats < trip.totalSeats, "some seats are already sold, some free");
      assert.equal(trip.boardingPoints.length, 2);
    }
    // The reverse direction exists too.
    assert.ok((await t.api(`/trips/search?from=manali&to=delhi&date=${day}`)).json.items.length >= 1);
  });

  test("demo operators can sign in and use their portal", async () => {
    const login = await t.login("9999900001");
    assert.equal(login.json.user.role, "operator");
    const buses = await t.api("/operator/buses?limit=100", { token: login.json.token });
    assert.equal(buses.status, 200);
    assert.equal(buses.json.items.length, 16);
    const trips = await t.api("/operator/trips", { token: login.json.token });
    assert.ok(trips.json.items.length > 0);
  });

  test("running it again adds nothing twice", async () => {
    const before = { buses: await Bus.countDocuments(), trips: await Trip.countDocuments(), users: await User.countDocuments() };
    const s = await demo.seedDemo({ days: 3 });
    assert.equal(s.buses, 0);
    assert.equal(s.routes, 0);
    assert.equal(s.trips, 0);
    assert.equal(await Bus.countDocuments(), before.buses);
    assert.equal(await Trip.countDocuments(), before.trips);
    assert.equal(await User.countDocuments(), before.users);
  });

  test("removing demo data leaves real data alone", async () => {
    await demo.resetDemo();
    assert.equal(await Operator.countDocuments({ businessName: /^Demo / }), 0);
    assert.equal(await User.countDocuments({ phone: /^99999/ }), 0);
    assert.equal(await Trip.countDocuments(), 0);
    assert.equal(await Bus.countDocuments(), 1);
    assert.ok(await Bus.findById(realOperatorBus), "the real bus is still there");
    assert.equal(await Operator.countDocuments({ businessName: "Real Operator" }), 1);
  });

  test("reset recreates everything fresh", async () => {
    const s = await demo.seedDemo({ days: 2, reset: true });
    assert.equal(s.buses, 48);
    assert.equal(await Bus.countDocuments(), 49, "48 demo buses plus the one real bus");
  });
});
