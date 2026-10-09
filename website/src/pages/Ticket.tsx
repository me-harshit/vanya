import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { SampleTag } from "../components/Bits";
import { longDate, TicketCard } from "../components/TicketCard";
import { clearDraft, loadDraft } from "../data/booking";
import { getBooking, useBookings } from "../data/myBookings";
import { NoSession } from "./Passengers";

// Shown right after a successful payment. The same ticket is kept under My bookings.
export function Ticket() {
  useBookings(); // re-render if the booking list changes
  const draft = loadDraft();
  const rec = getBooking(draft?.pnr);
  const [note, setNote] = useState("");

  if (!draft || !rec) return <NoSession title="No ticket to show" text="Book a bus and your ticket will appear here." />;

  async function share() {
    const text = `Vanya Holidays ticket ${rec!.id}: ${rec!.from} to ${rec!.to}, ${longDate(rec!.date)}, seats ${rec!.passengers.map((p) => p.seat).join(", ")}.`;
    try {
      if (navigator.share) await navigator.share({ title: "My bus ticket", text });
      else { await navigator.clipboard.writeText(text); setNote("Ticket details copied."); }
    } catch {
      setNote("Sharing was cancelled.");
    }
  }

  return (
    <section className="section results ticket-page">
      <div className="container">
        <div className="confirm no-print">
          <span className="tick ok"><Icon name="check" size={30} /></span>
          <div>
            <h1>Booking confirmed</h1>
            <p className="muted">Your ticket is ready. We have sent it to +91 {rec.phone}{rec.email ? ` and ${rec.email}` : ""}.</p>
          </div>
          <SampleTag />
        </div>

        <TicketCard rec={rec} />

        <div className="tk-actions no-print">
          <button className="btn btn-primary" onClick={() => window.print()}><Icon name="download" size={18} /> Download ticket</button>
          <button className="btn btn-ghost" onClick={share}><Icon name="share" size={18} /> Share</button>
          <Link to="/my-bookings" className="btn btn-ghost">My bookings</Link>
          <Link to="/" className="btn btn-ghost" onClick={() => clearDraft()}>Book another trip</Link>
        </div>
        {note && <p className="muted no-print" role="status">{note}</p>}
      </div>
    </section>
  );
}
