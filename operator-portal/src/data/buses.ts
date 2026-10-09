// DEMO data: replace with API calls when the backend is connected.
// The Seat shape mirrors the backend layout (backend/src/modules/operators/layout.ts),
// so what the builder produces can be sent to the real API unchanged.

import { useSyncExternalStore } from "react";

export type SeatKind = "seater" | "sleeper";
export type Deck = "lower" | "upper";
export type Seat = { no: string; deck: Deck; row: number; col: number; kind: SeatKind; ladies: boolean };

export const MAX_SEATS = 60;
export const MAX_ROWS = 14;
// Column 2 is the aisle, so seats live in these columns.
export const SEAT_COLS = [0, 1, 3, 4] as const;
export const AISLE_COL = 2;
const LETTERS = "ABCD";

export const AMENITIES = [
  { id: "wifi", label: "Wi-Fi" },
  { id: "charging", label: "Charging point" },
  { id: "blanket", label: "Blanket" },
  { id: "water", label: "Water bottle" },
  { id: "reading_light", label: "Reading light" },
  { id: "tv", label: "TV" },
  { id: "toilet", label: "Toilet" },
] as const;
export type AmenityId = (typeof AMENITIES)[number]["id"];

export type Bus = {
  id: string;
  name: string;
  registration: string;
  ac: boolean;
  amenities: AmenityId[];
  seats: Seat[];
  active: boolean;
};

export type Preset = "seater_2x2" | "sleeper_2x1";

// Same rules as the backend's generateLayout.
export function generateLayout(preset: Preset, rows: number): Seat[] {
  const seats: Seat[] = [];
  if (preset === "seater_2x2") {
    for (let r = 0; r < rows; r++) {
      [0, 1, 3, 4].forEach((col, i) => seats.push({ no: `${r + 1}${LETTERS[i]}`, deck: "lower", row: r, col, kind: "seater", ladies: false }));
    }
  } else {
    for (const deck of ["lower", "upper"] as const) {
      const p = deck === "lower" ? "L" : "U";
      for (let r = 0; r < rows; r++) {
        [0, 1, 3].forEach((col, i) => seats.push({ no: `${p}${r + 1}${LETTERS[i]}`, deck, row: r, col, kind: "sleeper", ladies: false }));
      }
    }
  }
  return seats;
}

export function busType(seats: Seat[]): "Seater" | "Sleeper" | "Seater + Sleeper" | "No seats" {
  const kinds = new Set(seats.map((s) => s.kind));
  if (kinds.size === 0) return "No seats";
  if (kinds.size > 1) return "Seater + Sleeper";
  return kinds.has("seater") ? "Seater" : "Sleeper";
}

export function rowsUsed(seats: Seat[], deck?: Deck): number {
  const own = deck ? seats.filter((s) => s.deck === deck) : seats;
  return own.length ? Math.max(...own.map((s) => s.row)) + 1 : 0;
}

// Next free seat number for a new seat at (deck, row, col).
export function nextSeatNo(seats: Seat[], deck: Deck, row: number, col: number, kind: SeatKind): string {
  const taken = new Set(seats.map((s) => s.no.toLowerCase()));
  const letter = LETTERS[SEAT_COLS.indexOf(col as (typeof SEAT_COLS)[number])] ?? "X";
  const prefix = kind === "sleeper" ? (deck === "lower" ? "L" : "U") : "";
  let no = `${prefix}${row + 1}${letter}`;
  for (let n = 2; taken.has(no.toLowerCase()); n++) no = `${prefix}${row + 1}${letter}${n}`;
  return no;
}

export function layoutProblems(seats: Seat[]): string[] {
  const out: string[] = [];
  if (seats.length === 0) out.push("Add at least one seat.");
  if (seats.length > MAX_SEATS) out.push(`A bus can have at most ${MAX_SEATS} seats (you have ${seats.length}).`);
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const s of seats) {
    const k = s.no.trim().toLowerCase();
    if (!/^[a-z0-9]{1,6}$/i.test(s.no.trim())) out.push(`Seat "${s.no}": use 1 to 6 letters or digits.`);
    if (seen.has(k)) dupes.add(s.no);
    seen.add(k);
  }
  dupes.forEach((d) => out.push(`Seat number ${d} is used twice.`));
  return out;
}

// ---- Demo store (in memory only; a refresh resets it) -------------------------------------

let buses: Bus[] = [
  { id: "b1", name: "Volvo 9400 AC Sleeper", registration: "RJ14PA2210", ac: true, amenities: ["wifi", "charging", "blanket", "water", "reading_light"], seats: generateLayout("sleeper_2x1", 6), active: true },
  { id: "b2", name: "Scania Multi-axle AC Sleeper", registration: "MP09FA7781", ac: true, amenities: ["charging", "blanket", "water"], seats: generateLayout("sleeper_2x1", 5), active: true },
  { id: "b3", name: "AC Seater 2+2", registration: "DL1PC5532", ac: true, amenities: ["wifi", "charging", "water", "tv"], seats: generateLayout("seater_2x2", 11), active: true },
  { id: "b4", name: "Non-AC Seater 2+2", registration: "RJ14PB1190", ac: false, amenities: ["water"], seats: generateLayout("seater_2x2", 12), active: true },
  { id: "b5", name: "Mixed Sleeper + Seater", registration: "GJ01XY4401", ac: true, amenities: ["charging", "toilet"], seats: [...generateLayout("seater_2x2", 4), ...generateLayout("sleeper_2x1", 3).filter((s) => s.deck === "lower").map((s) => ({ ...s, row: s.row + 4 }))], active: false },
];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useBuses(): Bus[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => buses,
  );
}
export function getBus(id: string): Bus | undefined {
  return buses.find((b) => b.id === id);
}
export function saveBus(bus: Omit<Bus, "id"> & { id?: string }): string {
  const id = bus.id ?? `b${Date.now()}`;
  const full = { ...bus, id };
  buses = buses.some((b) => b.id === id) ? buses.map((b) => (b.id === id ? full : b)) : [full, ...buses];
  emit();
  return id;
}
export function setBusActive(id: string, active: boolean) {
  buses = buses.map((b) => (b.id === id ? { ...b, active } : b));
  emit();
}
