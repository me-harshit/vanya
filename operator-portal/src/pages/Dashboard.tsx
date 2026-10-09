import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { useBuses } from "../data/buses";
import { bookingsOf, counts, iso, startOf, tripStatus, useTrips } from "../data/trips";

const rupee = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const dayKey = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return iso(d); };

export function Dashboard() {
  const trips = useTrips();
  const buses = useBuses();
  const now = Date.now();

  const d = useMemo(() => {
    const live = trips.filter((t) => !t.cancelled);
    const today = live.filter((t) => t.date === dayKey(0));
    const week = live.filter((t) => startOf(t) > now && t.date <= dayKey(7));
    const seats = week.reduce((n, t) => n + counts(t).total, 0);
    const booked = week.reduce((n, t) => n + counts(t).booked, 0);
    const revenue = week.reduce((n, t) => n + counts(t).revenue, 0);
    const bookings = bookingsOf(trips, now);
    const done = bookings.filter((b) => b.status === "completed");
    const chart = Array.from({ length: 7 }, (_, i) => {
      const key = dayKey(i - 6);
      return { day: new Date(key + "T00:00").toLocaleDateString("en-IN", { weekday: "short" }), amount: Math.round(done.filter((b) => b.date === key).reduce((n, b) => n + b.amount, 0) / 1000) };
    });
    const next = live.filter((t) => startOf(t) > now).sort((a, b) => startOf(a) - startOf(b));
    const held = next.slice(0, 20).reduce((n, t) => n + counts(t).held, 0);
    const lowFill = next.filter((t) => t.date <= dayKey(2) && counts(t).booked / counts(t).total < 0.25).length;
    return { today, seats, booked, revenue, chart, next: next.slice(0, 4), recent: bookings.filter((b) => b.status !== "completed").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 5), held, lowFill };
  }, [trips, now]);

  const max = Math.max(1, ...d.chart.map((c) => c.amount));
  const activeBuses = buses.filter((b) => b.active).length;
  const stats = [
    { label: "Trips today", value: String(d.today.length), note: `${d.today.reduce((n, t) => n + counts(t).booked, 0)} seats booked`, icon: "calendar" },
    { label: "Fare booked, next 7 days", value: rupee(d.revenue), note: "before commission", icon: "wallet" },
    { label: "Seats filled, next 7 days", value: d.seats ? `${Math.round((d.booked / d.seats) * 100)}%` : "0%", note: `${d.booked} of ${d.seats} seats`, icon: "seat" },
    { label: "Active buses", value: String(activeBuses), note: `of ${buses.length}`, icon: "bus" },
  ] as const;

  return (
    <>
      <div className="page-head">
        <div><h1>Dashboard</h1><p className="muted">Here is how your buses are doing.</p></div>
        <Link to="/trips/new" className="btn btn-primary"><Icon name="plus" /> Schedule trips</Link>
      </div>

      <section className="stat-grid">
        {stats.map((s) => (
          <div className="card stat" key={s.label}>
            <div className="stat-top"><span className="muted">{s.label}</span><Icon name={s.icon} /></div>
            <b>{s.value}</b>
            <span className="delta">{s.note}</span>
          </div>
        ))}
      </section>

      <section className="two-col">
        <div className="card">
          <h2>Fare from completed trips, last 7 days <small className="muted">(₹ thousands)</small></h2>
          <div className="bars">
            {d.chart.map((c, i) => (
              <div key={i} className="bar-col">
                <span className="bar-val">{c.amount}</span>
                <div className="bar" style={{ height: `${Math.max(2, (c.amount / max) * 100)}%` }} />
                <span className="muted small">{c.day}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Needs attention</h2>
          <ul className="alerts">
            {d.lowFill > 0 && <li className="warning"><Icon name="alert" /> <span>{d.lowFill} trip{d.lowFill === 1 ? "" : "s"} in the next 2 days {d.lowFill === 1 ? "is" : "are"} less than a quarter full.</span></li>}
            {d.held > 0 && <li className="warning"><Icon name="clock" /> <span>{d.held} seat{d.held === 1 ? " is" : "s are"} on hold while customers pay.</span></li>}
            <li className="success"><Icon name="check" /> <span>Last payout of ₹1,47,780 was paid on 7 Oct.</span></li>
            <li className="warning"><Icon name="alert" /> <span>Your route permit needs a clearer copy. <Link to="/profile">Upload it</Link></span></li>
          </ul>
        </div>
      </section>

      <section className="card">
        <h2>Next departures</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Departs</th><th>Route</th><th>Bus</th><th>Seats booked</th><th>Status</th></tr></thead>
            <tbody>
              {d.next.map((t) => {
                const c = counts(t);
                return (
                  <tr key={t.id} className="click">
                    <td><Link to={`/trips/${t.id}`}>{new Date(startOf(t)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, {t.time}</Link></td>
                    <td>{t.from} to {t.to}</td><td className="muted">{t.busName}</td>
                    <td><div className="meter"><div style={{ width: `${(c.booked / c.total) * 100}%` }} /></div><span className="small">{c.booked}/{c.total}</span></td>
                    <td><span className={"pill " + (tripStatus(t) === "scheduled" ? "ok" : "off")}>Scheduled</span></td>
                  </tr>
                );
              })}
              {d.next.length === 0 && <tr><td colSpan={5} className="muted">No upcoming trips. Schedule some to start selling.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Bookings coming up</h2><Link to="/bookings" className="link-btn">All bookings</Link></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Booking</th><th>Passenger</th><th>Trip</th><th>Seats</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {d.recent.map((b) => (
                <tr key={b.tripId + b.id}>
                  <td className="mono">{b.id}</td><td>{b.passengers[0].name}{b.passengers.length > 1 ? ` +${b.passengers.length - 1}` : ""}</td><td>{b.from} to {b.to}</td><td>{b.seats.join(", ")}</td><td>{rupee(b.amount)}</td>
                  <td><span className={"pill " + (b.status === "confirmed" ? "ok" : "bad")}>{b.status === "confirmed" ? "Confirmed" : "Cancelled"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
