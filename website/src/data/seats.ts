// SAMPLE DATA: replace with the real trip seat map (GET /trips/:id) later.
// The Seat shape mirrors the backend layout (deck, row, col, kind), so the same data drives the real screen.

import { type Trip } from "./trips";

export type Deck = "lower" | "upper";
export type Gender = "male" | "female";
export type Seat = { no: string; deck: Deck; row: number; col: number; kind: "seater" | "sleeper" };

export const MAX_SEATS_PER_BOOKING = 6; // same limit as the backend (MAX_SEATS_PER_HOLD)
const LETTERS = "ABCD";

// Same templates as the backend: seater 2+2 on one deck, sleeper 2+1 on two decks.
export function layoutFor(trip: Trip): Seat[] {
  const seats: Seat[] = [];
  if (trip.kind === "seater") {
    for (let r = 0; r < 10; r++) {
      [0, 1, 3, 4].forEach((col, i) => seats.push({ no: `${r + 1}${LETTERS[i]}`, deck: "lower", row: r, col, kind: "seater" }));
    }
  } else {
    for (const deck of ["lower", "upper"] as const) {
      const p = deck === "lower" ? "L" : "U";
      for (let r = 0; r < 6; r++) {
        [0, 1, 3].forEach((col, i) => seats.push({ no: `${p}${r + 1}${LETTERS[i]}`, deck, row: r, col, kind: "sleeper" }));
      }
    }
  }
  return seats;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Which seats are already booked, and by whom, so the number matches "N seats left" on the results card.
export function bookedFor(trip: Trip, seats: Seat[], date: string): Map<string, Gender> {
  let a = hash(`${trip.id}|${date}`);
  const rand = () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
  const order = [...seats].sort(() => rand() - 0.5);
  const count = Math.max(0, Math.min(seats.length - trip.seatsLeft, seats.length));
  const map = new Map<string, Gender>();
  order.slice(0, count).forEach((s) => map.set(s.no, rand() > 0.45 ? "male" : "female"));
  return map;
}
