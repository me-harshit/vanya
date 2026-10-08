import type { Document } from "mongodb";
import { Types } from "mongoose";
import { config } from "../../config.js";
import { BOOKING_CUTOFF_MINUTES, MAX_HOLD_TRIPS_PER_USER } from "../../constants.js";
import { AppError } from "../../errors.js";
import { addMinutes } from "../../lib/time.js";
import { Trip } from "../../models/Trip.js";

/**
 * THE SEAT HOLD ENGINE. This is the code that stops two people buying the same seat.
 *
 * All seats of a trip live inside ONE document, and MongoDB updates a single document atomically.
 * Every operation here is one `findOneAndUpdate` whose filter says "only if these seats are still
 * free" and whose update changes them. Either the whole thing happens or nothing does, even when
 * hundreds of requests arrive at the same moment. There are no locks and no read-then-write steps
 * for the decision itself (reads below are only used to explain a failure).
 *
 * A seat is free when it is "available", or "held" with a hold that has run out.
 */

const oid = (id: string) => new Types.ObjectId(id);

// Seat -> the same seat, free again (hold and booking fields removed).
const freed = (seat: string) => ({
  $unsetField: {
    field: "heldUntil",
    input: { $unsetField: { field: "heldBy", input: { $mergeObjects: [seat, { status: "available" }] } } },
  },
});

type SeatDoc = {
  no: string; deck: string; row: number; col: number; kind: string; ladies: boolean; price: number;
  status: "available" | "held" | "booked"; heldUntil?: Date; heldBy?: Types.ObjectId; bookingId?: Types.ObjectId;
};

export type Hold = {
  tripId: string;
  seats: { no: string; deck: string; kind: string; price: number }[];
  totalPrice: number;
  expiresAt: Date;
  expiresInSeconds: number;
};

/** The customer's live hold on a trip, worked out from the trip's seats. null if none. */
function holdFromSeats(tripId: string, seats: SeatDoc[], userId: string, now: Date): Hold | null {
  const mine = seats.filter((s) => s.status === "held" && String(s.heldBy) === userId && s.heldUntil && s.heldUntil > now);
  if (!mine.length) return null;
  const expiresAt = new Date(Math.min(...mine.map((s) => s.heldUntil!.getTime())));
  return {
    tripId,
    seats: mine.map((s) => ({ no: s.no, deck: s.deck, kind: s.kind, price: s.price })),
    totalPrice: mine.reduce((sum, s) => sum + s.price, 0),
    expiresAt,
    expiresInSeconds: Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 1000)),
  };
}

function canTake(s: SeatDoc, userId: string, now: Date) {
  return s.status === "available" || (s.status === "held" && (String(s.heldBy) === userId || !s.heldUntil || s.heldUntil <= now));
}

/**
 * Hold seats for a customer. All the requested seats are taken together, or none are.
 *
 * - Calling it again replaces the customer's earlier hold on this trip: seats they dropped are
 *   freed and new ones are taken in the same atomic step.
 * - The timer is NOT extended by changing the selection, so nobody can keep seats forever.
 */
export async function holdSeats(tripId: string, userId: string, seatNos: string[]): Promise<Hold> {
  const now = new Date();
  const uid = oid(userId);
  const nos = [...new Set(seatNos)];

  // A customer may hold seats on only a few trips at a time (this trip does not count against that).
  const elsewhere = await Trip.countDocuments({
    _id: { $ne: tripId },
    seats: { $elemMatch: { status: "held", heldBy: uid, heldUntil: { $gt: now } } },
  });
  if (elsewhere >= MAX_HOLD_TRIPS_PER_USER) {
    throw new AppError(429, "TOO_MANY_HOLDS", "Finish or release your other held seats first.");
  }

  const takeable = (no: string) => ({
    seats: {
      $elemMatch: {
        no,
        $or: [
          { status: "available" },
          { status: "held", heldUntil: { $lte: now } }, // somebody's hold ran out
          { status: "held", heldBy: uid }, // already mine
        ],
      },
    },
  });

  const freshExpiry = addMinutes(now, config.HOLD_MINUTES);
  const updated = await Trip.collection.findOneAndUpdate(
    {
      _id: oid(tripId),
      status: "scheduled",
      departureAt: { $gt: addMinutes(now, BOOKING_CUTOFF_MINUTES) },
      $and: nos.map(takeable),
    },
    [
      // The customer's current live timer, if they already hold seats here (it is kept, not reset).
      {
        $set: {
          _mine: {
            $min: {
              $map: {
                input: {
                  $filter: {
                    input: "$seats",
                    as: "m",
                    cond: { $and: [{ $eq: ["$$m.status", "held"] }, { $eq: ["$$m.heldBy", uid] }, { $gt: ["$$m.heldUntil", now] }] },
                  },
                },
                as: "x",
                in: "$$x.heldUntil",
              },
            },
          },
        },
      },
      {
        $set: {
          seats: {
            $map: {
              input: "$seats",
              as: "s",
              in: {
                $switch: {
                  branches: [
                    {
                      case: { $in: ["$$s.no", nos] },
                      then: { $mergeObjects: ["$$s", { status: "held", heldBy: uid, heldUntil: { $ifNull: ["$_mine", freshExpiry] } }] },
                    },
                    // Seats the customer held before but did not ask for this time are let go.
                    { case: { $and: [{ $eq: ["$$s.status", "held"] }, { $eq: ["$$s.heldBy", uid] }] }, then: freed("$$s") },
                  ],
                  default: "$$s",
                },
              },
            },
          },
        },
      },
      { $unset: "_mine" },
    ] as Document[],
    { returnDocument: "after", projection: { seats: 1 } },
  );

  if (updated) {
    const hold = holdFromSeats(tripId, updated.seats as SeatDoc[], userId, now);
    if (hold) return hold;
  }

  // It did not work. Look at the trip only to give a useful reason.
  const trip = await Trip.findById(tripId, { status: 1, departureAt: 1, seats: 1 }).lean();
  if (!trip) throw new AppError(404, "NOT_FOUND", "Trip not found.");
  if (trip.status !== "scheduled" || trip.departureAt <= addMinutes(now, BOOKING_CUTOFF_MINUTES)) {
    throw new AppError(409, "TRIP_CLOSED", "Bookings are closed for this trip.");
  }
  const bySeat = new Map((trip.seats as SeatDoc[]).map((s) => [s.no, s]));
  const unknown = nos.filter((n) => !bySeat.has(n));
  if (unknown.length) throw new AppError(400, "UNKNOWN_SEAT", "Some seats do not exist on this bus.", { seats: unknown });
  const unavailable = nos.filter((n) => !canTake(bySeat.get(n)!, userId, now));
  throw new AppError(409, "SEATS_UNAVAILABLE", "Some of those seats were just taken. Please choose again.", { seats: unavailable });
}

export async function getHold(tripId: string, userId: string): Promise<Hold | null> {
  const trip = await Trip.findById(tripId, { seats: 1 }).lean();
  if (!trip) throw new AppError(404, "NOT_FOUND", "Trip not found.");
  return holdFromSeats(tripId, trip.seats as SeatDoc[], userId, new Date());
}

/** Let go of everything the customer holds on this trip. Safe to call twice. */
export async function releaseSeats(tripId: string, userId: string): Promise<boolean> {
  const uid = oid(userId);
  const res = await Trip.collection.updateOne(
    { _id: oid(tripId), seats: { $elemMatch: { status: "held", heldBy: uid } } },
    [
      {
        $set: {
          seats: {
            $map: {
              input: "$seats",
              as: "s",
              in: { $cond: [{ $and: [{ $eq: ["$$s.status", "held"] }, { $eq: ["$$s.heldBy", uid] }] }, freed("$$s"), "$$s"] },
            },
          },
        },
      },
    ] as Document[],
  );
  return res.modifiedCount > 0;
}

/**
 * Turn held seats into booked seats once payment succeeds (called by the booking flow).
 *
 * By default the customer's hold must still be live. With `allowExpiredHold` the booking still goes
 * through if the hold ran out but nobody else has taken the seats in the meantime, which covers
 * "paid just after the timer ended". Returns false if the seats can no longer be given to this
 * customer, and the caller must then refund the payment.
 */
export async function confirmSeats(
  tripId: string,
  userId: string,
  seatNos: string[],
  bookingId: string,
  opts: { allowExpiredHold?: boolean } = {},
): Promise<boolean> {
  const now = new Date();
  const uid = oid(userId);
  const bid = oid(bookingId);
  const nos = [...new Set(seatNos)];

  // A seat already booked under THIS booking counts as success, so calling this twice (after a
  // crash, or a retried webhook) is harmless and never mistaken for "seats gone".
  const alreadyMine = { status: "booked", bookingId: bid };
  const ok = (no: string) =>
    opts.allowExpiredHold
      ? {
          seats: {
            $elemMatch: {
              no,
              $or: [
                { status: "available" },
                { status: "held", heldBy: uid },
                { status: "held", heldUntil: { $lte: now } },
                alreadyMine,
              ],
            },
          },
        }
      : {
          seats: {
            $elemMatch: { no, $or: [{ status: "held", heldBy: uid, heldUntil: { $gt: now } }, alreadyMine] },
          },
        };

  const res = await Trip.collection.updateOne(
    { _id: oid(tripId), status: "scheduled", departureAt: { $gt: now }, $and: nos.map(ok) },
    [
      {
        $set: {
          seats: {
            $map: {
              input: "$seats",
              as: "s",
              in: {
                $cond: [
                  { $in: ["$$s.no", nos] },
                  {
                    $unsetField: {
                      field: "heldUntil",
                      input: {
                        $unsetField: { field: "heldBy", input: { $mergeObjects: ["$$s", { status: "booked", bookingId: bid }] } },
                      },
                    },
                  },
                  "$$s",
                ],
              },
            },
          },
        },
      },
    ] as Document[],
  );
  // "matched" (not "modified"): on a repeat call nothing changes, but the seats are still ours.
  return res.matchedCount === 1;
}

/** Give a cancelled booking's seats back (used when a booking is cancelled or refunded). */
export async function releaseBookedSeats(tripId: string, bookingId: string): Promise<boolean> {
  const bid = oid(bookingId);
  const res = await Trip.collection.updateOne(
    { _id: oid(tripId), seats: { $elemMatch: { bookingId: bid } } },
    [
      {
        $set: {
          seats: {
            $map: {
              input: "$seats",
              as: "s",
              in: {
                $cond: [
                  { $eq: ["$$s.bookingId", bid] },
                  { $unsetField: { field: "bookingId", input: { $mergeObjects: ["$$s", { status: "available" }] } } },
                  "$$s",
                ],
              },
            },
          },
        },
      },
    ] as Document[],
  );
  return res.modifiedCount === 1;
}

/** Tidies up: marks every hold that has run out as available again. Returns how many trips changed. */
export async function sweepExpiredHolds(now = new Date()): Promise<number> {
  const res = await Trip.collection.updateMany(
    {
      departureAt: { $gt: addMinutes(now, -24 * 60) },
      seats: { $elemMatch: { status: "held", heldUntil: { $lte: now } } },
    },
    [
      {
        $set: {
          seats: {
            $map: {
              input: "$seats",
              as: "s",
              in: { $cond: [{ $and: [{ $eq: ["$$s.status", "held"] }, { $lte: ["$$s.heldUntil", now] }] }, freed("$$s"), "$$s"] },
            },
          },
        },
      },
    ] as Document[],
  );
  return res.modifiedCount;
}

/** Runs the sweep every minute for as long as the server is up. */
export function startHoldSweeper(everyMs = 60_000) {
  const timer = setInterval(() => {
    sweepExpiredHolds().catch((err) => console.error("Hold sweep failed", err));
  }, everyMs);
  timer.unref();
  return () => clearInterval(timer);
}
