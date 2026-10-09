import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { TripLegend, TripSeatGrid } from "../components/TripSeatGrid";
import { rowsUsed, type Deck } from "../data/buses";
import { fmtDur } from "../data/routes";
import { cancelTrip, counts, getTrip, parseDate, tripStatus, useTrips, type TripSeat } from "../data/trips";

const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");

export function TripDetail() {
  const { id } = useParams();
  useTrips();
  const trip = getTrip(id);
  const [deck, setDeck] = useState<Deck>("lower");
  const [picked, setPicked] = useState<TripSeat | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{ passengers: number; refund: number } | null>(null);

  if (!trip) {
    return <div className="empty card"><Icon name="calendar" size={28} /><h1>Trip not found</h1><Link to="/trips" className="btn btn-primary">Back to trips</Link></div>;
  }

  const c = counts(trip);
  const st = tripStatus(trip);
  const hasUpper = rowsUsed(trip.seats, "upper") > 0;
  const rows = trip.seats.filter((s) => s.status === "booked" && s.passenger).sort((a, b) => a.no.localeCompare(b.no, undefined, { numeric: true }));
  const live = picked ? trip.seats.find((s) => s.no === picked.no) ?? null : null;
  const when = `${parseDate(trip.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${trip.time}`;

  return (
    <>
      <div className="page-head no-print">
        <div>
          <Link to={`/trips?date=${trip.date}`} className="back"><Icon name="back" size={16} /> Trips</Link>
          <h1>{trip.from} <Icon name="arrow" size={22} /> {trip.to}</h1>
          <p className="muted">{when} · {trip.busName} · {fmtDur(trip.durationMin)}</p>
        </div>
        <div className="head-actions">
          <span className={"pill big " + (st === "scheduled" ? "ok" : st === "cancelled" ? "bad" : "off")}>{st === "scheduled" ? "Scheduled" : st === "cancelled" ? "Cancelled" : "Completed"}</span>
          <button className="btn btn-ghost" onClick={() => window.print()}><Icon name="download" /> Print manifest</button>
          {st === "scheduled" && <button className="btn btn-ghost danger" onClick={() => setConfirm(true)}>Cancel trip</button>}
        </div>
      </div>

      {st === "cancelled" && <div className="card notice bad" role="status"><Icon name="alert" /> <span>This trip is cancelled. Every passenger was refunded in full.</span></div>}

      <section className="stat-grid no-print">
        <div className="card stat"><div className="stat-top"><span className="muted">Booked</span><Icon name="ticket" /></div><b>{c.booked}</b><span className="delta">of {c.total} seats</span></div>
        <div className="card stat"><div className="stat-top"><span className="muted">On hold</span><Icon name="clock" /></div><b>{c.held}</b><span className="delta">customers paying now</span></div>
        <div className="card stat"><div className="stat-top"><span className="muted">Available</span><Icon name="seat" /></div><b>{c.available}</b><span className="delta">open for booking</span></div>
        <div className="card stat"><div className="stat-top"><span className="muted">Fare collected</span><Icon name="wallet" /></div><b>{rupee(c.revenue)}</b><span className="delta">before commission</span></div>
      </section>

      <div className="trips-split detail no-print">
        <section className={"card" + (st === "cancelled" ? " faded" : "")}>
          <div className="builder-bar">
            <h2>Seat status</h2>
            {hasUpper && (
              <div className="tabs">
                {(["lower", "upper"] as const).map((d) => <button key={d} className={deck === d ? "on" : ""} onClick={() => setDeck(d)}>{d === "lower" ? "Lower deck" : "Upper deck"}</button>)}
              </div>
            )}
          </div>
          <TripLegend />
          <div className="canvas">
            <TripSeatGrid seats={trip.seats} deck={hasUpper ? deck : "lower"} selectedNo={live?.no} onPick={(s) => setPicked(s)} />
          </div>
        </section>

        <aside className="card seat-panel">
          <h2>{live ? `Seat ${live.no}` : "Seat details"}</h2>
          {!live ? <p className="muted small">Select a seat to see who booked it.</p> : (
            <dl className="kv">
              <div><dt>Status</dt><dd><span className={"pill " + (live.status === "booked" ? "ok" : live.status === "held" ? "warn" : "off")}>{live.status === "held" ? "On hold" : live.status[0].toUpperCase() + live.status.slice(1)}</span></dd></div>
              <div><dt>Type</dt><dd>{live.kind === "sleeper" ? "Sleeper" : "Seater"}, {live.deck} deck</dd></div>
              <div><dt>Fare</dt><dd>{rupee(live.price)}</dd></div>
              {live.passenger && (
                <>
                  <div><dt>Passenger</dt><dd>{live.passenger.name}</dd></div>
                  <div><dt>Age, gender</dt><dd>{live.passenger.age}, {live.passenger.gender}</dd></div>
                  <div><dt>Phone</dt><dd>+91 {live.passenger.phone}</dd></div>
                  <div><dt>Booking</dt><dd className="mono">{live.passenger.bookingId}</dd></div>
                </>
              )}
            </dl>
          )}
        </aside>
      </div>

      <section className="card manifest">
        <div className="manifest-head"><h2>Passenger manifest</h2><span className="muted small print-only">{trip.from} to {trip.to} · {when} · {trip.busName}</span></div>
        {rows.length === 0 ? <p className="muted">No bookings on this trip yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Seat</th><th>Passenger</th><th>Age</th><th>Gender</th><th>Phone</th><th>Booking</th><th>Fare</th></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.no}><td><b>{s.no}</b></td><td>{s.passenger!.name}</td><td>{s.passenger!.age}</td><td>{s.passenger!.gender === "male" ? "Male" : "Female"}</td><td>+91 {s.passenger!.phone}</td><td className="mono">{s.passenger!.bookingId}</td><td>{rupee(s.price)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirm && (
        <div className="modal-wrap" onClick={() => !result && setConfirm(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Cancel trip">
            {result ? (
              <>
                <div className="modal-head"><h2>Trip cancelled</h2></div>
                <p>{result.passengers > 0 ? `${result.passengers} passenger${result.passengers === 1 ? " is" : "s are"} being refunded ${rupee(result.refund)} in full, and they have been told.` : "No bookings were affected."}</p>
                <button className="btn btn-primary" onClick={() => { setConfirm(false); setResult(null); }}>Done</button>
              </>
            ) : (
              <>
                <div className="modal-head"><h2>Cancel this trip?</h2><button className="icon-btn" onClick={() => setConfirm(false)} aria-label="Close"><Icon name="close" /></button></div>
                <p>{when}, {trip.from} to {trip.to}.</p>
                <dl className="kv">
                  <div><dt>Passengers affected</dt><dd>{c.booked}</dd></div>
                  <div><dt>Full refund to pay</dt><dd><b>{rupee(c.revenue)}</b></dd></div>
                </dl>
                <p className="muted small">When an operator cancels, every passenger gets a full refund, whatever the cancellation policy says. This cannot be undone.</p>
                <div className="head-actions">
                  <button className="btn btn-ghost" onClick={() => setConfirm(false)}>Keep trip</button>
                  <button className="btn danger-solid" onClick={() => setResult(cancelTrip(trip.id))}>Cancel trip and refund</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
