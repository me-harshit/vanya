import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { cityNames, cityPoints, fmtDur, getRoute, saveRoute, type Stop } from "../data/routes";

type Side = "boarding" | "dropping";

// Demo: saving only updates the in-memory list; nothing is sent anywhere.
export function RouteForm() {
  const { id } = useParams();
  const existing = id ? getRoute(id) : undefined;
  const go = useNavigate();

  const [from, setFrom] = useState(existing?.from ?? "");
  const [to, setTo] = useState(existing?.to ?? "");
  const [km, setKm] = useState(existing ? String(existing.distanceKm) : "");
  const [hours, setHours] = useState(existing ? String(Math.floor(existing.durationMin / 60)) : "");
  const [mins, setMins] = useState(existing ? String(existing.durationMin % 60) : "0");
  const [boarding, setBoarding] = useState<Stop[]>(existing?.boarding ?? []);
  const [dropping, setDropping] = useState<Stop[]>(existing?.dropping ?? []);
  const [tried, setTried] = useState(false);

  const duration = (Number(hours) || 0) * 60 + (Number(mins) || 0);
  const errors: string[] = [];
  if (!from || !to) errors.push("Choose both cities.");
  else if (from === to) errors.push("The two cities must be different.");
  if (!(Number(km) >= 1)) errors.push("Enter the distance in km.");
  if (duration < 30) errors.push("The journey must take at least 30 minutes.");
  if (boarding.length === 0) errors.push("Add at least one boarding point.");
  if (dropping.length === 0) errors.push("Add at least one dropping point.");
  for (const [label, list] of [["boarding", boarding], ["dropping", dropping]] as const) {
    if (new Set(list.map((s) => s.point)).size !== list.length) errors.push(`The same ${label} point is listed twice.`);
    if (list.some((s) => !s.point)) errors.push(`Choose a point for every ${label} row.`);
    if (duration >= 30 && list.some((s) => s.offsetMin > duration)) errors.push(`A ${label} time is later than the journey time.`);
  }

  function setSide(side: Side, next: Stop[]) {
    (side === "boarding" ? setBoarding : setDropping)(next);
  }
  function changeCity(side: Side, city: string) {
    if (side === "boarding") { setFrom(city); setBoarding([]); } else { setTo(city); setDropping([]); }
  }
  function addStop(side: Side) {
    const list = side === "boarding" ? boarding : dropping;
    const city = side === "boarding" ? from : to;
    const free = (cityPoints[city] ?? []).find((p) => !list.some((s) => s.point === p)) ?? "";
    setSide(side, [...list, { point: free, offsetMin: side === "boarding" ? (list.length ? 30 : 0) : list.length ? duration : Math.max(0, duration - 20) }]);
  }

  function save() {
    setTried(true);
    if (errors.length) return;
    saveRoute({ id: existing?.id, active: existing?.active, from, to, distanceKm: Number(km), durationMin: duration, boarding: [...boarding].sort((a, b) => a.offsetMin - b.offsetMin), dropping: [...dropping].sort((a, b) => a.offsetMin - b.offsetMin) });
    go("/routes");
  }

  function StopEditor({ side }: { side: Side }) {
    const list = side === "boarding" ? boarding : dropping;
    const city = side === "boarding" ? from : to;
    const points = cityPoints[city] ?? [];
    return (
      <div className="stop-editor">
        <h3>{side === "boarding" ? "Boarding points" : "Dropping points"}</h3>
        {!city ? <p className="muted small">Choose the {side === "boarding" ? "From" : "To"} city first.</p> : (
          <>
            {list.map((s, i) => (
              <div className="stop-row" key={i}>
                <select aria-label="Point" value={s.point} onChange={(e) => setSide(side, list.map((x, j) => (j === i ? { ...x, point: e.target.value } : x)))}>
                  <option value="">Choose a point</option>
                  {points.map((p) => <option key={p}>{p}</option>)}
                </select>
                <label className="mini-field"><span className="muted small">{side === "boarding" ? "Leaves after" : "Arrives after"}</span>
                  <div className="unit"><input type="number" min={0} max={4320} value={s.offsetMin} onChange={(e) => setSide(side, list.map((x, j) => (j === i ? { ...x, offsetMin: Math.max(0, Number(e.target.value) || 0) } : x)))} /><span>min</span></div>
                </label>
                <button type="button" className="icon-btn" aria-label="Remove point" onClick={() => setSide(side, list.filter((_, j) => j !== i))}><Icon name="trash" /></button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost" disabled={list.length >= 15 || list.length >= points.length} onClick={() => addStop(side)}><Icon name="plus" /> Add point</button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/routes" className="back"><Icon name="back" size={16} /> Routes</Link>
          <h1>{existing ? "Edit route" : "Add route"}</h1>
        </div>
        <div className="head-actions">
          <Link to="/routes" className="btn btn-ghost">Cancel</Link>
          <button className="btn btn-primary" onClick={save}><Icon name="check" /> Save route</button>
        </div>
      </div>

      <section className="card form">
        <h2>Route</h2>
        <div className="form-grid">
          <label>From
            <select value={from} onChange={(e) => changeCity("boarding", e.target.value)}><option value="">Choose a city</option>{cityNames.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label>To
            <select value={to} onChange={(e) => changeCity("dropping", e.target.value)}><option value="">Choose a city</option>{cityNames.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label>Distance (km)
            <input type="number" min={1} max={5000} value={km} onChange={(e) => setKm(e.target.value)} placeholder="e.g. 280" />
          </label>
          <div>
            <span className="lbl">Journey time</span>
            <div className="dur-row">
              <div className="unit"><input type="number" min={0} max={72} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="5" aria-label="Hours" /><span>h</span></div>
              <div className="unit"><input type="number" min={0} max={59} value={mins} onChange={(e) => setMins(e.target.value)} aria-label="Minutes" /><span>min</span></div>
              {duration >= 30 && <span className="muted small">{fmtDur(duration)}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="card form">
        <h2>Stops</h2>
        <p className="muted small">Times are minutes after the bus leaves the first stop. Customers choose from these when they book.</p>
        <div className="two-col even">
          <StopEditor side="boarding" />
          <StopEditor side="dropping" />
        </div>
        {tried && errors.length > 0 && (
          <ul className="problems">{errors.map((e) => <li key={e}><Icon name="alert" size={16} /> {e}</li>)}</ul>
        )}
      </section>
    </>
  );
}
