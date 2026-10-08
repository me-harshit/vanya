import { z } from "zod";
import { DECKS, MAX_SEATS_PER_BUS, SEAT_KINDS, type BUS_TYPES } from "../../constants.js";
import { AppError } from "../../errors.js";

export type SeatDef = {
  no: string;
  deck: (typeof DECKS)[number];
  row: number;
  col: number;
  kind: (typeof SEAT_KINDS)[number];
  ladies: boolean;
};

const seatDefSchema = z.object({
  no: z.string().trim().regex(/^[A-Za-z0-9]{1,6}$/, "Seat number: 1 to 6 letters or digits"),
  deck: z.enum(DECKS),
  row: z.number().int().min(0).max(30),
  col: z.number().int().min(0).max(6),
  kind: z.enum(SEAT_KINDS),
  ladies: z.boolean().default(false),
});

export const PRESETS = ["seater_2x2", "sleeper_2x1"] as const;

export const layoutInputSchema = z.union([
  z.object({ preset: z.object({ name: z.enum(PRESETS), rows: z.number().int().min(1).max(20) }) }),
  z.object({ seats: z.array(seatDefSchema).min(1).max(MAX_SEATS_PER_BUS) }),
]);
export type LayoutInput = z.infer<typeof layoutInputSchema>;

const LETTERS = "ABCDEFGH";

/**
 * seater_2x2:  2 seats | aisle | 2 seats per row, one deck (4 seats per row).
 * sleeper_2x1: 2 berths | aisle | 1 berth per row, on a lower and an upper deck (6 berths per row).
 */
export function generateLayout(name: (typeof PRESETS)[number], rows: number): SeatDef[] {
  const seats: SeatDef[] = [];
  if (name === "seater_2x2") {
    const cols = [0, 1, 3, 4]; // column 2 is the aisle
    for (let r = 0; r < rows; r++) {
      cols.forEach((col, i) =>
        seats.push({ no: `${r + 1}${LETTERS[i]}`, deck: "lower", row: r, col, kind: "seater", ladies: false }),
      );
    }
  } else {
    const cols = [0, 1, 3];
    for (const deck of DECKS) {
      const prefix = deck === "lower" ? "L" : "U";
      for (let r = 0; r < rows; r++) {
        cols.forEach((col, i) =>
          seats.push({ no: `${prefix}${r + 1}${LETTERS[i]}`, deck, row: r, col, kind: "sleeper", ladies: false }),
        );
      }
    }
  }
  return seats;
}

export function validateSeats(seats: SeatDef[]) {
  if (seats.length < 1 || seats.length > MAX_SEATS_PER_BUS) {
    throw new AppError(400, "INVALID_LAYOUT", `A bus must have between 1 and ${MAX_SEATS_PER_BUS} seats.`);
  }
  const nos = new Set<string>();
  const cells = new Set<string>();
  for (const s of seats) {
    const no = s.no.toLowerCase();
    if (nos.has(no)) throw new AppError(400, "INVALID_LAYOUT", `Seat number ${s.no} is used twice.`);
    nos.add(no);
    const cell = `${s.deck}:${s.row}:${s.col}`;
    if (cells.has(cell)) throw new AppError(400, "INVALID_LAYOUT", `Two seats share the same position (${cell}).`);
    cells.add(cell);
  }
}

export function resolveLayout(input: LayoutInput): SeatDef[] {
  const seats = "preset" in input ? generateLayout(input.preset.name, input.preset.rows) : input.seats;
  validateSeats(seats);
  return seats;
}

export function deriveBusType(seats: SeatDef[]): (typeof BUS_TYPES)[number] {
  const kinds = new Set(seats.map((s) => s.kind));
  if (kinds.size > 1) return "seater_sleeper";
  return seats[0].kind;
}
