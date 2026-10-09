// DEMO data: replace with API calls when the backend is connected (GET/POST /operator/routes).
// Shape follows the backend Route model: two cities, distance, duration, and boarding and dropping stops
// with an offset in minutes after the bus leaves the first stop.

import { useSyncExternalStore } from "react";

export const cityPoints: Record<string, string[]> = {
  Ahmedabad: ["Paldi", "Geeta Mandir", "Kalupur"],
  Bengaluru: ["Majestic", "Silk Board", "Madiwala", "Hebbal"],
  Chandigarh: ["Sector 17 ISBT", "Sector 43 ISBT"],
  Chennai: ["Koyambedu", "Guindy", "Tambaram"],
  Delhi: ["Kashmere Gate ISBT", "Sarai Kale Khan", "Anand Vihar ISBT", "Dhaula Kuan", "Majnu ka Tilla"],
  Goa: ["Panjim", "Mapusa", "Margao"],
  Hyderabad: ["MGBS", "LB Nagar", "Miyapur"],
  Indore: ["Sarwate", "Vijay Nagar", "Bhawarkua"],
  Jaipur: ["Sindhi Camp", "Narayan Singh Circle", "Ajmeri Gate", "Sansar Chandra Road"],
  Manali: ["Mall Road", "Old Manali Bus Stand", "Bahang"],
  Mumbai: ["Borivali", "Dadar", "Andheri", "Sion"],
  Pune: ["Swargate", "Shivajinagar", "Hinjewadi"],
};
export const cityNames = Object.keys(cityPoints).sort();

export type Stop = { point: string; offsetMin: number };
export type OpRoute = {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
  boarding: Stop[];
  dropping: Stop[];
  active: boolean;
};

let routes: OpRoute[] = [
  { id: "r1", from: "Delhi", to: "Jaipur", distanceKm: 280, durationMin: 345, boarding: [{ point: "Kashmere Gate ISBT", offsetMin: 0 }, { point: "Dhaula Kuan", offsetMin: 40 }], dropping: [{ point: "Narayan Singh Circle", offsetMin: 325 }, { point: "Sindhi Camp", offsetMin: 345 }], active: true },
  { id: "r2", from: "Jaipur", to: "Delhi", distanceKm: 280, durationMin: 345, boarding: [{ point: "Sindhi Camp", offsetMin: 0 }, { point: "Narayan Singh Circle", offsetMin: 20 }], dropping: [{ point: "Dhaula Kuan", offsetMin: 315 }, { point: "Kashmere Gate ISBT", offsetMin: 345 }], active: true },
  { id: "r3", from: "Delhi", to: "Manali", distanceKm: 540, durationMin: 750, boarding: [{ point: "Majnu ka Tilla", offsetMin: 0 }, { point: "Kashmere Gate ISBT", offsetMin: 30 }], dropping: [{ point: "Old Manali Bus Stand", offsetMin: 735 }, { point: "Mall Road", offsetMin: 750 }], active: true },
  { id: "r4", from: "Indore", to: "Mumbai", distanceKm: 590, durationMin: 720, boarding: [{ point: "Vijay Nagar", offsetMin: 0 }, { point: "Sarwate", offsetMin: 25 }], dropping: [{ point: "Borivali", offsetMin: 700 }, { point: "Dadar", offsetMin: 745 }], active: false },
];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useRoutes(): OpRoute[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => routes,
  );
}
export function getRoute(id: string | undefined) {
  return routes.find((r) => r.id === id);
}
export function saveRoute(r: Omit<OpRoute, "id" | "active"> & { id?: string; active?: boolean }): string {
  const id = r.id ?? `r${Date.now()}`;
  const full: OpRoute = { active: true, ...r, id };
  routes = routes.some((x) => x.id === id) ? routes.map((x) => (x.id === id ? full : x)) : [full, ...routes];
  emit();
  return id;
}
export function setRouteActive(id: string, active: boolean) {
  routes = routes.map((r) => (r.id === id ? { ...r, active } : r));
  emit();
}

export function fmtDur(min: number) {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
