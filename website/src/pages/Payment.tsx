import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { BookingSummary, HoldBar } from "../components/BookingSummary";
import { Icon, type IconName } from "../components/Icon";
import { SampleTag } from "../components/Bits";
import { site } from "../config";
import { loadDraft, makePnr, saveDraft, totalsFor, useHold } from "../data/booking";
import { addBooking, recordFromDraft } from "../data/myBookings";
import { findTrip } from "../data/trips";
import { NoSession } from "./Passengers";

const methods: { id: string; label: string; hint: string; icon: IconName }[] = [
  { id: "upi", label: "UPI", hint: "Google Pay, PhonePe, Paytm and more", icon: "phone" },
  { id: "card", label: "Debit or credit card", hint: "Visa, Mastercard, RuPay", icon: "card" },
  { id: "netbanking", label: "Net banking", hint: "All major banks", icon: "building" },
  { id: "wallet", label: "Wallets", hint: "Paytm, PhonePe and others", icon: "wallet" },
];

type Phase = "idle" | "processing" | "success" | "failed";

export function Payment() {
  const go = useNavigate();
  const draft = loadDraft();
  const trip = useMemo(() => (draft ? findTrip(draft.from, draft.to, draft.date, draft.tripId) : undefined), [draft]);
  const { expired } = useHold(draft?.holdUntil ?? 0);
  const [method, setMethod] = useState("upi");
  const [phase, setPhase] = useState<Phase>("idle");
  const [failNext, setFailNext] = useState(false);

  // Demo only: this is a pretend payment. No card, UPI or bank details are asked for or stored.
  useEffect(() => {
    if (phase !== "processing") return;
    const t = setTimeout(() => {
      if (failNext) { setPhase("failed"); return; }
      // Payment went through: record the booking, then show the success screen.
      const d = loadDraft();
      const t = d ? findTrip(d.from, d.to, d.date, d.tripId) : undefined;
      if (d && t) {
        const paid = { ...d, pnr: d.pnr ?? makePnr(d.tripId + d.seats.join() + Date.now()), paidAt: Date.now(), method };
        saveDraft(paid);
        addBooking(recordFromDraft(paid, t)); // appears under My bookings
      }
      setPhase("success");
    }, 1800);
    return () => clearTimeout(t);
  }, [phase, failNext, method]);

  // Depends only on stable values: the hold timer re-renders this page every second, and a changing
  // dependency here would keep resetting the redirect.
  const tripIdForTicket = draft?.tripId;
  useEffect(() => {
    if (phase !== "success" || !tripIdForTicket) return;
    const t = setTimeout(() => go(`/book/${tripIdForTicket}/ticket`), 1300);
    return () => clearTimeout(t);
  }, [phase, tripIdForTicket, go]);

  if (!draft || !trip) return <NoSession />;
  if (draft.pnr && phase === "idle") return <Navigate to={`/book/${draft.tripId}/ticket`} replace />;
  if (draft.passengers.some((x) => !x.name.trim() || !x.gender) || !draft.phone) {
    return <Navigate to={`/book/${draft.tripId}/passengers?from=${encodeURIComponent(draft.from)}&to=${encodeURIComponent(draft.to)}&date=${draft.date}&seats=${draft.seats.join(",")}&bp=${draft.bp}&dp=${draft.dp}`} replace />;
  }
  const back = `/book/${draft.tripId}/passengers?from=${encodeURIComponent(draft.from)}&to=${encodeURIComponent(draft.to)}&date=${draft.date}&seats=${draft.seats.join(",")}&bp=${draft.bp}&dp=${draft.dp}`;

  if (expired && phase === "idle") {
    return (
      <section className="section"><div className="container">
        <div className="card search-soon">
          <Icon name="clock" size={28} />
          <h2>Your seat hold has ended</h2>
          <p className="muted">Seats are held for 10 minutes. Choose them again to continue.</p>
          <Link to={`/book/${draft.tripId}?from=${encodeURIComponent(draft.from)}&to=${encodeURIComponent(draft.to)}&date=${draft.date}`} className="btn btn-primary">Choose seats again</Link>
        </div>
      </div></section>
    );
  }

  const totals = totalsFor(trip, draft.seats.length, draft.coupon, draft.date);
  const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");

  return (
    <section className="section results">
      <div className="container">
        <Link to={back} className="back-link"><Icon name="left" size={18} /> Passenger details</Link>
        <div className="res-head">
          <div><h1>Payment</h1><p className="muted">Review your booking and pay securely</p></div>
          <SampleTag />
        </div>
        <HoldBar until={draft.holdUntil} />

        <div className="book-grid">
          <div className="book-main">
            <div className="card">
              <h2>Passengers</h2>
              <ul className="pax-list">
                {draft.passengers.map((x) => (
                  <li key={x.seat}>
                    <span className="chip on">{x.seat}</span>
                    <span><b>{x.name}</b><small className="muted">{x.age} yrs · {x.gender[0].toUpperCase() + x.gender.slice(1)}</small></span>
                  </li>
                ))}
              </ul>
              <p className="muted small">Ticket will be sent to +91 {draft.phone}{draft.email ? ` and ${draft.email}` : ""}.</p>
            </div>

            <div className="card">
              <h2>Choose how to pay</h2>
              <div className="pay-methods" role="radiogroup" aria-label="Payment method">
                {methods.map((m) => (
                  <label key={m.id} className={"pay-method" + (method === m.id ? " on" : "")}>
                    <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
                    <Icon name={m.icon} size={22} />
                    <span><b>{m.label}</b><small className="muted">{m.hint}</small></span>
                  </label>
                ))}
              </div>
              <p className="secure"><Icon name="lock" size={16} /> Payments are processed by our payment partner on a secure page. We never see or store your card or bank details.</p>
              {site.showSampleBadge && (
                <div className="demo-box">
                  <b>Demo only</b>
                  <p className="muted small">This is a pretend payment: no real money moves and no payment details are asked for.</p>
                  <label className="fl-check"><input type="checkbox" checked={failNext} onChange={(e) => setFailNext(e.target.checked)} /> Make this payment fail (to see the failure screen)</label>
                </div>
              )}
            </div>
          </div>

          <BookingSummary trip={trip} draft={draft} totals={totals}>
            <button className="btn btn-primary bs-go" onClick={() => setPhase("processing")}><Icon name="lock" size={18} /> Pay {rupee(totals.total)}</button>
          </BookingSummary>
        </div>
      </div>

      {phase !== "idle" && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Payment status">
          <div className="pay-modal card">
            {phase === "processing" && (<><span className="spinner" aria-hidden /><h2>Processing your payment</h2><p className="muted">Please do not close or refresh this page.</p></>)}
            {phase === "success" && (<><span className="tick ok"><Icon name="check" size={34} /></span><h2>Payment successful</h2><p className="muted">Confirming your seats and preparing your ticket…</p></>)}
            {phase === "failed" && (
              <>
                <span className="tick bad"><Icon name="close" size={34} /></span>
                <h2>Payment failed</h2>
                <p className="muted">No money was taken. Your seats are still held for you, so you can try again.</p>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={() => { setFailNext(false); setPhase("processing"); }}>Try again</button>
                  <button className="btn btn-ghost" onClick={() => setPhase("idle")}>Change method</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
