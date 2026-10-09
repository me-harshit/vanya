import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { rowsUsed, useBuses } from "../data/buses";
import { fmtDur, useRoutes } from "../data/routes";
import { createTrips, DEFAULT_POLICY, iso, MAX_GENERATE_DAYS, parseDate, planTrips, useTrips, addDays } from "../data/trips";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Same rule as the backend: hours go down, refunds never go up.
function policyProblem(p: { hours: number; percent: number }[]): string {
  if (p.length < 1 || p.length > 8) return "Use 1 to 8 rules.";
  for (let i = 1; i < p.length; i++) {
    if (!(p[i].hours < p[i - 1].hours)) return "Hours must go down from one rule to the next.";
    if (p[i].percent > p[i - 1].percent) return "A later rule cannot refund more than an earlier one.";
  }
  return p.some((r) => r.hours < 0 || r.percent < 0 || r.percent > 100) ? "Percent must be 0 to 100 and hours cannot be negative." : "";
}

// Demo: creating trips only adds them to the in-memory list.
export function ScheduleForm() {
  const [q] = useSearchParams();
  const go = useNavigate();
  const buses = useBuses().filter((b) => b.active);
  const routes = useRoutes().filter((r) => r.active);
  const existing = useTrips();
  const today = iso(new Date());

  const [busId, setBusId] = useState(buses[0]?.id ?? "");
  const [routeId, setRouteId] = useState(routes.find((r) => r.id === q.get("route"))?.id ?? routes[0]?.id ?? "");
  const [time, setTime] = useState("21:30");
  const [startDate, setStartDate] = useState(addDays(today, 1));
  const [endDate, setEndDate] = useState(addDays(today, 14));
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [fare, setFare] = useState("");
  const [upperFare, setUpperFare] = useState("");
  const [custom, setCustom] = useState(false);
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [tried, setTried] = useState(false);

  const bus = buses.find((b) => b.id === busId);
  const route = routes.find((r) => r.id === routeId);
  const hasUpper = !!bus && rowsUsed(bus.seats, "upper") > 0;
  const fareN = Number(fare);
  const upperN = hasUpper ? Number(upperFare || fare) : fareN;
  const pol = custom ? policy : DEFAULT_POLICY;

  const plan = useMemo(
    () => planTrips({ busId, routeId, time, startDate, endDate, days, fare: fareN, upperFare: upperN, policy: pol }, existing),
    [busId, routeId, time, startDate, endDate, days, fareN, upperN, pol, existing],
  );

  const errors: string[] = [];
  if (!bus) errors.push("Choose a bus.");
  if (!route) errors.push("Choose a route.");
  if (!time) errors.push("Choose a departure time.");
  if (!startDate || !endDate) errors.push("Choose the start and end dates.");
  if (days.length === 0) errors.push("Choose at least one day of the week.");
  if (!(fareN >= 1 && fareN <= 100000)) errors.push("Enter the fare in rupees (1 to 1,00,000).");
  if (hasUpper && upperFare && !(Number(upperFare) >= 1)) errors.push("Enter a valid upper deck fare or leave it empty.");
  if (plan.error) errors.push(plan.error);
  if (custom && policyProblem(policy)) errors.push(policyProblem(policy));
  if (!plan.error && plan.dates.length === 0 && startDate && endDate && days.length) errors.push("No trips can be created with these choices.");

  function create() {
    setTried(true);
    if (errors.length) return;
    const r = createTrips({ busId, routeId, time, startDate, endDate, days, fare: fareN, upperFare: upperN, policy: pol });
    go(`/trips?date=${r.firstDate}&created=${r.created}&skipped=${r.skipped.length}`);
  }

  if (buses.length === 0 || routes.length === 0) {
    return (
      <div className="empty card">
        <Icon name="alert" size={28} />
        <h1>You need an active bus and an active route first</h1>
        <p className="muted">Add them, then come back to schedule trips.</p>
        <div className="head-actions"><Link to="/buses/new" className="btn btn-ghost">Add a bus</Link><Link to="/routes/new" className="btn btn-primary">Add a route</Link></div>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/trips" className="back"><Icon name="back" size={16} /> Trips</Link>
          <h1>Schedule trips</h1>
          <p className="muted">Create a run of trips in one go, for example every day at 21:30.</p>
        </div>
      </div>

      <div className="book-split">
        <div className="stack">
          <section className="card form">
            <h2>Bus and route</h2>
            <div className="form-grid">
              <label>Bus
                <select value={busId} onChange={(e) => setBusId(e.target.value)}>{buses.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.seats.length} seats)</option>)}</select>
              </label>
              <label>Route
                <select value={routeId} onChange={(e) => setRouteId(e.target.value)}>{routes.map((r) => <option key={r.id} value={r.id}>{r.from} to {r.to} ({fmtDur(r.durationMin)})</option>)}</select>
              </label>
            </div>
          </section>

          <section className="card form">
            <h2>When</h2>
            <div className="form-grid three">
              <label>Departure time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
              <label>First date<input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
              <label>Last date<input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
            </div>
            <div>
              <span className="lbl">Runs on</span>
              <div className="chips pick">
                {dayNames.map((n, i) => {
                  const on = days.includes(i);
                  return <button key={n} type="button" className={"chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => setDays(on ? days.filter((d) => d !== i) : [...days, i].sort())}>{n}</button>;
                })}
              </div>
            </div>
          </section>

          <section className="card form">
            <h2>Fare</h2>
            <div className="form-grid">
              <label>Fare per seat (₹)<input type="number" min={1} value={fare} onChange={(e) => setFare(e.target.value)} placeholder="e.g. 780" /></label>
              {hasUpper && <label>Upper deck fare (₹) <span className="muted small">optional</span><input type="number" min={1} value={upperFare} onChange={(e) => setUpperFare(e.target.value)} placeholder="Same as lower deck" /></label>}
            </div>
          </section>

          <section className="card form">
            <h2>Cancellation policy</h2>
            <p className="muted small">What customers get back when they cancel. The convenience fee is never refunded.</p>
            <label className="check"><input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} /> Use my own rules instead of the default</label>
            <table className="policy">
              <thead><tr><th>Cancel at least (hours before)</th><th>Refund (%)</th>{custom && <th />}</tr></thead>
              <tbody>
                {pol.map((r, i) => (
                  <tr key={i}>
                    <td>{custom ? <input type="number" min={0} value={r.hours} onChange={(e) => setPolicy(policy.map((x, j) => (j === i ? { ...x, hours: Number(e.target.value) } : x)))} /> : `${r.hours} hours`}</td>
                    <td>{custom ? <input type="number" min={0} max={100} value={r.percent} onChange={(e) => setPolicy(policy.map((x, j) => (j === i ? { ...x, percent: Number(e.target.value) } : x)))} /> : `${r.percent}%`}</td>
                    {custom && <td><button type="button" className="icon-btn" aria-label="Remove rule" disabled={policy.length <= 1} onClick={() => setPolicy(policy.filter((_, j) => j !== i))}><Icon name="trash" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {custom && <button type="button" className="btn btn-ghost" disabled={policy.length >= 8} onClick={() => setPolicy([...policy, { hours: Math.max(0, (policy[policy.length - 1]?.hours ?? 1) - 1), percent: 0 }])}><Icon name="plus" /> Add rule</button>}
          </section>
        </div>

        <aside className="card preview">
          <h2>Preview</h2>
          {route && bus && <p className="muted small">{route.from} to {route.to}, {bus.name}, departing {time || "--:--"}</p>}
          <div className="preview-count"><b>{plan.dates.length}</b> trip{plan.dates.length === 1 ? "" : "s"} will be created</div>
          {plan.dates.length > 0 && (
            <div className="chips">{plan.dates.slice(0, 12).map((d) => <span key={d} className="chip">{parseDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>)}{plan.dates.length > 12 && <span className="muted small">+{plan.dates.length - 12} more</span>}</div>
          )}
          {plan.skipped.length > 0 && (
            <div className="skipped">
              <b>{plan.skipped.length} date{plan.skipped.length === 1 ? "" : "s"} skipped</b>
              <ul>{plan.skipped.slice(0, 5).map((s) => <li key={s.date}>{parseDate(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: {s.reason}</li>)}</ul>
              {plan.skipped.length > 5 && <span className="muted small">and {plan.skipped.length - 5} more</span>}
            </div>
          )}
          <p className="muted small">You can schedule up to {MAX_GENERATE_DAYS} days at a time. Dates in the past, and times when this bus already has a trip, are skipped.</p>
          {tried && errors.length > 0 && <ul className="problems">{errors.map((e) => <li key={e}><Icon name="alert" size={16} /> {e}</li>)}</ul>}
          <button className="btn btn-primary" onClick={create}><Icon name="check" /> Create {plan.dates.length || ""} trip{plan.dates.length === 1 ? "" : "s"}</button>
        </aside>
      </div>
    </>
  );
}
