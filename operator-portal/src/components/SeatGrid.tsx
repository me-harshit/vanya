import { AISLE_COL, type Deck, type Seat } from "../data/buses";

type Props = {
  seats: Seat[];
  deck: Deck;
  rows: number;
  // Builder mode: empty cells show a "+" and every cell is clickable.
  onCell?: (row: number, col: number, seat: Seat | undefined) => void;
  selectedNo?: string;
};

const COLS = [0, 1, AISLE_COL, 3, 4];

// One deck of a bus, front at the top. Used by the layout builder and the read-only preview.
export function SeatGrid({ seats, deck, rows, onCell, selectedNo }: Props) {
  const here = seats.filter((s) => s.deck === deck);
  const at = (r: number, c: number) => here.find((s) => s.row === r && s.col === c);
  return (
    <div className="deck">
      <div className="deck-front">Front · Driver</div>
      <div className="deck-grid">
        {Array.from({ length: rows }, (_, r) =>
          COLS.map((c) => {
            if (c === AISLE_COL) return <span key={`${r}-${c}`} className="aisle" aria-hidden />;
            const seat = at(r, c);
            if (!seat) {
              return onCell ? (
                <button key={`${r}-${c}`} className="seat empty" onClick={() => onCell(r, c, undefined)} aria-label={`Add seat row ${r + 1}`}>+</button>
              ) : (
                <span key={`${r}-${c}`} className="seat gap" aria-hidden />
              );
            }
            const cls = `seat ${seat.kind}${seat.ladies ? " ladies" : ""}${selectedNo === seat.no ? " selected" : ""}`;
            return onCell ? (
              <button key={`${r}-${c}`} className={cls} onClick={() => onCell(r, c, seat)} title={`${seat.no} · ${seat.kind}${seat.ladies ? " · ladies" : ""}`}>{seat.no}</button>
            ) : (
              <span key={`${r}-${c}`} className={cls} title={`${seat.no} · ${seat.kind}${seat.ladies ? " · ladies" : ""}`}>{seat.no}</span>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function SeatLegend() {
  return (
    <div className="legend">
      <span><i className="seat seater mini" /> Seater</span>
      <span><i className="seat sleeper mini" /> Sleeper</span>
      <span><i className="seat seater ladies mini" /> Ladies</span>
    </div>
  );
}
