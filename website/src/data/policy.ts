// Cancellation policy. Mirrors DEFAULT_CANCELLATION_POLICY in backend/src/constants.ts.
// TO CONFIRM WITH THE CLIENT: the percentages, and whether they apply to the fare after coupon (as here) or before it.
// Operators can set their own rules later; the real refund amount always comes from the backend.

export const cancellationPolicy = [
  { hours: 24, percent: 90 },
  { hours: 12, percent: 60 },
  { hours: 4, percent: 30 },
  { hours: 0, percent: 0 },
] as const;

export type Tier = (typeof cancellationPolicy)[number];

export function tierFor(hoursLeft: number): Tier {
  return cancellationPolicy.find((t) => hoursLeft >= t.hours) ?? cancellationPolicy[cancellationPolicy.length - 1];
}

export function tierLabel(t: Tier, i: number): string {
  if (i === 0) return `${t.hours} hours or more before departure`;
  const upper = cancellationPolicy[i - 1].hours;
  return t.hours === 0 ? `Less than ${upper} hours before departure` : `${t.hours} to ${upper} hours before departure`;
}

export function fmtHoursLeft(h: number): string {
  if (h <= 0) return "already departed";
  const days = Math.floor(h / 24);
  const hrs = Math.floor(h % 24);
  const mins = Math.floor((h * 60) % 60);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ${hrs} hour${hrs === 1 ? "" : "s"}`;
  return hrs > 0 ? `${hrs} hour${hrs === 1 ? "" : "s"} ${mins} min` : `${mins} min`;
}
