import { clock, type Draft, useHold } from "../data/booking";
import { dayOffset, fmtDuration, fmtTime, pointsFor, type Trip } from "../data/trips";
import { Icon } from "./Icon";

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

type Totals = { base: number; discount: number; fee: number; total: number };

// Right-hand panel on the passenger and payment pages.
export function BookingSummary({ trip, draft, totals, children }: { trip: Trip; draft: Draft; totals: Totals; children?: React.ReactNode }) {
  const pts = pointsFor(trip);
  const b = pts.boarding.find((x) => x.id === draft.bp);
  const d = pts.dropping.find((x) => x.id === draft.dp);
  const arrDay = dayOffset(trip);
  const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");
  return (
    <aside className="card book-summary">
      <h2>Your trip</h2>
      <p className="bs-bus"><b>{trip.operator}</b><span className="muted">{trip.busName} · {trip.layout}</span></p>
      <div className="bs-times">
        <div><b>{fmtTime(trip.depMin)}</b><span className="muted">{dayLabel(draft.date)}</span></div>
        <span className="muted">{fmtDuration(trip.durMin)}</span>
        <div><b>{fmtTime(trip.depMin + trip.durMin)}</b><span className="muted">{arrDay > 0 ? "Next day" : "Same day"}</span></div>
      </div>
      <div className="bs-stops">
        <p><Icon name="pin" size={16} /> <span><b>{b?.name}</b><small className="muted">Board at {b ? fmtTime(b.time) : ""}</small></span></p>
        <p><Icon name="pin" size={16} /> <span><b>{d?.name}</b><small className="muted">Drop at {d ? fmtTime(d.time) : ""}{arrDay > 0 ? ` (+${arrDay}d)` : ""}</small></span></p>
      </div>
      <div className="bs-seats">
        <h3>Seats</h3>
        <div className="chips">{draft.seats.map((s) => <span key={s} className="chip on">{s}</span>)}</div>
      </div>
      <dl className="bs-fare">
        <div><dt>Fare ({draft.seats.length} × {rupee(trip.fare)})</dt><dd>{rupee(totals.base)}</dd></div>
        {totals.discount > 0 && <div className="save"><dt>Coupon {draft.coupon}</dt><dd>−{rupee(totals.discount)}</dd></div>}
        {totals.fee > 0 && <div><dt>Convenience fee</dt><dd>{rupee(totals.fee)}</dd></div>}
        <div className="total"><dt>Total</dt><dd>{rupee(totals.total)}</dd></div>
      </dl>
      {children}
    </aside>
  );
}

// Countdown strip: "Seats held for 09:41". Shows an expired message instead when time is up.
export function HoldBar({ until }: { until: number }) {
  const { secs, expired } = useHold(until);
  return (
    <div className={"hold-bar" + (expired ? " gone" : secs <= 60 ? " low" : "")} role="timer" aria-live="off">
      <Icon name="clock" size={18} />
      {expired ? <span>Your seat hold has ended.</span> : <span>Seats held for you for <b>{clock(secs)}</b>. Complete your booking before time runs out.</span>}
    </div>
  );
}
