import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { fmtDur, setRouteActive, useRoutes } from "../data/routes";
import { useTrips } from "../data/trips";

export function Routes() {
  const routes = useRoutes();
  const trips = useTrips();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (id: string) => trips.filter((t) => t.routeId === id && !t.cancelled && t.date >= today).length;

  return (
    <>
      <div className="page-head">
        <div><h1>Routes &amp; schedules</h1><p className="muted">{routes.length} routes · {routes.filter((r) => r.active).length} active</p></div>
        <div className="head-actions">
          <Link to="/trips/new" className="btn btn-ghost"><Icon name="calendar" /> Schedule trips</Link>
          <Link to="/routes/new" className="btn btn-primary"><Icon name="plus" /> Add route</Link>
        </div>
      </div>

      <section className="bus-grid">
        {routes.map((r) => (
          <article key={r.id} className={"card bus" + (r.active ? "" : " off")}>
            <div className="bus-top">
              <div>
                <h2 className="route-title">{r.from} <Icon name="arrow" size={16} /> {r.to}</h2>
                <span className="muted small">{r.distanceKm} km · {fmtDur(r.durationMin)}</span>
              </div>
              <span className={"pill " + (r.active ? "ok" : "off")}>{r.active ? "Active" : "Inactive"}</span>
            </div>
            <div className="stops">
              <div><small className="muted">Boarding</small>{r.boarding.map((s) => <span key={s.point}>{s.point}</span>)}</div>
              <div><small className="muted">Dropping</small>{r.dropping.map((s) => <span key={s.point}>{s.point}</span>)}</div>
            </div>
            <p className="muted small">{upcoming(r.id)} upcoming trips</p>
            <div className="bus-actions">
              <Link to={`/trips/new?route=${r.id}`} className={"btn btn-ghost" + (r.active ? "" : " disabled")} aria-disabled={!r.active}><Icon name="calendar" /> Schedule</Link>
              <Link to={`/routes/${r.id}`} className="btn btn-ghost"><Icon name="edit" /> Edit</Link>
              <button className="btn btn-ghost" onClick={() => setRouteActive(r.id, !r.active)}>{r.active ? "Deactivate" : "Activate"}</button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
