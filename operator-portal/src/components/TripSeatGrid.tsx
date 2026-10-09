import { AISLE_COL, type Deck } from "../data/buses";
import type { TripSeat } from "../data/trips";

const COLS = [0, 1, AISLE_COL, 3, 4];

type Props = { seats: TripSeat[]; deck: Deck; selectedNo?: string; onPick: (seat: TripSeat) => void };

// One deck of a trip. Booked seats are coloured by the passenger's gender, held seats are dashed.
export function TripSeatGrid({ seats, deck, selectedNo, onPick }: Props) {
  const here = seats.filter((s) => s.deck === deck);
  const rows = here.length ? Math.max(...here.map((s) => s.row)) + 1 : 0;
  const at = (r: number, c: number) => here.find((s) => s.row === r && s.col === c);
  return (
    <div className="deck">
      <div className="deck-front">Front · Driver</div>
      <div className="deck-grid">
        {Array.from({ length: rows }, (_, r) =>
          COLS.map((c) => {
            if (c === AISLE_COL) return <span key={`${r}-${c}`} className="aisle" aria-hidden />;
            const s = at(r, c);
            if (!s) return <span key={`${r}-${c}`} className="seat gap" aria-hidden />;
            const who = s.status === "booked" ? s.passenger?.gender : undefined;
            const cls = ["seat", s.kind, s.status === "booked" ? `booked ${who ?? ""}` : s.status === "held" ? "held" : "", selectedNo === s.no ? "selected" : ""].join(" ").replace(/\s+/g, " ").trim();
            const label = `Seat ${s.no}, ${s.status}${s.passenger ? `, ${s.passenger.name}` : ""}`;
            return <button key={`${r}-${c}`} type="button" className={cls} onClick={() => onPick(s)} aria-label={label} title={label}>{s.no}</button>;
          }),
        )}
      </div>
    </div>
  );
}

export function TripLegend() {
  return (
    <ul className="legend">
      <li><i className="seat mini" /> Available</li>
      <li><i className="seat mini held" /> On hold</li>
      <li><i className="seat mini booked male" /> Booked, male</li>
      <li><i className="seat mini booked female" /> Booked, female</li>
    </ul>
  );
}
