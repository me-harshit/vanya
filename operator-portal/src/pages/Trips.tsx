import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Calendar } from "../components/Calendar";
import { Icon } from "../components/Icon";
import { fmtDur, useRoutes } from "../data/routes";
import { useBuses } from "../data/buses";
import { counts, iso, parseDate, resetDemoTrips, tripStatus, useTrips } from "../data/trips";

export function Trips() {
  const [q, setQ] = useSearchParams();
  const trips = useTrips();
  const buses = useBuses();
  const routes = useRoutes();
  const today = iso(new Date());
  const date = q.get("date") ?? today;
  const [month, setMonth] = useState(() => parseDate(date));
  const [bus, setBus] = useState("");
  const [route, setRoute] = useState("");
  const created = Number(q.get("created") ?? 0);
  const skipped = Number(q.get("skipped") ?? 0);

  const visible = useMemo(() => trips.filter((t) => (!bus || t.busId === bus) && (!route || t.routeId === route)), [trips, bus, route]);
  const perDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of visible) m[t.date] = (m[t.date] ?? 0) + 1;
    return m;
  }, [visible]);
  const day = visible.filter((t) => t.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const select = (d: string) => setQ({ date: d });

  return (
    <>
      <div className="page-head">
        <div><h1>Trips</h1><p className="muted">Every departure of your buses. Pick a day to see its trips.</p></div>
        <Link to="/trips/new" className="btn btn-primary"><Icon name="plus" /> Schedule trips</Link>
      </div>

      {created > 0 && (
        <div className="card notice ok" role="status">
          <Icon name="check" /> <span><b>{created} trip{created === 1 ? "" : "s"} created.</b>{skipped > 0 ? ` ${skipped} date${skipped === 1 ? " was" : "s were"} skipped.` : ""}</span>
        </div>
      )}

      <div className="toolbar">
        <div className="filters">
          <select aria-label="Filter by bus" value={bus} onChange={(e) => setBus(e.target.value)}><option value="">All buses</option>{buses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select aria-label="Filter by route" value={route} onChange={(e) => setRoute(e.target.value)}><option value="">All routes</option>{routes.map((r) => <option key={r.id} value={r.id}>{r.from} to {r.to}</option>)}</select>
        </div>
        <button className="link-btn" onClick={() => { setMonth(parseDate(today)); select(today); }}>Jump to today</button>
      </div>

      <div className="trips-split">
        <div className="card"><Calendar month={month} onMonth={setMonth} selected={date} onSelect={select} counts={perDay} /></div>
        <section className="stack">
          <h2 className="day-title">{parseDate(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} <span className="muted small">{day.length} trip{day.length === 1 ? "" : "s"}</span></h2>
          {day.length === 0 ? (
            <div className="empty card"><Icon name="calendar" size={28} /><h2>No trips on this day</h2><Link to="/trips/new" className="btn btn-primary">Schedule trips</Link></div>
          ) : day.map((t) => {
            const c = counts(t);
            const st = tripStatus(t);
            return (
              <Link key={t.id} to={`/trips/${t.id}`} className={"card trip-row" + (st === "cancelled" ? " off" : "")}>
                <div className="tr-time"><b>{t.time}</b><span className="muted small">{fmtDur(t.durationMin)}</span></div>
                <div className="tr-main"><b>{t.from} <Icon name="arrow" size={14} /> {t.to}</b><span className="muted small">{t.busName}</span></div>
                <div className="tr-seats">
                  <div className="meter"><div style={{ width: `${(c.booked / c.total) * 100}%` }} /></div>
                  <span className="small">{c.booked}/{c.total} booked</span>
                </div>
                <div className="tr-fare"><b>₹{t.fare.toLocaleString("en-IN")}</b><span className={"pill " + (st === "scheduled" ? "ok" : st === "cancelled" ? "bad" : "off")}>{st === "scheduled" ? "Scheduled" : st === "cancelled" ? "Cancelled" : "Completed"}</span></div>
              </Link>
            );
          })}
        </section>
      </div>
      <p className="muted small reset-note">Trips and bookings here are made up. <button className="link-btn" onClick={() => resetDemoTrips()}>Reset demo trips</button></p>
    </>
  );
}
