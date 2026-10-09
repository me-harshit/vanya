import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { SeatGrid, SeatLegend } from "../components/SeatGrid";
import { AMENITIES, busType, rowsUsed, setBusActive, useBuses, type Bus, type Deck } from "../data/buses";

type Filter = "all" | "active" | "inactive";

function LayoutPreview({ bus, onClose }: { bus: Bus; onClose: () => void }) {
  const [deck, setDeck] = useState<Deck>("lower");
  const hasUpper = bus.seats.some((s) => s.deck === "upper");
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${bus.name} seat layout`}>
        <div className="modal-head">
          <div><h2>{bus.name}</h2><p className="muted small">{bus.registration} · {bus.seats.length} seats · {busType(bus.seats)}</p></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        {hasUpper && (
          <div className="tabs">
            {(["lower", "upper"] as const).map((d) => (
              <button key={d} className={deck === d ? "on" : ""} onClick={() => setDeck(d)}>{d === "lower" ? "Lower deck" : "Upper deck"}</button>
            ))}
          </div>
        )}
        <SeatGrid seats={bus.seats} deck={hasUpper ? deck : "lower"} rows={rowsUsed(bus.seats, hasUpper ? deck : "lower")} />
        <SeatLegend />
      </div>
    </div>
  );
}

export function Buses() {
  const buses = useBuses();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [preview, setPreview] = useState<Bus | null>(null);

  const shown = useMemo(
    () =>
      buses.filter(
        (b) =>
          (filter === "all" || (filter === "active") === b.active) &&
          (b.name + b.registration).toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [buses, q, filter],
  );

  return (
    <>
      <div className="page-head">
        <div><h1>Buses</h1><p className="muted">{buses.length} buses · {buses.filter((b) => b.active).length} active</p></div>
        <Link to="/buses/new" className="btn btn-primary"><Icon name="plus" /> Add bus</Link>
      </div>

      <div className="toolbar">
        <div className="search"><Icon name="search" size={18} /><input placeholder="Search by name or registration" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="tabs">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty card"><Icon name="bus" size={28} /><h2>No buses found</h2><p>Try a different search or filter.</p></div>
      ) : (
        <section className="bus-grid">
          {shown.map((b) => (
            <article key={b.id} className={"card bus" + (b.active ? "" : " off")}>
              <div className="bus-top">
                <div>
                  <h2>{b.name}</h2>
                  <span className="mono muted">{b.registration}</span>
                </div>
                <span className={"pill " + (b.active ? "ok" : "off")}>{b.active ? "Active" : "Inactive"}</span>
              </div>
              <div className="chips">
                <span className="chip">{busType(b.seats)}</span>
                <span className="chip">{b.ac ? <><Icon name="snowflake" size={14} /> AC</> : "Non-AC"}</span>
                <span className="chip"><Icon name="seat" size={14} /> {b.seats.length} seats</span>
              </div>
              <p className="muted small">{b.amenities.length ? b.amenities.map((a) => AMENITIES.find((x) => x.id === a)?.label).join(" · ") : "No amenities listed"}</p>
              <div className="bus-actions">
                <button className="btn btn-ghost" onClick={() => setPreview(b)}><Icon name="eye" /> Layout</button>
                <Link to={`/buses/${b.id}`} className="btn btn-ghost"><Icon name="edit" /> Edit</Link>
                <button className="btn btn-ghost" onClick={() => setBusActive(b.id, !b.active)}>{b.active ? "Deactivate" : "Activate"}</button>
              </div>
            </article>
          ))}
        </section>
      )}
      {preview && <LayoutPreview bus={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
