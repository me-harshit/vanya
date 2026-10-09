// DEMO booking state: replace with the real API (POST /trips/:id/hold, POST /bookings) later.
// The draft lives in memory and in sessionStorage so a page refresh does not lose it.

import { useEffect, useState } from "react";
import { site } from "../config";
import { type Trip } from "./trips";

export const HOLD_MINUTES = 10; // same as the backend HOLD_MINUTES
const KEY = "vanya-booking-draft";

export type Gender = "male" | "female" | "other"; // same values as the backend
export type Passenger = { seat: string; name: string; age: string; gender: Gender | "" };

export type Draft = {
  from: string;
  to: string;
  date: string;
  tripId: string;
  seats: string[];
  bp: string;
  dp: string;
  passengers: Passenger[];
  phone: string;
  email: string;
  coupon: string;
  holdUntil: number;
  pnr?: string;
  paidAt?: number;
  method?: string;
};

let memory: Draft | null = null;

export function loadDraft(): Draft | null {
  if (memory) return memory;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) memory = JSON.parse(raw) as Draft;
  } catch {
    /* storage unavailable: the draft only lives for this visit */
  }
  return memory;
}
export function saveDraft(d: Draft) {
  memory = d;
  try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
}
export function clearDraft() {
  memory = null;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

type Start = Pick<Draft, "from" | "to" | "date" | "tripId" | "seats" | "bp" | "dp">;

// Called when the customer arrives from the seat page. Keeps what they typed if they come back for the same seats.
export function startDraft(p: Start): Draft {
  const old = loadDraft();
  if (old && !old.pnr && old.tripId === p.tripId && old.date === p.date && old.seats.join() === p.seats.join()) {
    const d = { ...old, bp: p.bp, dp: p.dp };
    saveDraft(d);
    return d;
  }
  const d: Draft = {
    ...p,
    passengers: p.seats.map((seat) => ({ seat, name: "", age: "", gender: "" })),
    phone: "", email: "", coupon: "",
    holdUntil: Date.now() + HOLD_MINUTES * 60_000,
  };
  saveDraft(d);
  return d;
}

// ---- Coupons (demo rules; the real ones come from the backend) -----------------------------

export const coupons = [
  { code: "WELCOME", text: "10% off, up to ₹150 (minimum fare ₹300)" },
  { code: "WEEKEND", text: "8% off, up to ₹120" },
  { code: "SLEEPER", text: "10% off sleeper buses, up to ₹200" },
  { code: "GROUP", text: "Flat ₹100 off on 4 or more seats" },
  { code: "UPI", text: "Flat ₹30 off (minimum fare ₹500)" },
  { code: "EARLY", text: "7% off when booked 7 or more days ahead, up to ₹150" },
] as const;

export type CouponResult = { ok: true; discount: number } | { ok: false; message: string };

export function checkCoupon(code: string, trip: Trip, seatCount: number, date: string): CouponResult {
  const c = code.trim().toUpperCase();
  const base = trip.fare * seatCount;
  const pct = (p: number, cap: number): CouponResult => ({ ok: true, discount: Math.min(Math.round((base * p) / 100), cap) });
  const [y, m, d] = date.split("-").map(Number);
  const days = Math.round((new Date(y, m - 1, d).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  switch (c) {
    case "WELCOME": return base >= 300 ? pct(10, 150) : { ok: false, message: "WELCOME needs a fare of at least ₹300." };
    case "WEEKEND": return pct(8, 120);
    case "SLEEPER": return trip.kind === "sleeper" ? pct(10, 200) : { ok: false, message: "SLEEPER works only on sleeper buses." };
    case "GROUP": return seatCount >= 4 ? { ok: true, discount: 100 } : { ok: false, message: "GROUP needs 4 or more seats." };
    case "UPI": return base >= 500 ? { ok: true, discount: 30 } : { ok: false, message: "UPI needs a fare of at least ₹500." };
    case "EARLY": return days >= 7 ? pct(7, 150) : { ok: false, message: "EARLY needs a journey 7 or more days away." };
    default: return { ok: false, message: "This coupon code is not valid." };
  }
}

export function totalsFor(trip: Trip, seatCount: number, coupon: string, date: string) {
  const base = trip.fare * seatCount;
  const res = coupon ? checkCoupon(coupon, trip, seatCount, date) : null;
  const discount = res && res.ok ? res.discount : 0;
  const fee = Math.round(((base - discount) * site.convenienceFeePercent) / 100);
  return { base, discount, fee, total: base - discount + fee };
}

// Seconds left on the seat hold. Ticks once a second.
export function useHold(until: number) {
  const [left, setLeft] = useState(() => Math.max(0, until - Date.now()));
  useEffect(() => {
    setLeft(Math.max(0, until - Date.now()));
    const id = setInterval(() => setLeft(Math.max(0, until - Date.now())), 1000);
    return () => clearInterval(id);
  }, [until]);
  return { secs: Math.ceil(left / 1000), expired: left <= 0 };
}

export function clock(secs: number) {
  return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
}

export function makePnr(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return "VH-" + (h >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}
