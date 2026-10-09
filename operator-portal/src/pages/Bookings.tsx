import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { bookingsOf, parseDate, useTrips, type OpBooking } from "../data/trips";

const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");
type Filter = "all" | OpBooking["status"];
const PAGE = 25;

function Detail({ b, onClose }: { b: OpBooking; onClose: () => void }) {
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Booking ${b.id}`}>
        <div className="modal-head">
          <div><h2>Booking {b.id}</h2><p className="muted small">{b.from} to {b.to} · {parseDate(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, {b.time} · {b.busName}</p></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <table className="mini-table">
          <thead><tr><th>Seat</th><th>Passenger</th><th>Age</th><th>Gender</th></tr></thead>
          <tbody>{b.passengers.map((p) => <tr key={p.seat}><td><b>{p.seat}</b></td><td>{p.name}</td><td>{p.age}</td><td>{p.gender === "male" ? "Male" : "Female"}</td></tr>)}</tbody>
        </table>
        <dl className="kv">
          <div><dt>Contact</dt><dd>+91 {b.passengers[0].phone}</dd></div>
          <div><dt>Amount</dt><dd>{rupee(b.amount)}</dd></div>
          <div><dt>Status</dt><dd><span className={"pill " + (b.status === "cancelled" ? "bad" : b.status === "completed" ? "off" : "ok")}>{b.status[0].toUpperCase() + b.status.slice(1)}</span></dd></div>
        </dl>
        <Link to={`/trips/${b.tripId}`} className="btn btn-ghost">Open trip and manifest</Link>
      </div>
    </div>
  );
}

export function Bookings() {
  const trips = useTrips();
  // Nearest to today first, whether the trip is coming up or just done.
  const all = useMemo(() => {
    const now = Date.now();
    const at = (b: OpBooking) => new Date(`${b.date}T${b.time}`).getTime();
    return bookingsOf(trips).sort((x, y) => Math.abs(at(x) - now) - Math.abs(at(y) - now));
  }, [trips]);
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<OpBooking | null>(null);

  const list = all.filter((b) => (f === "all" || b.status === f) && (q.trim() === "" || (b.id + b.passengers.map((p) => p.name + p.phone).join(" ") + b.from + b.to).toLowerCase().includes(q.trim().toLowerCase())));
  const tab = (id: Filter, label: string) => <button key={id} className={f === id ? "on" : ""} onClick={() => { setF(id); setShown(PAGE); }}>{label} <span className="count">{id === "all" ? all.length : all.filter((b) => b.status === id).length}</span></button>;

  return (
    <>
      <div className="page-head">
        <div><h1>Bookings</h1><p className="muted">Everyone who has booked your trips.</p></div>
      </div>
      <div className="toolbar">
        <div className="search"><Icon name="search" size={18} /><input placeholder="Search by booking ID, name, phone or city" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} /></div>
        <div className="tabs">{tab("all", "All")}{tab("confirmed", "Upcoming")}{tab("completed", "Completed")}{tab("cancelled", "Cancelled")}</div>
      </div>

      {list.length === 0 ? (
        <div className="empty card"><Icon name="ticket" size={28} /><h2>No bookings found</h2><p>Try a different search or filter.</p></div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Booking</th><th>Trip</th><th>Departs</th><th>Seats</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {list.slice(0, shown).map((b) => (
                <tr key={b.tripId + b.id} className="click" onClick={() => setOpen(b)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(b)}>
                  <td className="mono">{b.id}<div className="muted small">{b.passengers[0].name}{b.passengers.length > 1 ? ` +${b.passengers.length - 1}` : ""}</div></td>
                  <td>{b.from} to {b.to}</td>
                  <td>{parseDate(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, {b.time}</td>
                  <td>{b.seats.join(", ")}</td>
                  <td>{rupee(b.amount)}</td>
                  <td><span className={"pill " + (b.status === "cancelled" ? "bad" : b.status === "completed" ? "off" : "ok")}>{b.status === "confirmed" ? "Upcoming" : b.status[0].toUpperCase() + b.status.slice(1)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > shown && <div className="more"><button className="btn btn-ghost" onClick={() => setShown(shown + PAGE)}>Show more ({list.length - shown} left)</button></div>}
        </div>
      )}
      {open && <Detail b={open} onClose={() => setOpen(null)} />}
    </>
  );
}
