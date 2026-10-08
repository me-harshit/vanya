import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { TRIP_STATUSES } from "../../constants.js";
import { AppError } from "../../errors.js";
import { idParam, pageQuery } from "../../lib/ids.js";
import { isValidDate, istDayRange } from "../../lib/time.js";
import { Booking } from "../../models/Booking.js";
import { Trip } from "../../models/Trip.js";
import type { BookingService } from "../bookings/bookings.service.js";
import { summaryProject, serializeSummary } from "../trips/summary.js";
import { createSingleTrip, generateBody, generateTrips, loadContext, singleTripBody } from "./tripService.js";

const listQuery = pageQuery.extend({
  from: z.string().refine(isValidDate, "Use YYYY-MM-DD").optional(),
  to: z.string().refine(isValidDate, "Use YYYY-MM-DD").optional(),
  status: z.enum(TRIP_STATUSES).optional(),
  bus: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

export function tripRoutes(bookings: BookingService) {
  const r = Router();

  r.get("/", async (req, res) => {
    const q = listQuery.parse(req.query);
    const departure: Record<string, Date> = {};
    if (q.from) departure.$gte = istDayRange(q.from).start;
    if (q.to) departure.$lt = istDayRange(q.to).end;

    const rows = await Trip.aggregate([
      {
        $match: {
          operator: new Types.ObjectId(req.operator!.id),
          ...(q.status ? { status: q.status } : {}),
          ...(q.bus ? { bus: new Types.ObjectId(q.bus) } : {}),
          ...(Object.keys(departure).length ? { departureAt: departure } : {}),
        },
      },
      { $sort: { departureAt: 1 } },
      { $skip: q.skip },
      { $limit: q.limit },
      summaryProject(new Date()),
    ]);
    res.json({ items: rows.map(serializeSummary) });
  });

  r.post("/", async (req, res) => {
    const body = singleTripBody.parse(req.body);
    const ctx = await loadContext(req.operator!, body);
    const trip = await createSingleTrip(ctx, new Date(body.departureAt));
    res.status(201).json({ trip });
  });

  // Create trips for many days from one daily departure time.
  r.post("/generate", async (req, res) => {
    const body = generateBody.parse(req.body);
    const ctx = await loadContext(req.operator!, body);
    const result = await generateTrips(ctx, body);
    res.status(201).json(result);
  });

  // Full trip including every seat's status, for the operator's own trips only.
  r.get("/:id", async (req, res) => {
    const trip = await Trip.findOne({ _id: idParam(req.params.id), operator: req.operator!.id });
    if (!trip) throw new AppError(404, "NOT_FOUND", "Trip not found.");
    res.json({ trip });
  });

  // Passenger list for a trip: who is sitting where, and where they board.
  r.get("/:id/manifest", async (req, res) => {
    const id = idParam(req.params.id);
    const trip = await Trip.findOne({ _id: id, operator: req.operator!.id }, { departureAt: 1, fromCityName: 1, toCityName: 1, seats: 1 });
    if (!trip) throw new AppError(404, "NOT_FOUND", "Trip not found.");

    const bookings = await Booking.find({ trip: id, status: "confirmed" }).sort({ "boardingPoint.time": 1 });
    const passengers = bookings.flatMap((b) =>
      b.passengers.map((p) => ({
        seatNo: p.seatNo, name: p.name, age: p.age, gender: p.gender,
        pnr: b.pnr, phone: b.contact.phone,
        boardingPoint: b.boardingPoint.name, boardingTime: b.boardingPoint.time, droppingPoint: b.droppingPoint.name,
      })),
    );
    passengers.sort((a, b) => a.seatNo.localeCompare(b.seatNo, undefined, { numeric: true }));
    res.json({
      trip: { id, from: trip.fromCityName, to: trip.toCityName, departureAt: trip.departureAt },
      bookedSeats: passengers.length,
      totalSeats: trip.seats.length,
      passengers,
    });
  });

  // Cancel a trip. Every confirmed booking is cancelled and refunded in full (including the fee).
  r.post("/:id/cancel", async (req, res) => {
    const id = idParam(req.params.id);
    const trip = await Trip.findOneAndUpdate({ _id: id, operator: req.operator!.id, status: "scheduled" }, { status: "cancelled" }, { new: true });
    if (!trip) {
      const existing = await Trip.findOne({ _id: id, operator: req.operator!.id }, { status: 1 });
      if (!existing) throw new AppError(404, "NOT_FOUND", "Trip not found.");
      throw new AppError(409, "NOT_SCHEDULED", "This trip is not scheduled.");
    }
    const bookingsCancelled = await bookings.cancelBookingsForTrip(id);
    res.json({ trip, bookingsCancelled });
  });

  return r;
}
