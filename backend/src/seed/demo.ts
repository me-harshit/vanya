import { Types } from "mongoose";
import { addDays, istDate } from "../lib/time.js";
import { slugify } from "../lib/ids.js";
import { BoardingPoint } from "../models/BoardingPoint.js";
import { Booking } from "../models/Booking.js";
import { Bus } from "../models/Bus.js";
import { City } from "../models/City.js";
import { Operator } from "../models/Operator.js";
import { Payment } from "../models/Payment.js";
import { Refund } from "../models/Refund.js";
import { Route } from "../models/Route.js";
import { Trip } from "../models/Trip.js";
import { User } from "../models/User.js";
import { deriveBusType, generateLayout, type SeatDef } from "../modules/operators/layout.js";
import { generateTrips, loadContext } from "../modules/operators/tripService.js";
import { ensureCities } from "./cities.js";

/**
 * DEMO DATA for development: a few made-up operators with buses, routes and daily trips, so the
 * apps and portals have something to show. Everything it creates belongs to users whose phone
 * starts with DEMO_PREFIX (or is a point marked "Demo point"), so it can be removed without
 * touching real data. Safe to run again.
 */
export const DEMO_PREFIX = "99999";
export const DEMO_CUSTOMER_PHONE = "9999900010";
const DEMO_POINT_MARK = "Demo point";

const ROUTES: [from: string, to: string, km: number, minutes: number][] = [
  ["Delhi", "Manali", 540, 750],
  ["Delhi", "Jaipur", 280, 345],
  ["Mumbai", "Pune", 150, 210],
  ["Mumbai", "Goa", 590, 720],
  ["Bengaluru", "Chennai", 350, 390],
  ["Bengaluru", "Hyderabad", 570, 570],
  ["Hyderabad", "Vijayawada", 275, 315],
  ["Ahmedabad", "Mumbai", 530, 585],
];

type DemoOperator = {
  phone: string;
  businessName: string;
  ac: boolean;
  layout: "sleeper_2x1" | "seater_2x2";
  rows: number;
  perKm: number;
  night: string; // departure for overnight routes
  day: string; // departure for daytime routes
  busNames: string[];
  amenities: ("wifi" | "charging" | "blanket" | "water" | "reading_light" | "tv" | "toilet")[];
};

const OPERATORS: DemoOperator[] = [
  { phone: "9999900001", businessName: "Demo Himalayan Express", ac: true, layout: "sleeper_2x1", rows: 6, perKm: 2.4, night: "21:30", day: "07:00", busNames: ["Scania Multi-Axle", "Volvo B11R Sleeper"], amenities: ["wifi", "charging", "blanket", "water"] },
  { phone: "9999900002", businessName: "Demo Blue Line Travels", ac: true, layout: "seater_2x2", rows: 11, perKm: 2.0, night: "20:15", day: "09:30", busNames: ["Volvo 9400", "Mercedes Benz Coach"], amenities: ["charging", "water", "reading_light"] },
  { phone: "9999900003", businessName: "Demo Sunrise Tours", ac: false, layout: "seater_2x2", rows: 12, perKm: 1.4, night: "22:45", day: "06:15", busNames: ["Ashok Leyland Seater", "Tata Starbus"], amenities: ["water"] },
];

// Small deterministic random numbers, so a re-run behaves the same.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function resetDemo() {
  const users = await User.find({ phone: new RegExp(`^${DEMO_PREFIX}`) }, { _id: 1 });
  const userIds = users.map((u) => u._id);
  const operators = await Operator.find({ user: { $in: userIds } }, { _id: 1 });
  const operatorIds = operators.map((o) => o._id);

  const bookings = await Booking.find({ $or: [{ operator: { $in: operatorIds } }, { user: { $in: userIds } }] }, { _id: 1 });
  const bookingIds = bookings.map((b) => b._id);
  await Refund.deleteMany({ booking: { $in: bookingIds } });
  await Payment.deleteMany({ booking: { $in: bookingIds } });
  await Booking.deleteMany({ _id: { $in: bookingIds } });
  await Trip.deleteMany({ operator: { $in: operatorIds } });
  await Route.deleteMany({ operator: { $in: operatorIds } });
  await Bus.deleteMany({ operator: { $in: operatorIds } });
  await BoardingPoint.deleteMany({ $or: [{ operator: { $in: operatorIds } }, { landmark: DEMO_POINT_MARK, operator: null }] });
  await Operator.deleteMany({ _id: { $in: operatorIds } });
  await User.deleteMany({ _id: { $in: userIds } });
  return { users: userIds.length, operators: operatorIds.length };
}

export async function seedDemo(opts: { reset?: boolean; days?: number } = {}) {
  const days = opts.days ?? 10;
  if (opts.reset) await resetDemo();

  await ensureCities();
  const cityBySlug = new Map((await City.find()).map((c) => [c.slug, c]));
  const city = (name: string) => {
    const c = cityBySlug.get(slugify(name));
    if (!c) throw new Error(`city missing: ${name}`);
    return c;
  };

  // Two shared stops in every city the demo routes touch.
  const cityNames = [...new Set(ROUTES.flatMap(([a, b]) => [a, b]))];
  const stops = new Map<string, InstanceType<typeof BoardingPoint>[]>();
  for (const name of cityNames) {
    const c = city(name);
    const list = [];
    for (const label of ["Main Bus Stand", "Railway Station"]) {
      const point =
        (await BoardingPoint.findOne({ city: c.id, name: `${name} ${label}`, operator: null })) ??
        (await BoardingPoint.create({ city: c.id, name: `${name} ${label}`, address: `${label}, ${name}`, landmark: DEMO_POINT_MARK, operator: null }));
      list.push(point);
    }
    stops.set(name, list);
  }

  const startDate = istDate(new Date());
  const endDate = addDays(startDate, days - 1);
  const summary = { operators: 0, buses: 0, routes: 0, trips: 0 };
  const newTripIds: string[] = [];

  for (const [oi, def] of OPERATORS.entries()) {
    const user = await User.findOneAndUpdate({ phone: def.phone }, { $set: { role: "operator", name: def.businessName } }, { upsert: true, new: true });
    const operator = await Operator.findOneAndUpdate(
      { user: user.id },
      { $set: { businessName: def.businessName, status: "approved" }, $setOnInsert: { commissionPercent: 10, listingMode: "direct" } },
      { upsert: true, new: true },
    );
    summary.operators++;

    // One route and one bus per direction, each bus running one daily trip.
    let n = 0;
    for (const [ri, [a, b, km, minutes]] of ROUTES.entries()) {
      for (const [from, to] of [[a, b], [b, a]] as const) {
        n++;
        const [fromCity, toCity] = [city(from), city(to)];
        const [fromStops, toStops] = [stops.get(from)!, stops.get(to)!];

        let route = await Route.findOne({ operator: operator.id, fromCity: fromCity.id, toCity: toCity.id });
        if (!route) {
          route = await Route.create({
            operator: operator.id, fromCity: fromCity.id, toCity: toCity.id, distanceKm: km, durationMinutes: minutes,
            boardingPoints: [{ point: fromStops[0].id, offsetMinutes: 0 }, { point: fromStops[1].id, offsetMinutes: 30 }],
            droppingPoints: [{ point: toStops[0].id, offsetMinutes: minutes - 25 }, { point: toStops[1].id, offsetMinutes: minutes }],
          });
          summary.routes++;
        }

        const registration = `DEMO${oi + 1}${String(n).padStart(2, "0")}`;
        let bus = await Bus.findOne({ registrationNumber: registration });
        if (!bus) {
          const seats: SeatDef[] = generateLayout(def.layout, def.rows);
          if (def.layout === "seater_2x2" && def.ac) seats.slice(0, 2).forEach((s) => (s.ladies = true)); // two seats reserved for women
          bus = await Bus.create({
            operator: operator.id, name: def.busNames[(ri + n) % def.busNames.length], registrationNumber: registration,
            ac: def.ac, amenities: def.amenities, seats, type: deriveBusType(seats), seatCount: seats.length,
          });
          summary.buses++;
        }

        const sleeper = def.layout === "sleeper_2x1";
        const fare = Math.max(250, Math.round((km * def.perKm) / 10) * 10);
        const ctx = await loadContext(
          { id: operator.id, businessName: operator.businessName },
          { bus: bus.id, route: route.id, fare, upperFare: sleeper ? Math.round((fare * 0.92) / 10) * 10 : undefined },
        );
        const result = await generateTrips(ctx, {
          bus: bus.id, route: route.id, fare, upperFare: sleeper ? Math.round((fare * 0.92) / 10) * 10 : undefined,
          departureTime: minutes >= 480 ? def.night : def.day, startDate, endDate,
        });
        summary.trips += result.created;
        newTripIds.push(...result.tripIds);
      }
    }
  }

  // Make the seat maps look lived-in: some seats on every new trip are already sold.
  // (These have no booking record behind them. They only exist to make demo trips look busy.)
  for (const [i, id] of newTripIds.entries()) {
    const trip = await Trip.collection.findOne({ _id: new Types.ObjectId(id) }, { projection: { seats: 1 } });
    if (!trip) continue;
    const rand = rng(i + 1);
    const sold = Math.floor(trip.seats.length * (0.1 + rand() * 0.5));
    const picks = new Set<number>();
    while (picks.size < sold) picks.add(Math.floor(rand() * trip.seats.length));
    const set: Record<string, unknown> = {};
    for (const idx of picks) {
      set[`seats.${idx}.status`] = "booked";
      set[`seats.${idx}.bookingId`] = new Types.ObjectId();
    }
    if (sold) await Trip.collection.updateOne({ _id: trip._id }, { $set: set });
  }

  await User.findOneAndUpdate({ phone: DEMO_CUSTOMER_PHONE }, { $set: { name: "Demo Customer" }, $setOnInsert: { role: "customer" } }, { upsert: true });
  return summary;
}
