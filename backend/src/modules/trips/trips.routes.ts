import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { BUS_TYPES } from "../../constants.js";
import { AppError } from "../../errors.js";
import { idParam } from "../../lib/ids.js";
import { isValidDate, istDayRange } from "../../lib/time.js";
import { MAX_SEATS_PER_HOLD } from "../../constants.js";
import { requireAuth } from "../../middleware/auth.js";
import { City } from "../../models/City.js";
import { Trip } from "../../models/Trip.js";
import { getHold, holdSeats, releaseSeats } from "./seatHold.js";
import { serializeSummary, summaryProject } from "./summary.js";

const holdBody = z.object({
  seats: z
    .array(z.string().regex(/^[A-Za-z0-9]{1,6}$/, "Invalid seat number"))
    .min(1, "Choose at least one seat")
    .max(MAX_SEATS_PER_HOLD, `You can hold at most ${MAX_SEATS_PER_HOLD} seats at a time`)
    .refine((a) => new Set(a).size === a.length, "A seat is listed twice"),
});

const searchQuery = z.object({
  from: z.string().trim().min(1), // a city id or slug
  to: z.string().trim().min(1),
  date: z.string().refine(isValidDate, "Use YYYY-MM-DD"),
  ac: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  type: z.enum(BUS_TYPES).optional(),
  sort: z.enum(["departure", "fare", "duration"]).default("departure"),
});

async function resolveCity(idOrSlug: string) {
  const isId = /^[a-f\d]{24}$/i.test(idOrSlug);
  const city = await City.findOne(isId ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() });
  if (!city || !city.isActive) throw new AppError(404, "CITY_NOT_FOUND", `City "${idOrSlug}" was not found.`);
  return city;
}

// A held seat whose hold has run out is shown as available.
function effectiveStatus(s: { status: string; heldUntil?: Date | null }, now: Date) {
  return s.status === "held" && (!s.heldUntil || s.heldUntil <= now) ? "available" : s.status;
}

// Public: no sign-in needed to browse.
export function publicTripRoutes() {
  const r = Router();

  r.get("/search", async (req, res) => {
    const q = searchQuery.parse(req.query);
    const [from, to] = await Promise.all([resolveCity(q.from), resolveCity(q.to)]);
    if (from.id === to.id) throw new AppError(400, "SAME_CITY", "Choose two different cities.");

    const now = new Date();
    const day = istDayRange(q.date);
    const sort: Record<string, 1 | -1> =
      q.sort === "fare" ? { fareFrom: 1, departureAt: 1 } : q.sort === "duration" ? { durationMinutes: 1, departureAt: 1 } : { departureAt: 1 };

    const rows = await Trip.aggregate([
      {
        $match: {
          fromCity: new Types.ObjectId(from.id),
          toCity: new Types.ObjectId(to.id),
          status: "scheduled",
          // Never show buses that have already left.
          departureAt: { $gte: day.start > now ? day.start : now, $lt: day.end },
          ...(q.ac !== undefined ? { "busInfo.ac": q.ac } : {}),
          ...(q.type ? { "busInfo.type": q.type } : {}),
        },
      },
      summaryProject(now),
      { $sort: sort },
      { $limit: 100 },
    ]);

    res.json({
      from: { id: from.id, name: from.name },
      to: { id: to.id, name: to.name },
      date: q.date,
      items: rows.map(serializeSummary),
    });
  });

  // ---- Seat holds (signed-in customers). A hold keeps seats for HOLD_MINUTES while they pay.

  // Hold seats (all or none). Calling again changes the selection without extending the timer.
  r.post("/:id/hold", requireAuth, async (req, res) => {
    const { seats } = holdBody.parse(req.body);
    res.json({ hold: await holdSeats(idParam(req.params.id), req.user!.id, seats) });
  });

  // The customer's current hold on this trip (null if none), so the app can resume the countdown.
  r.get("/:id/hold", requireAuth, async (req, res) => {
    res.json({ hold: await getHold(idParam(req.params.id), req.user!.id) });
  });

  // Let go of the held seats (for example when the customer goes back).
  r.delete("/:id/hold", requireAuth, async (req, res) => {
    await releaseSeats(idParam(req.params.id), req.user!.id);
    res.json({ hold: null });
  });

  r.get("/:id", async (req, res) => {
    const trip = await Trip.findOne({ _id: idParam(req.params.id) });
    if (!trip) throw new AppError(404, "NOT_FOUND", "Trip not found.");
    const now = new Date();

    res.json({
      trip: {
        id: trip.id,
        status: trip.status,
        operatorName: trip.operatorName,
        busInfo: trip.busInfo,
        fromCity: { id: String(trip.fromCity), name: trip.fromCityName },
        toCity: { id: String(trip.toCity), name: trip.toCityName },
        distanceKm: trip.distanceKm,
        durationMinutes: trip.durationMinutes,
        departureAt: trip.departureAt,
        arrivalAt: trip.arrivalAt,
        boardingPoints: trip.boardingPoints.map((p) => ({ id: String(p.point), name: p.name, address: p.address, landmark: p.landmark, time: p.time })),
        droppingPoints: trip.droppingPoints.map((p) => ({ id: String(p.point), name: p.name, address: p.address, landmark: p.landmark, time: p.time })),
        cancellationPolicy: trip.cancellationPolicy,
        // Other people's holds and bookings are not exposed, only whether each seat can be picked.
        seats: trip.seats.map((s) => ({
          no: s.no, deck: s.deck, row: s.row, col: s.col, kind: s.kind, ladies: s.ladies, price: s.price,
          status: effectiveStatus(s, now),
        })),
      },
    });
  });

  return r;
}
