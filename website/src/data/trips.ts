// SAMPLE DATA: replace with the real search API (GET /trips/search) later.
// Trips are generated from the searched cities and date, so every search shows a believable,
// stable list (the same search always gives the same buses).

import { routes } from "./routes";

export type AmenityId = "wifi" | "charging" | "blanket" | "water" | "reading_light" | "tv" | "toilet";
export const amenityLabels: Record<AmenityId, string> = {
  wifi: "Wi-Fi", charging: "Charging point", blanket: "Blanket", water: "Water bottle",
  reading_light: "Reading light", tv: "TV", toilet: "Toilet",
};

export type Trip = {
  id: string;
  operator: string;
  rating: number;
  reviews: number;
  busName: string;
  kind: "seater" | "sleeper";
  ac: boolean;
  layout: "2+2" | "2+1";
  depMin: number; // minutes after midnight on the travel date
  durMin: number;
  fare: number;
  seatsLeft: number;
  amenities: AmenityId[];
  boarding: string;
  dropping: string;
};

const operators = [
  "Himalayan Express", "Rajdhani Lines", "Sunrise Travels", "Blue Star Tours", "Kaveri Coaches",
  "Namaste Yatra", "Royal Voyager", "Metro Link Travels", "Green Valley Bus", "Ashoka Roadways",
];
const busModels: Record<string, string[]> = {
  "sleeper-ac": ["Volvo 9400 AC Sleeper", "Scania Multi-axle AC Sleeper", "Bharat Benz AC Sleeper"],
  "seater-ac": ["Volvo B11R AC Seater", "Mercedes AC Seater", "AC Semi-sleeper"],
  "seater-non": ["Non-AC Seater", "Ashok Leyland Non-AC Seater"],
  "sleeper-non": ["Non-AC Sleeper"],
};
const depTimes = [330, 390, 450, 540, 600, 720, 810, 930, 1020, 1110, 1170, 1230, 1290, 1350, 1410];
const allAmenities: AmenityId[] = ["wifi", "charging", "blanket", "water", "reading_light", "tv", "toilet"];
const stops = ["Kashmere Gate", "Sarai Kale Khan", "Anand Vihar", "Dhaula Kuan", "Majnu ka Tilla", "Main Bus Stand", "City Center", "Railway Station Road"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTrips(from: string, to: string, date: string): Trip[] {
  const rand = rng(hash(`${from}|${to}`));
  const dayRand = rng(hash(`${from}|${to}|${date}`));
  const known = routes.find((r) => (r.from === from && r.to === to) || (r.from === to && r.to === from));
  const km = known ? known.km : 200 + Math.floor(rand() * 700);
  const count = 9 + Math.floor(rand() * 4);

  const times = [...depTimes].sort(() => rand() - 0.5).slice(0, count).sort((a, b) => a - b);
  return times.map((depMin, i) => {
    const ac = rand() > 0.3;
    const kind: Trip["kind"] = km > 450 ? (rand() > 0.35 ? "sleeper" : "seater") : rand() > 0.75 ? "sleeper" : "seater";
    const models = busModels[`${kind}-${ac ? "ac" : "non"}`];
    const per = kind === "sleeper" ? (ac ? 2.3 : 1.7) : ac ? 1.6 : 1.1;
    const speed = 42 + Math.floor(rand() * 14);
    const fare = Math.max(250, Math.round((km * per * (0.9 + dayRand() * 0.3)) / 10) * 10);
    const amenities = allAmenities.filter(() => rand() > (ac ? 0.45 : 0.75));
    return {
      id: `${hash(`${from}|${to}`).toString(36)}-${i}`,
      operator: operators[Math.floor(rand() * operators.length)],
      rating: Math.round((3.4 + rand() * 1.5) * 10) / 10,
      reviews: 20 + Math.floor(rand() * 900),
      busName: models[Math.floor(rand() * models.length)],
      kind, ac,
      layout: kind === "sleeper" ? "2+1" : "2+2",
      depMin,
      durMin: Math.round(((km / speed) * 60) / 5) * 5,
      fare,
      seatsLeft: 2 + Math.floor(dayRand() * 30),
      amenities,
      boarding: stops[Math.floor(rand() * stops.length)],
      dropping: stops[Math.floor(rand() * stops.length)],
    };
  });
}

export function fmtTime(min: number) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
export function fmtDuration(min: number) {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
export function dayOffset(t: Trip) {
  return Math.floor((t.depMin + t.durMin) / 1440);
}

// ---- Filters and sorting -------------------------------------------------------------------

export type TimeBand = "early" | "morning" | "afternoon" | "evening";
export const timeBands: { id: TimeBand; label: string; hint: string; from: number; to: number }[] = [
  { id: "early", label: "Early morning", hint: "Before 6 AM", from: 0, to: 360 },
  { id: "morning", label: "Morning", hint: "6 AM to 12 PM", from: 360, to: 720 },
  { id: "afternoon", label: "Afternoon", hint: "12 PM to 6 PM", from: 720, to: 1080 },
  { id: "evening", label: "Evening and night", hint: "After 6 PM", from: 1080, to: 1440 },
];

export type Filters = {
  kinds: Trip["kind"][];
  ac: "any" | "ac" | "non-ac";
  bands: TimeBand[];
  maxFare: number;
  operators: string[];
  amenities: AmenityId[];
};
export const emptyFilters = (maxFare: number): Filters => ({ kinds: [], ac: "any", bands: [], maxFare, operators: [], amenities: [] });

export function applyFilters(trips: Trip[], f: Filters): Trip[] {
  return trips.filter(
    (t) =>
      (f.kinds.length === 0 || f.kinds.includes(t.kind)) &&
      (f.ac === "any" || (f.ac === "ac") === t.ac) &&
      (f.bands.length === 0 || f.bands.some((b) => { const x = timeBands.find((tb) => tb.id === b)!; return t.depMin >= x.from && t.depMin < x.to; })) &&
      t.fare <= f.maxFare &&
      (f.operators.length === 0 || f.operators.includes(t.operator)) &&
      f.amenities.every((a) => t.amenities.includes(a)),
  );
}

export type SortKey = "earliest" | "latest" | "cheapest" | "fastest" | "rated";
export const sortOptions: { id: SortKey; label: string }[] = [
  { id: "earliest", label: "Earliest departure" },
  { id: "latest", label: "Latest departure" },
  { id: "cheapest", label: "Cheapest" },
  { id: "fastest", label: "Fastest" },
  { id: "rated", label: "Top rated" },
];
export function sortTrips(trips: Trip[], key: SortKey): Trip[] {
  const by: Record<SortKey, (a: Trip, b: Trip) => number> = {
    earliest: (a, b) => a.depMin - b.depMin,
    latest: (a, b) => b.depMin - a.depMin,
    cheapest: (a, b) => a.fare - b.fare,
    fastest: (a, b) => a.durMin - b.durMin,
    rated: (a, b) => b.rating - a.rating,
  };
  return [...trips].sort(by[key]);
}

// ---- Boarding and dropping points ----------------------------------------------------------

export type Point = { id: string; name: string; time: number; note: string };

// Three boarding points around the departure time and three dropping points around the arrival time.
export function pointsFor(trip: Trip): { boarding: Point[]; dropping: Point[] } {
  const pick = (main: string, n: number) => {
    const others = stops.filter((s) => s !== main);
    const start = hash(main + trip.id) % others.length;
    return [main, ...Array.from({ length: n - 1 }, (_, i) => others[(start + i) % others.length])];
  };
  const arr = trip.depMin + trip.durMin;
  const b = pick(trip.boarding, 3);
  const d = pick(trip.dropping, 3);
  return {
    boarding: [
      { id: "b1", name: b[0], time: trip.depMin - 30, note: "Main pickup point" },
      { id: "b2", name: b[1], time: trip.depMin, note: "Near the metro station" },
      { id: "b3", name: b[2], time: trip.depMin + 25, note: "Opposite the bus stand" },
    ],
    dropping: [
      { id: "d1", name: d[0], time: arr - 45, note: "Arrives first" },
      { id: "d2", name: d[1], time: arr - 15, note: "Near the market" },
      { id: "d3", name: d[2], time: arr, note: "Main drop point" },
    ],
  };
}

export function findTrip(from: string, to: string, date: string, id: string | undefined): Trip | undefined {
  return generateTrips(from, to, date).find((t) => t.id === id);
}
