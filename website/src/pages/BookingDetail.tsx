import { Link, Navigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { SampleTag } from "../components/Bits";
import { rupee, TicketCard } from "../components/TicketCard";
import { useSession } from "../data/auth";
import { fmtHoursLeft } from "../data/policy";
import { getBooking, hoursLeft, kindOf, refundQuote, useBookings } from "../data/myBookings";

export function BookingDetail() {
  const { id } = useParams();
  const session = useSession();
  useBookings();
  const rec = getBooking(id);

  if (!session) return <Navigate to={`/login?next=/my-bookings/${id ?? ""}`} replace />;
  if (!rec) {
    return (
      <section className="section"><div className="container">
        <div className="card search-soon">
          <Icon name="ticket" size={28} />
          <h2>We could not find this booking</h2>
          <Link to="/my-bookings" className="btn btn-primary">Back to my bookings</Link>
        </div>
      </div></section>
    );
  }

  const kind = kindOf(rec);
  const q = refundQuote(rec);
  const c = rec.cancellation;

  return (
    <section className="section results ticket-page">
      <div className="container">
        <Link to="/my-bookings" className="back-link no-print"><Icon name="left" size={18} /> My bookings</Link>
        <div className="res-head no-print">
          <div>
            <h1>Booking {rec.id}</h1>
            <p className="muted">{kind === "upcoming" ? `Departs in ${fmtHoursLeft(hoursLeft(rec))}` : kind === "completed" ? "This trip is complete" : "Cancelled"}</p>
          </div>
          <SampleTag />
        </div>

        {c && (
          <div className="card refund-box no-print">
            <h2>Cancellation and refund</h2>
            <dl>
              <div><dt>Cancelled on</dt><dd>{new Date(c.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd></div>
              <div><dt>Reason</dt><dd>{c.reason || "Not given"}</dd></div>
              <div><dt>Amount paid</dt><dd>{rupee(rec.pricing.total)}</dd></div>
              <div><dt>Kept as per policy ({100 - c.percent}%{rec.pricing.fee ? " + fee" : ""})</dt><dd>−{rupee(c.kept)}</dd></div>
              <div className="total"><dt>Refund to your original payment method</dt><dd>{rupee(c.refund)}</dd></div>
            </dl>
            <p className="muted small">Refunds reach your account in 5 to 7 working days.</p>
          </div>
        )}

        <TicketCard rec={rec} />

        <div className="tk-actions no-print">
          {kind !== "cancelled" && <button className="btn btn-primary" onClick={() => window.print()}><Icon name="download" size={18} /> Download ticket</button>}
          {kind === "upcoming" && (
            <Link to={`/my-bookings/${rec.id}/cancel`} className="btn btn-ghost danger">Cancel booking{q.refund > 0 ? ` (refund ${rupee(q.refund)})` : ""}</Link>
          )}
          <Link to="/my-bookings" className="btn btn-ghost">All bookings</Link>
        </div>
      </div>
    </section>
  );
}
