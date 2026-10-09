import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { SeatGrid, SeatLegend } from "../components/SeatGrid";
import {
  AMENITIES, MAX_ROWS, MAX_SEATS, busType, generateLayout, getBus, layoutProblems, nextSeatNo, rowsUsed, saveBus,
  type AmenityId, type Deck, type Preset, type Seat, type SeatKind,
} from "../data/buses";

// Demo: saving only updates the in-memory list; nothing is sent anywhere.
export function BusForm() {
  const { id } = useParams();
  const existing = id ? getBus(id) : undefined;
  const go = useNavigate();

  const [name, setName] = useState(existing?.name ?? "");
  const [registration, setRegistration] = useState(existing?.registration ?? "");
  const [ac, setAc] = useState(existing?.ac ?? true);
  const [amenities, setAmenities] = useState<AmenityId[]>(existing?.amenities ?? []);
  const [seats, setSeats] = useState<Seat[]>(existing?.seats ?? generateLayout("seater_2x2", 10));
  const [rows, setRows] = useState(Math.max(rowsUsed(existing?.seats ?? generateLayout("seater_2x2", 10)), 1));
  const [deck, setDeck] = useState<Deck>("lower");
  const [tool, setTool] = useState<SeatKind>("seater");
  const [selected, setSelected] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const sel = seats.find((s) => s.deck === deck && s.no === selected);
  const problems = layoutProblems(seats);
  const nameOk = name.trim().length > 0;
  const regOk = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(registration.replace(/[\s-]/g, "").toUpperCase());
  const canSave = nameOk && regOk && problems.length === 0;

  function applyPreset(p: Preset, r: number) {
    setSeats(generateLayout(p, r));
    setRows(r);
    setSelected(null);
    setDeck("lower");
    setTool(p === "seater_2x2" ? "seater" : "sleeper");
  }

  function onCell(row: number, col: number, seat: Seat | undefined) {
    if (seat) { setSelected(seat.no); return; }
    const no = nextSeatNo(seats, deck, row, col, tool);
    setSeats([...seats, { no, deck, row, col, kind: tool, ladies: false }]);
    setSelected(no);
  }

  function patchSelected(patch: Partial<Seat>) {
    if (!sel) return;
    setSeats(seats.map((s) => (s === sel ? { ...s, ...patch } : s)));
    if (patch.no !== undefined) setSelected(patch.no);
  }

  function removeSelected() {
    if (!sel) return;
    setSeats(seats.filter((s) => s !== sel));
    setSelected(null);
  }

  function save() {
    setTouched(true);
    if (!canSave) return;
    saveBus({ id: existing?.id, name: name.trim(), registration: registration.replace(/[\s-]/g, "").toUpperCase(), ac, amenities, seats, active: existing?.active ?? true });
    go("/buses");
  }

  const lowerCount = seats.filter((s) => s.deck === "lower").length;
  const upperCount = seats.length - lowerCount;
  const canShrink = rows > 1 && !seats.some((s) => s.row === rows - 1);

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/buses" className="back"><Icon name="back" size={16} /> Buses</Link>
          <h1>{existing ? "Edit bus" : "Add bus"}</h1>
        </div>
        <div className="head-actions">
          <Link to="/buses" className="btn btn-ghost">Cancel</Link>
          <button className="btn btn-primary" onClick={save}><Icon name="check" /> Save bus</button>
        </div>
      </div>

      <section className="card form">
        <h2>Bus details</h2>
        <div className="form-grid">
          <label>Bus name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Volvo 9400 AC Sleeper" />
            {touched && !nameOk && <span className="err">Enter a name for this bus.</span>}
          </label>
          <label>Registration number
            <input value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} placeholder="e.g. RJ14 PA 2210" />
            {touched && !regOk && <span className="err">Use the format RJ14PA2210.</span>}
          </label>
        </div>
        <div className="row-line">
          <span className="lbl">Air conditioning</span>
          <div className="tabs">
            <button className={ac ? "on" : ""} onClick={() => setAc(true)}>AC</button>
            <button className={!ac ? "on" : ""} onClick={() => setAc(false)}>Non-AC</button>
          </div>
        </div>
        <div>
          <span className="lbl">Amenities</span>
          <div className="chips pick">
            {AMENITIES.map((a) => {
              const on = amenities.includes(a.id);
              return (
                <button key={a.id} className={"chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => setAmenities(on ? amenities.filter((x) => x !== a.id) : [...amenities, a.id])}>
                  {on && <Icon name="check" size={14} />} {a.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="builder-head">
          <div><h2>Seat layout</h2><p className="muted small">Start from a template, then click empty cells to add seats and click a seat to edit it.</p></div>
          <div className="summary"><b>{seats.length}</b> / {MAX_SEATS} seats · {busType(seats)}{upperCount > 0 && <> · {lowerCount} lower, {upperCount} upper</>}</div>
        </div>

        <div className="presets">
          <button className="btn btn-ghost" onClick={() => applyPreset("seater_2x2", 10)}>Seater 2+2 template</button>
          <button className="btn btn-ghost" onClick={() => applyPreset("sleeper_2x1", 6)}>Sleeper 2+1 template</button>
          <button className="btn btn-ghost" onClick={() => { setSeats([]); setSelected(null); }}>Clear all</button>
        </div>

        <div className="builder">
          <div className="builder-main">
            <div className="builder-bar">
              <div className="tabs">
                {(["lower", "upper"] as const).map((d) => (
                  <button key={d} className={deck === d ? "on" : ""} onClick={() => { setDeck(d); setSelected(null); }}>{d === "lower" ? "Lower deck" : "Upper deck"}</button>
                ))}
              </div>
              <div className="tool">
                <span className="small muted">New seats are</span>
                <div className="tabs">
                  <button className={tool === "seater" ? "on" : ""} onClick={() => setTool("seater")}>Seater</button>
                  <button className={tool === "sleeper" ? "on" : ""} onClick={() => setTool("sleeper")}>Sleeper</button>
                </div>
              </div>
            </div>
            <div className="canvas">
              <SeatGrid seats={seats} deck={deck} rows={rows} onCell={onCell} selectedNo={selected ?? undefined} />
            </div>
            <div className="rows-ctl">
              <button className="btn btn-ghost" disabled={rows >= MAX_ROWS} onClick={() => setRows(rows + 1)}><Icon name="plus" /> Add row</button>
              <button className="btn btn-ghost" disabled={!canShrink} onClick={() => setRows(rows - 1)}>Remove last row</button>
              <span className="small muted">{rows} rows</span>
            </div>
            <SeatLegend />
          </div>

          <aside className="seat-panel">
            <h2>{sel ? `Seat ${sel.no}` : "Seat details"}</h2>
            {sel ? (
              <>
                <label>Seat number
                  <input value={sel.no} maxLength={6} onChange={(e) => patchSelected({ no: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() })} />
                </label>
                <div>
                  <span className="lbl">Type</span>
                  <div className="tabs">
                    <button className={sel.kind === "seater" ? "on" : ""} onClick={() => patchSelected({ kind: "seater" })}>Seater</button>
                    <button className={sel.kind === "sleeper" ? "on" : ""} onClick={() => patchSelected({ kind: "sleeper" })}>Sleeper</button>
                  </div>
                </div>
                <label className="check">
                  <input type="checkbox" checked={sel.ladies} onChange={(e) => patchSelected({ ladies: e.target.checked })} />
                  Reserved for ladies
                </label>
                <button className="btn btn-ghost danger" onClick={removeSelected}><Icon name="trash" /> Remove seat</button>
              </>
            ) : (
              <p className="muted small">Select a seat in the layout to change its number, type or ladies reservation.</p>
            )}
          </aside>
        </div>

        {(touched || problems.length > 0) && problems.length > 0 && (
          <ul className="problems">{problems.map((p) => <li key={p}><Icon name="alert" size={16} /> {p}</li>)}</ul>
        )}
      </section>
    </>
  );
}
