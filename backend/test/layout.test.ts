import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AppError } from "../src/errors.js";
import { addDays, istDate, istDayRange, istToUtc, weekday } from "../src/lib/time.js";
import { deriveBusType, generateLayout, resolveLayout, validateSeats } from "../src/modules/operators/layout.js";

describe("seat layout presets", () => {
  test("seater_2x2 gives 4 unique seats per row with an aisle gap", () => {
    const seats = generateLayout("seater_2x2", 10);
    assert.equal(seats.length, 40);
    assert.equal(new Set(seats.map((s) => s.no)).size, 40);
    assert.ok(seats.every((s) => s.col !== 2), "column 2 is the aisle");
    assert.equal(deriveBusType(seats), "seater");
  });

  test("sleeper_2x1 gives 6 berths per row across two decks", () => {
    const seats = generateLayout("sleeper_2x1", 6);
    assert.equal(seats.length, 36);
    assert.equal(seats.filter((s) => s.deck === "upper").length, 18);
    assert.equal(new Set(seats.map((s) => s.no)).size, 36);
    assert.equal(deriveBusType(seats), "sleeper");
  });

  test("a preset larger than the seat limit is rejected", () => {
    assert.throws(() => resolveLayout({ preset: { name: "seater_2x2", rows: 20 } }), AppError); // 80 seats
  });

  test("duplicate seat numbers and duplicate positions are rejected", () => {
    const base = { deck: "lower" as const, kind: "seater" as const, ladies: false };
    assert.throws(() => validateSeats([{ ...base, no: "A1", row: 0, col: 0 }, { ...base, no: "a1", row: 0, col: 1 }]), AppError);
    assert.throws(() => validateSeats([{ ...base, no: "A1", row: 0, col: 0 }, { ...base, no: "A2", row: 0, col: 0 }]), AppError);
  });

  test("mixed seats and sleepers are a seater_sleeper bus", () => {
    const base = { deck: "lower" as const, ladies: false };
    assert.equal(
      deriveBusType([{ ...base, no: "1", row: 0, col: 0, kind: "seater" }, { ...base, no: "2", row: 0, col: 1, kind: "sleeper" }]),
      "seater_sleeper",
    );
  });
});

describe("IST date helpers", () => {
  test("a day in IST starts at 18:30 UTC the day before", () => {
    const { start, end } = istDayRange("2026-10-12");
    assert.equal(start.toISOString(), "2026-10-11T18:30:00.000Z");
    assert.equal(end.toISOString(), "2026-10-12T18:30:00.000Z");
  });

  test("23:30 IST is still the same IST date, and 00:10 IST is the next", () => {
    assert.equal(istDate(istToUtc("2026-10-12", "23:30")), "2026-10-12");
    assert.equal(istDate(istToUtc("2026-10-13", "00:10")), "2026-10-13");
  });

  test("addDays and weekday", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(weekday("2026-10-11"), 0); // a Sunday
  });
});
