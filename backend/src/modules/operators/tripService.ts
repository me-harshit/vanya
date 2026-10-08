import { z } from "zod";
import { DEFAULT_CANCELLATION_POLICY, MAX_GENERATE_DAYS } from "../../constants.js";
import { AppError } from "../../errors.js";
import { addDays, addMinutes, daysBetween, isValidDate, istDate, istToUtc, TIME_REGEX, weekday } from "../../lib/time.js";
import { BoardingPoint } from "../../models/BoardingPoint.js";
import { Bus } from "../../models/Bus.js";
import { City } from "../../models/City.js";
import { Route } from "../../models/Route.js";
import { Trip } from "../../models/Trip.js";

export const policySchema = z
  .array(
    z.object({
      hoursBeforeDeparture: z.number().min(0).max(720),
      refundPercent: z.number().min(0).max(100),
    }),
  )
  .min(1)
  .max(8)
  .refine(
    (rules) =>
      rules.every(
        (r, i) =>
          i === 0 || (r.hoursBeforeDeparture < rules[i - 1].hoursBeforeDeparture && r.refundPercent <= rules[i - 1].refundPercent),
      ),
    "Rules must go from the most hours before departure down, with refunds that never increase",
  );

const fare = z.number().int().min(1).max(100_000);

export const tripFields = {
  bus: z.string().regex(/^[a-f\d]{24}$/i),
  route: z.string().regex(/^[a-f\d]{24}$/i),
  fare,
  upperFare: fare.optional(),
  cancellationPolicy: policySchema.optional(),
};

export const singleTripBody = z.object({
  ...tripFields,
  departureAt: z.string().datetime({ offset: true }),
});

export const generateBody = z.object({
  ...tripFields,
  departureTime: z.string().regex(TIME_REGEX, "Use 24-hour HH:mm, for example 21:30"),
  startDate: z.string().refine(isValidDate, "Use YYYY-MM-DD"),
  endDate: z.string().refine(isValidDate, "Use YYYY-MM-DD"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
});

type Common = z.infer<z.ZodObject<typeof tripFields>>;

/** Loads the operator's bus and route and everything needed to build trips. */
export async function loadContext(op: { id?: string; businessName: string }, input: Common) {
  const operator = { id: op.id as string, businessName: op.businessName };
  const [bus, route] = await Promise.all([
    Bus.findOne({ _id: input.bus, operator: operator.id, isActive: true }),
    Route.findOne({ _id: input.route, operator: operator.id, isActive: true }),
  ]);
  if (!bus) throw new AppError(404, "BUS_NOT_FOUND", "Bus not found or not active.");
  if (!route) throw new AppError(404, "ROUTE_NOT_FOUND", "Route not found or not active.");

  const [cities, points] = await Promise.all([
    City.find({ _id: { $in: [route.fromCity, route.toCity] } }),
    BoardingPoint.find({
      _id: { $in: [...route.boardingPoints, ...route.droppingPoints].map((s) => s.point) },
    }),
  ]);
  const from = cities.find((c) => c.id === String(route.fromCity));
  const to = cities.find((c) => c.id === String(route.toCity));
  if (!from || !to) throw new AppError(409, "ROUTE_BROKEN", "A city on this route no longer exists.");

  return { operator, bus, route, from, to, points, input };
}

type Ctx = Awaited<ReturnType<typeof loadContext>>;

function buildSeats(ctx: Ctx) {
  const upper = ctx.input.upperFare ?? ctx.input.fare;
  return ctx.bus.seats.map((s) => ({
    no: s.no,
    deck: s.deck,
    row: s.row,
    col: s.col,
    kind: s.kind,
    ladies: s.ladies,
    price: s.deck === "upper" ? upper : ctx.input.fare,
    status: "available" as const,
  }));
}

function buildStops(ctx: Ctx, stops: { point: unknown; offsetMinutes: number }[], departureAt: Date) {
  return stops.map((s) => {
    const p = ctx.points.find((x) => x.id === String(s.point));
    if (!p) throw new AppError(409, "ROUTE_BROKEN", "A stop on this route no longer exists.");
    return { point: p.id, name: p.name, address: p.address, landmark: p.landmark, time: addMinutes(departureAt, s.offsetMinutes) };
  });
}

export function buildTripDoc(ctx: Ctx, departureAt: Date) {
  return {
    operator: ctx.operator.id,
    operatorName: ctx.operator.businessName,
    bus: ctx.bus.id,
    busInfo: { name: ctx.bus.name, type: ctx.bus.type, ac: ctx.bus.ac, amenities: ctx.bus.amenities },
    route: ctx.route.id,
    fromCity: ctx.from.id,
    toCity: ctx.to.id,
    fromCityName: ctx.from.name,
    toCityName: ctx.to.name,
    distanceKm: ctx.route.distanceKm,
    durationMinutes: ctx.route.durationMinutes,
    departureAt,
    arrivalAt: addMinutes(departureAt, ctx.route.durationMinutes),
    boardingPoints: buildStops(ctx, ctx.route.boardingPoints, departureAt),
    droppingPoints: buildStops(ctx, ctx.route.droppingPoints, departureAt),
    seats: buildSeats(ctx),
    cancellationPolicy: ctx.input.cancellationPolicy ?? DEFAULT_CANCELLATION_POLICY,
  };
}

/** True if the bus already has a (non-cancelled) trip overlapping this time window. */
async function busIsBusy(busId: string, start: Date, end: Date) {
  return Trip.exists({ bus: busId, status: { $ne: "cancelled" }, departureAt: { $lt: end }, arrivalAt: { $gt: start } });
}

export async function createSingleTrip(ctx: Ctx, departureAt: Date) {
  if (departureAt.getTime() <= Date.now()) {
    throw new AppError(400, "IN_THE_PAST", "The departure time must be in the future.");
  }
  const doc = buildTripDoc(ctx, departureAt);
  if (await busIsBusy(ctx.bus.id, doc.departureAt, doc.arrivalAt)) {
    throw new AppError(409, "BUS_BUSY", "This bus already has a trip at that time.");
  }
  return Trip.create(doc);
}

export async function generateTrips(ctx: Ctx, p: z.infer<typeof generateBody>) {
  const span = daysBetween(p.startDate, p.endDate);
  if (span < 0) throw new AppError(400, "INVALID_RANGE", "The end date is before the start date.");
  if (span + 1 > MAX_GENERATE_DAYS) {
    throw new AppError(400, "INVALID_RANGE", `Generate at most ${MAX_GENERATE_DAYS} days at a time.`);
  }
  if (p.endDate < istDate(new Date())) {
    throw new AppError(400, "IN_THE_PAST", "The date range is entirely in the past.");
  }

  const days = Array.from({ length: span + 1 }, (_, i) => addDays(p.startDate, i)).filter(
    (d) => !p.daysOfWeek || p.daysOfWeek.includes(weekday(d)),
  );

  // Load the bus's existing trips in the window once, then check overlaps in memory.
  const windowStart = istToUtc(addDays(p.startDate, -1));
  const windowEnd = istToUtc(addDays(p.endDate, 3));
  const existing = await Trip.find(
    { bus: ctx.bus.id, status: { $ne: "cancelled" }, departureAt: { $lt: windowEnd }, arrivalAt: { $gt: windowStart } },
    { departureAt: 1, arrivalAt: 1 },
  );
  const taken = existing.map((t) => ({ start: t.departureAt.getTime(), end: t.arrivalAt.getTime() }));

  const docs: ReturnType<typeof buildTripDoc>[] = [];
  const skipped: { date: string; reason: string }[] = [];
  for (const date of days) {
    const departureAt = istToUtc(date, p.departureTime);
    if (departureAt.getTime() <= Date.now()) {
      skipped.push({ date, reason: "in the past" });
      continue;
    }
    const doc = buildTripDoc(ctx, departureAt);
    const s = doc.departureAt.getTime();
    const e = doc.arrivalAt.getTime();
    if (taken.some((t) => t.start < e && t.end > s)) {
      skipped.push({ date, reason: "bus already has a trip at that time" });
      continue;
    }
    taken.push({ start: s, end: e });
    docs.push(doc);
  }

  const created = docs.length ? await Trip.insertMany(docs) : [];
  return { created: created.length, skipped, tripIds: created.map((t) => t.id) };
}
