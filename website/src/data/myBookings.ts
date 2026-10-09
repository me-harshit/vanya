// DEMO bookings: replace with the real API (GET /bookings, POST /bookings/:id/cancel) later.
// Bookings live in this browser (localStorage). Demo bookings are created relative to "now",
// so there are always some upcoming, some completed and one cancelled.

import { useSyncExternalStore } from "react";
import { type Draft, type Passenger, totalsFor } from "./booking";
import { tierFor } from "./policy";
import { pointsFor, type Trip } from "./trips";

export type BookingRecord = {
  id: string;
  operator: string;
  busName: string;
  layout: string;
  from: string;
  to: string;
  date: string; // YYYY-MM-DD, departure day
  depMin: number;
  durMin: number;
  boarding: { name: string; time: number };
  dropping: { name: string; time: number };
  passengers: Passenger[];
  phone: string;
  email: string;
  coupon: string;
  method: string;
  pricing: { base: number; discount: number; fee: number; total: number };
  createdAt: number;
  status: "confirmed" | "cancelled";
  cancellation?: { at: number; hoursBefore: number; percent: number; refund: number; kept: number; reason: string };
};

const KEY = "vanya-my-bookings";

export function departureOf(r: Pick<BookingRecord, "date" | "depMin">): Date {
  const [y, m, d] = r.date.split("-").map(Number);
  return new Date(y, m - 1, d, 0, r.depMin);
}
export function hoursLeft(r: BookingRecord, now = Date.now()) {
  return (departureOf(r).getTime() - now) / 3_600_000;
}
export function kindOf(r: BookingRecord, now = Date.now()): "upcoming" | "completed" | "cancelled" {
  if (r.status === "cancelled") return "cancelled";
  return departureOf(r).getTime() > now ? "upcoming" : "completed";
}

// What the customer would get back if they cancelled right now.
export function refundQuote(r: BookingRecord, now = Date.now()) {
  const h = hoursLeft(r, now);
  const tier = tierFor(h);
  const refundable = r.pricing.total - r.pricing.fee; // the convenience fee is never refunded
  const refund = Math.round((refundable * tier.percent) / 100);
  return { hours: h, tier, refundable, refund, kept: r.pricing.total - refund };
}

export function recordFromDraft(d: Draft, trip: Trip): BookingRecord {
  const pts = pointsFor(trip);
  const b = pts.boarding.find((x) => x.id === d.bp) ?? pts.boarding[0];
  const dr = pts.dropping.find((x) => x.id === d.dp) ?? pts.dropping[0];
  return {
    id: d.pnr ?? "",
    operator: trip.operator, busName: trip.busName, layout: trip.layout,
    from: d.from, to: d.to, date: d.date, depMin: trip.depMin, durMin: trip.durMin,
    boarding: { name: b.name, time: b.time }, dropping: { name: dr.name, time: dr.time },
    passengers: d.passengers, phone: d.phone, email: d.email, coupon: d.coupon, method: d.method ?? "upi",
    pricing: totalsFor(trip, d.seats.length, d.coupon, d.date),
    createdAt: d.paidAt ?? Date.now(), status: "confirmed",
  };
}

// ---- Demo seed ---------------------------------------------------------------------------

function iso(t: Date) {
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function seedRecord(id: string, hoursFromNow: number, o: Partial<BookingRecord> & Pick<BookingRecord, "operator" | "busName" | "layout" | "from" | "to" | "durMin" | "passengers"> & { fare: number }): BookingRecord {
  const t = new Date(Date.now() + hoursFromNow * 3_600_000);
  const depMin = Math.round((t.getHours() * 60 + t.getMinutes()) / 5) * 5;
  const base = o.fare * o.passengers.length;
  const { fare: _fare, ...rest } = o;
  void _fare;
  return {
    id, date: iso(t), depMin: depMin % 1440,
    boarding: { name: "Main Bus Stand", time: depMin - 30 },
    dropping: { name: "City Center", time: depMin + o.durMin },
    phone: "9812345670", email: "", coupon: "", method: "upi",
    pricing: { base, discount: 0, fee: 0, total: base },
    createdAt: Date.now() - 86_400_000 * 2, status: "confirmed",
    ...rest,
  };
}

const px = (n: string, a: string, g: Passenger["gender"], seat: string): Passenger => ({ name: n, age: a, gender: g, seat });

function seed(): BookingRecord[] {
  return [
    seedRecord("VH-7K3Q9A", 30, { operator: "Himalayan Express", busName: "Volvo 9400 AC Sleeper", layout: "2+1", from: "Delhi", to: "Manali", durMin: 750, fare: 1100, passengers: [px("Asha Verma", "29", "female", "L4A"), px("Rohan Verma", "32", "male", "L4B")] }),
    seedRecord("VH-2M8TXB", 8, { operator: "Rajdhani Lines", busName: "Volvo B11R AC Seater", layout: "2+2", from: "Delhi", to: "Jaipur", durMin: 345, fare: 520, passengers: [px("Asha Verma", "29", "female", "7C")] }),
    seedRecord("VH-9P4WLD", 72, { operator: "Sunrise Travels", busName: "Scania AC Sleeper", layout: "2+1", from: "Mumbai", to: "Goa", durMin: 720, fare: 900, passengers: [px("Asha Verma", "29", "female", "U2A"), px("Meera Shah", "41", "female", "U2B"), px("Kabir Shah", "9", "male", "U3A")] }),
    seedRecord("VH-5H1CNE", -120, { operator: "Blue Star Tours", busName: "AC Semi-sleeper", layout: "2+2", from: "Mumbai", to: "Pune", durMin: 210, fare: 350, passengers: [px("Asha Verma", "29", "female", "3A")] }),
    seedRecord("VH-3R6YFG", -288, { operator: "Kaveri Coaches", busName: "Bharat Benz AC Sleeper", layout: "2+1", from: "Bengaluru", to: "Hyderabad", durMin: 570, fare: 850, passengers: [px("Asha Verma", "29", "female", "L1A")] }),
    {
      ...seedRecord("VH-8D2ZQK", 100, { operator: "Namaste Yatra", busName: "Mercedes AC Seater", layout: "2+2", from: "Bengaluru", to: "Chennai", durMin: 390, fare: 600, passengers: [px("Asha Verma", "29", "female", "5B"), px("Rohan Verma", "32", "male", "5A")] }),
      status: "cancelled",
      cancellation: { at: Date.now() - 3_600_000 * 20, hoursBefore: 120, percent: 90, refund: 1080, kept: 120, reason: "Change of plans" },
    },
  ];
}

// ---- Store ---------------------------------------------------------------------------------

function load(): BookingRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as BookingRecord[];
  } catch { /* fall through to the demo seed */ }
  return seed();
}

let list: BookingRecord[] = load();
const listeners = new Set<() => void>();
function commit(next: BookingRecord[]) {
  list = next;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function useBookings(): BookingRecord[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => list,
  );
}
export function addBooking(r: BookingRecord) {
  if (!r.id || list.some((x) => x.id === r.id)) return;
  commit([r, ...list]);
}
export function getBooking(id: string | undefined) {
  return list.find((x) => x.id === id);
}
export function cancelBooking(id: string, reason: string) {
  const r = getBooking(id);
  if (!r || r.status === "cancelled") return;
  const q = refundQuote(r);
  commit(list.map((x) => (x.id === id ? { ...x, status: "cancelled" as const, cancellation: { at: Date.now(), hoursBefore: Math.max(0, q.hours), percent: q.tier.percent, refund: q.refund, kept: q.kept, reason } } : x)));
}
export function resetDemoBookings() {
  commit(seed());
}
