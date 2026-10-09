import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { SampleTag } from "../components/Bits";
import { rupee } from "../components/TicketCard";
import { useSession } from "../data/auth";
import { cancellationPolicy, fmtHoursLeft, tierLabel } from "../data/policy";
import { cancelBooking, getBooking, kindOf, refundQuote, useBookings } from "../data/myBookings";

const reasons = ["Change of plans", "Booked by mistake", "Found a better option", "Trip no longer needed", "Other"];
type Phase = "ask" | "working" | "done";

// Cancel a whole booking. The backend cancels the full booking only (partial per-seat cancellation is not built yet).
export function Cancel() {
  const { id } = useParams();
  const session = useSession();
  useBookings();
  const rec = getBooking(id);
  const [phase, setPhase] = useState<Phase>("ask");
  const [reason, setReason] = useState(reasons[0]);
  const [sure, setSure] = useState(false);
  const [result, setResult] = useState<{ refund: number; percent: number } | null>(null);

  useEffect(() => {
    if (phase !== "working" || !id) return;
    const t = setTimeout(() => {
      const q = refundQuote(getBooking(id)!);
      cancelBooking(id, reason);
      setResult({ refund: q.refund, percent: q.tier.percent });
      setPhase("done");
    }, 1500);
    return () => clearTimeout(t);
  }, [phase, id, reason]);

  if (!session) return <Navigate to={`/login?next=/my-bookings/${id ?? ""}/cancel`} replace />;
  if (!rec) return <Navigate to="/my-bookings" replace />;

  if (phase === "done" && result) {
    return (
      <section className="section"><div className="container">
        <div className="card search-soon done-card">
          <span className="tick ok"><Icon name="check" size={32} /></span>
          <h2>Booking cancelled</h2>
          {result.refund > 0
            ? <p>We are refunding <b>{rupee(result.refund)}</b> ({result.percent}% of your fare) to your original payment method. It reaches your account in 5 to 7 working days.</p>
            : <p>As the trip is close, no refund applies. Your seats have been released.</p>}
          <p className="muted small">Booking {rec.id}</p>
          <div className="modal-actions">
            <Link to={`/my-bookings/${rec.id}`} className="btn btn-primary">View cancelled booking</Link>
            <Link to="/my-bookings" className="btn btn-ghost">My bookings</Link>
          </div>
        </div>
      </div></section>
    );
  }

  if (kindOf(rec) !== "upcoming") {
    return (
      <section className="section"><div className="container">
        <div className="card search-soon">
          <Icon name="alert" size={28} />
          <h2>{rec.status === "cancelled" ? "This booking is already cancelled" : "This trip has already departed"}</h2>
          <p className="muted">It can no longer be cancelled.</p>
          <Link to={`/my-bookings/${rec.id}`} className="btn btn-primary">View booking</Link>
        </div>
      </div></section>
    );
  }

  const q = refundQuote(rec);
  const current = cancellationPolicy.findIndex((t) => t === q.tier);
  const fee = rec.pricing.fee;
  const working = phase === "working";

  return (
    <section className="section results">
      <div className="container">
        <Link to={`/my-bookings/${rec.id}`} className="back-link"><Icon name="left" size={18} /> Back to booking</Link>
        <div className="res-head">
          <div><h1>Cancel booking</h1><p className="muted">{rec.from} to {rec.to} · {rec.operator} · {rec.id}</p></div>
          <SampleTag />
        </div>

        <div className="book-grid">
          <div className="book-main">
            <div className="card">
              <h2>Refund policy</h2>
              <p className="muted small">Your trip departs in <b>{fmtHoursLeft(q.hours)}</b>, so the highlighted row applies.</p>
              <table className="policy-table">
                <thead><tr><th>When you cancel</th><th>Refund</th></tr></thead>
                <tbody>
                  {cancellationPolicy.map((t, i) => (
                    <tr key={t.hours} className={i === current ? "on" : ""}>
                      <td>{tierLabel(t, i)}{i === current && <span className="chip on now">You are here</span>}</td>
                      <td><b>{t.percent}%</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">The convenience fee{fee ? "" : " (if any)"} is not refunded. The whole booking is cancelled, all {rec.passengers.length} seat{rec.passengers.length > 1 ? "s" : ""}: {rec.passengers.map((p) => p.seat).join(", ")}.</p>
            </div>

            <div className="card">
              <h2>Tell us why <span className="muted small">(optional)</span></h2>
              <div className="field">
                <label htmlFor="rs" className="sr-only">Reason</label>
                <select id="rs" value={reason} onChange={(e) => setReason(e.target.value)} disabled={working}>
                  {reasons.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          <aside className="card book-summary">
            <h2>Your refund</h2>
            <dl className="bs-fare">
              <div><dt>Amount paid</dt><dd>{rupee(rec.pricing.total)}</dd></div>
              {fee > 0 && <div><dt>Convenience fee (not refunded)</dt><dd>−{rupee(fee)}</dd></div>}
              <div><dt>Refundable fare</dt><dd>{rupee(q.refundable)}</dd></div>
              <div><dt>Policy deduction ({100 - q.tier.percent}%)</dt><dd>−{rupee(q.refundable - q.refund)}</dd></div>
              <div className="total"><dt>You get back</dt><dd>{rupee(q.refund)}</dd></div>
            </dl>
            {q.refund === 0 && <p className="err" role="alert">No refund applies at this time.</p>}
            <label className="fl-check">
              <input type="checkbox" checked={sure} disabled={working} onChange={(e) => setSure(e.target.checked)} />
              <span>I understand this cannot be undone.</span>
            </label>
            <button className="btn btn-primary bs-go danger-solid" disabled={!sure || working} onClick={() => setPhase("working")}>
              {working ? "Cancelling…" : q.refund > 0 ? `Cancel and refund ${rupee(q.refund)}` : "Cancel booking"}
            </button>
            <Link to={`/my-bookings/${rec.id}`} className="btn btn-ghost">Keep my booking</Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
