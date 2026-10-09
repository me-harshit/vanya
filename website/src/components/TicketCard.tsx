import { Link } from "react-router-dom";
import { QrDemo } from "./QrDemo";
import { fmtDuration, fmtTime } from "../data/trips";
import type { BookingRecord } from "../data/myBookings";

export function longDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
export const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const methodName = (m: string) => (m === "card" ? "Card" : m === "netbanking" ? "Net banking" : m === "wallet" ? "Wallet" : "UPI");

// The e-ticket. Used right after booking and from My bookings. A cancelled booking shows a banner and no QR code.
export function TicketCard({ rec }: { rec: BookingRecord }) {
  const cancelled = rec.status === "cancelled";
  const arrMin = rec.depMin + rec.durMin;
  const nextDay = Math.floor(arrMin / 1440);
  return (
    <article className={"ticket card" + (cancelled ? " void" : "")}>
      <header className="tk-head">
        <div><small className="muted">Operator</small><h2>{rec.operator}</h2><span className="muted">{rec.busName} · {rec.layout}</span></div>
        <div className="tk-pnr"><small className="muted">Booking ID</small><b className="mono">{rec.id}</b></div>
      </header>
      {cancelled && <div className="tk-void" role="status">This booking was cancelled. This ticket is no longer valid.</div>}

      <div className="tk-route">
        <div><b>{fmtTime(rec.depMin)}</b><span>{rec.from}</span><small className="muted">{rec.boarding.name}</small></div>
        <div className="tk-mid"><span className="muted">{fmtDuration(rec.durMin)}</span><i /><small className="muted">{longDate(rec.date)}</small></div>
        <div><b>{fmtTime(arrMin)}{nextDay > 0 && <sup> +{nextDay}d</sup>}</b><span>{rec.to}</span><small className="muted">{rec.dropping.name}</small></div>
      </div>

      <div className="tk-body">
        <div>
          <h3>Passengers</h3>
          <table className="tk-table">
            <thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Seat</th></tr></thead>
            <tbody>
              {rec.passengers.map((x) => (
                <tr key={x.seat}><td>{x.name}</td><td>{x.age}</td><td>{x.gender ? cap(x.gender) : ""}</td><td><b>{x.seat}</b></td></tr>
              ))}
            </tbody>
          </table>
          <dl className="tk-facts">
            <div><dt>Board at</dt><dd>{rec.boarding.name}, {fmtTime(rec.boarding.time)}</dd></div>
            <div><dt>Drop at</dt><dd>{rec.dropping.name}, {fmtTime(rec.dropping.time)}</dd></div>
            <div><dt>Amount paid</dt><dd>{rupee(rec.pricing.total)}{rec.coupon ? ` (coupon ${rec.coupon})` : ""}</dd></div>
            <div><dt>Paid with</dt><dd>{methodName(rec.method)}</dd></div>
          </dl>
        </div>
        {!cancelled && <QrDemo value={rec.id} />}
      </div>

      <footer className="tk-foot muted">
        Show this ticket and a valid photo ID at boarding. Reach the boarding point 15 minutes early. See our <Link to="/refunds" className="text-link">cancellation and refund policy</Link>.
      </footer>
    </article>
  );
}
