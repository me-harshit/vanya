// DEMO data: replace with API calls when the backend is connected (GET /operator/trips, POST /operator/trips/generate,
// POST /operator/trips/:id/cancel). Rules copied from the backend: at most 62 days at a time, dates in the past are
// skipped, a bus cannot have two trips that overlap in time, and a cancelled trip refunds every passenger in full.

import { useSyncExternalStore } from "react";
import { getBus, type Seat } from "./buses";
import { getRoute } from "./routes";

export const MAX_GENERATE_DAYS = 62;
export const DEFAULT_POLICY = [
  { hours: 24, percent: 90 },
  { hours: 12, percent: 60 },
  { hours: 4, percent: 30 },
  { hours: 0, percent: 0 },
];

export type SeatStatus = "available" | "held" | "booked";
export type Passenger = { name: string; age: number; gender: "male" | "female"; phone: string; bookingId: string };
export type TripSeat = Seat & { price: number; status: SeatStatus; passenger?: Passenger };
export type OpTrip = {
  id: string;
  busId: string;
  busName: string;
  routeId: string;
  from: string;
  to: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMin: number;
  fare: number;
  upperFare: number;
  seats: TripSeat[];
  policy: { hours: number; percent: number }[];
  cancelled: boolean;
};

export function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function startOf(t: Pick<OpTrip, "date" | "time">) {
  const [h, m] = t.time.split(":").map(Number);
  const d = parseDate(t.date);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
export function endOf(t: Pick<OpTrip, "date" | "time" | "durationMin">) {
  return startOf(t) + t.durationMin * 60_000;
}
export function tripStatus(t: OpTrip, now = Date.now()): "scheduled" | "completed" | "cancelled" {
  if (t.cancelled) return "cancelled";
  return startOf(t) <= now ? "completed" : "scheduled";
}
export function counts(t: OpTrip) {
  const booked = t.seats.filter((s) => s.status === "booked");
  return {
    total: t.seats.length,
    booked: booked.length,
    held: t.seats.filter((s) => s.status === "held").length,
    available: t.seats.filter((s) => s.status === "available").length,
    revenue: booked.reduce((n, s) => n + s.price, 0),
  };
}

// ---- Planning (shared by the preview and the real creation) ----------------------------------

export type Schedule = {
  busId: string; routeId: string; time: string; startDate: string; endDate: string; days: number[];
  fare: number; upperFare: number; policy: { hours: number; percent: number }[];
};
export type Plan = { dates: string[]; skipped: { date: string; reason: string }[]; error: string };

export function planTrips(s: Schedule, existing: OpTrip[], now = Date.now()): Plan {
  const route = getRoute(s.routeId);
  if (!route || !s.time || !s.startDate || !s.endDate) return { dates: [], skipped: [], error: "" };
  const span = Math.round((parseDate(s.endDate).getTime() - parseDate(s.startDate).getTime()) / 86_400_000);
  if (span < 0) return { dates: [], skipped: [], error: "The end date is before the start date." };
  if (span + 1 > MAX_GENERATE_DAYS) return { dates: [], skipped: [], error: `You can create at most ${MAX_GENERATE_DAYS} days at a time.` };

  const taken = existing.filter((t) => t.busId === s.busId && !t.cancelled).map((t) => ({ a: startOf(t), b: endOf(t) }));
  const dates: string[] = [];
  const skipped: Plan["skipped"] = [];
  for (let i = 0; i <= span; i++) {
    const date = addDays(s.startDate, i);
    if (!s.days.includes(parseDate(date).getDay())) continue;
    const a = startOf({ date, time: s.time });
    const b = a + route.durationMin * 60_000;
    if (a <= now) { skipped.push({ date, reason: "in the past" }); continue; }
    if (taken.some((t) => t.a < b && t.b > a)) { skipped.push({ date, reason: "the bus already has a trip at that time" }); continue; }
    taken.push({ a, b });
    dates.push(date);
  }
  return { dates, skipped, error: "" };
}

function buildTrip(s: Schedule, date: string, id: string): OpTrip | null {
  const bus = getBus(s.busId);
  const route = getRoute(s.routeId);
  if (!bus || !route) return null;
  return {
    id, busId: bus.id, busName: bus.name, routeId: route.id, from: route.from, to: route.to,
    date, time: s.time, durationMin: route.durationMin, fare: s.fare, upperFare: s.upperFare,
    seats: bus.seats.map((x) => ({ ...x, price: x.deck === "upper" ? s.upperFare : s.fare, status: "available" as const })),
    policy: s.policy, cancelled: false,
  };
}

// ---- Demo data -------------------------------------------------------------------------------

const firstNames = ["Aarav", "Diya", "Rohan", "Meera", "Kabir", "Anita", "Imran", "Priya", "Vikram", "Sunita", "Arjun", "Neha", "Rahul", "Pooja", "Sandeep", "Kavya"];
const lastNames = ["Sharma", "Verma", "Khan", "Nair", "Mehta", "Rao", "Singh", "Patel", "Gupta", "Iyer", "Shah", "Das"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Fills a trip with believable bookings and a couple of seats on hold.
function withBookings(t: OpTrip, fill: number): OpTrip {
  let a = hash(t.id);
  const rand = () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
  const order = t.seats.map((_, i) => i).sort(() => rand() - 0.5);
  const nBooked = Math.round(t.seats.length * fill);
  const seats = t.seats.map((s) => ({ ...s }));
  // Seats are booked in groups of 1 to 3 (one booking, one contact phone).
  let group = 0, left = 0, phone = "";
  order.slice(0, nBooked).forEach((i) => {
    if (left === 0) { group++; left = 1 + Math.floor(rand() * 3); phone = `9${String(Math.floor(100000000 + rand() * 899999999))}`; }
    left--;
    seats[i].status = "booked";
    seats[i].passenger = {
      name: `${firstNames[Math.floor(rand() * firstNames.length)]} ${lastNames[Math.floor(rand() * lastNames.length)]}`,
      age: 18 + Math.floor(rand() * 45), gender: rand() > 0.55 ? "female" : "male",
      phone, bookingId: `VH-${(hash(t.id + group) >>> 0).toString(36).toUpperCase().slice(0, 5)}`,
    };
  });
  order.slice(nBooked, nBooked + (fill > 0.1 ? 2 : 0)).forEach((i) => { seats[i].status = "held"; });
  return { ...t, seats };
}

function seedTrips(): OpTrip[] {
  const out: OpTrip[] = [];
  const today = iso(new Date());
  const plans: { bus: string; route: string; time: string; fare: number; upper: number }[] = [
    { bus: "b1", route: "r3", time: "19:30", fare: 1100, upper: 1000 },
    { bus: "b3", route: "r1", time: "06:30", fare: 520, upper: 520 },
    { bus: "b2", route: "r2", time: "22:00", fare: 780, upper: 700 },
  ];
  for (const p of plans) {
    for (let d = -3; d <= 12; d++) {
      const date = addDays(today, d);
      const s: Schedule = { busId: p.bus, routeId: p.route, time: p.time, startDate: date, endDate: date, days: [0, 1, 2, 3, 4, 5, 6], fare: p.fare, upperFare: p.upper, policy: DEFAULT_POLICY };
      const t = buildTrip(s, date, `T-${p.bus}-${date}`);
      if (!t) continue;
      const fill = d < 0 ? 0.7 : Math.max(0.12, 0.8 - d * 0.06);
      out.push(withBookings(t, fill));
    }
  }
  // One trip that was already cancelled, so the list shows that state.
  const c = out.find((t) => t.date === addDays(today, 5) && t.busId === "b2");
  if (c) c.cancelled = true;
  return out;
}

let trips: OpTrip[] = seedTrips();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useTrips(): OpTrip[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => trips,
  );
}
export function getTrip(id: string | undefined) {
  return trips.find((t) => t.id === id);
}
export function createTrips(s: Schedule): { created: number; skipped: Plan["skipped"]; firstDate: string } {
  const plan = planTrips(s, trips);
  const made = plan.dates.map((d, i) => buildTrip(s, d, `T-${Date.now().toString(36)}-${i}`)).filter((t): t is OpTrip => !!t);
  trips = [...trips, ...made];
  emit();
  return { created: made.length, skipped: plan.skipped, firstDate: plan.dates[0] ?? s.startDate };
}
export function cancelTrip(id: string): { passengers: number; refund: number } {
  const t = getTrip(id);
  if (!t || t.cancelled) return { passengers: 0, refund: 0 };
  const c = counts(t);
  trips = trips.map((x) => (x.id === id ? { ...x, cancelled: true } : x));
  emit();
  return { passengers: c.booked, refund: c.revenue };
}
export function resetDemoTrips() {
  trips = seedTrips();
  emit();
}

// ---- Bookings and earnings, derived from the trips -------------------------------------------

export type OpBooking = {
  id: string; tripId: string; from: string; to: string; date: string; time: string; busName: string;
  seats: string[]; passengers: (Passenger & { seat: string })[]; amount: number;
  status: "confirmed" | "completed" | "cancelled";
};

export function bookingsOf(list: OpTrip[], now = Date.now()): OpBooking[] {
  const out: OpBooking[] = [];
  for (const t of list) {
    const groups = new Map<string, OpBooking>();
    for (const s of t.seats) {
      if (s.status !== "booked" || !s.passenger) continue;
      const g = groups.get(s.passenger.bookingId) ?? {
        id: s.passenger.bookingId, tripId: t.id, from: t.from, to: t.to, date: t.date, time: t.time, busName: t.busName,
        seats: [], passengers: [], amount: 0, status: tripStatus(t, now) === "cancelled" ? "cancelled" : startOf(t) <= now ? "completed" : "confirmed",
      } as OpBooking;
      g.seats.push(s.no); g.passengers.push({ ...s.passenger, seat: s.no }); g.amount += s.price;
      groups.set(s.passenger.bookingId, g);
    }
    out.push(...groups.values());
  }
  return out;
}
