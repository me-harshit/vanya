// India has one time zone (UTC+5:30, no daylight saving), so dates and departure times are
// treated as IST. Everything is stored as UTC instants.
const IST_OFFSET_MS = 330 * 60_000;

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDate(date: string) {
  if (!DATE_REGEX.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

/** "2026-10-12" for the IST calendar day that contains this instant. */
export function istDate(d: Date) {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The UTC instant for a wall-clock time in IST. */
export function istToUtc(date: string, time = "00:00") {
  return new Date(`${date}T${time}:00+05:30`);
}

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function istDayRange(date: string) {
  return { start: istToUtc(date), end: istToUtc(addDays(date, 1)) };
}

export function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}
