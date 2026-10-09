import { type Deck, type Gender, type Seat } from "../data/seats";

type Props = {
  seats: Seat[];
  deck: Deck;
  booked: Map<string, Gender>;
  selected: string[];
  fare: number;
  onToggle: (seat: Seat) => void;
};

const COLS = [0, 1, 2, 3, 4]; // column 2 is the aisle

// One deck, front at the top. Booked seats are coloured by the gender of the person who booked them.
export function SeatMap({ seats, deck, booked, selected, fare, onToggle }: Props) {
  const here = seats.filter((s) => s.deck === deck);
  const rows = here.length ? Math.max(...here.map((s) => s.row)) + 1 : 0;
  const at = (r: number, c: number) => here.find((s) => s.row === r && s.col === c);

  return (
    <div className="deck">
      <div className="deck-front">Front · Driver</div>
      <div className="deck-grid">
        {Array.from({ length: rows }, (_, r) =>
          COLS.map((c) => {
            if (c === 2) return <span key={`${r}-${c}`} aria-hidden />;
            const seat = at(r, c);
            if (!seat) return <span key={`${r}-${c}`} className="seat gap" aria-hidden />;
            const who = booked.get(seat.no);
            const on = selected.includes(seat.no);
            const cls = ["seat", seat.kind, who ? `booked ${who}` : "", on ? "selected" : ""].join(" ").trim();
            const label = who
              ? `Seat ${seat.no}, booked by a ${who === "male" ? "male" : "female"} passenger`
              : `Seat ${seat.no}, ${seat.kind}, ₹${fare}${on ? ", selected" : ""}`;
            return (
              <button key={`${r}-${c}`} type="button" className={cls} disabled={!!who} aria-pressed={on} aria-label={label} title={label} onClick={() => onToggle(seat)}>
                <span>{seat.no}</span>
                {who && <i aria-hidden>{who === "male" ? "M" : "F"}</i>}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function SeatLegend() {
  return (
    <ul className="seat-legend">
      <li><span className="seat mini" /> Available</li>
      <li><span className="seat mini selected" /> Selected</li>
      <li><span className="seat mini booked male" /> Booked by male</li>
      <li><span className="seat mini booked female" /> Booked by female</li>
    </ul>
  );
}
