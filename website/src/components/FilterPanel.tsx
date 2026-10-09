import { amenityLabels, timeBands, type AmenityId, type Filters, type TimeBand, type Trip } from "../data/trips";

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  operators: string[];
  fareBounds: { min: number; max: number };
  onClear: () => void;
};

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function FilterPanel({ filters, onChange, operators, fareBounds, onClear }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  return (
    <div className="filters">
      <div className="fl-head">
        <h2>Filters</h2>
        <button type="button" className="text-link plain" onClick={onClear}>Clear all</button>
      </div>

      <fieldset>
        <legend>Bus type</legend>
        {(["seater", "sleeper"] as Trip["kind"][]).map((k) => (
          <label key={k} className="fl-check"><input type="checkbox" checked={filters.kinds.includes(k)} onChange={() => set({ kinds: toggle(filters.kinds, k) })} /> {k === "seater" ? "Seater" : "Sleeper"}</label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Air conditioning</legend>
        <div className="fl-seg">
          {([["any", "Any"], ["ac", "AC"], ["non-ac", "Non-AC"]] as const).map(([v, l]) => (
            <button key={v} type="button" className={filters.ac === v ? "on" : ""} onClick={() => set({ ac: v })}>{l}</button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Departure time</legend>
        {timeBands.map((b) => (
          <label key={b.id} className="fl-check">
            <input type="checkbox" checked={filters.bands.includes(b.id)} onChange={() => set({ bands: toggle<TimeBand>(filters.bands, b.id) })} />
            <span>{b.label}<small className="muted"> {b.hint}</small></span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Price up to <b>₹{filters.maxFare.toLocaleString("en-IN")}</b></legend>
        <input type="range" min={fareBounds.min} max={fareBounds.max} step={10} value={filters.maxFare} onChange={(e) => set({ maxFare: Number(e.target.value) })} aria-label="Maximum price" />
        <div className="fl-range muted"><span>₹{fareBounds.min}</span><span>₹{fareBounds.max}</span></div>
      </fieldset>

      <fieldset>
        <legend>Amenities</legend>
        {(Object.keys(amenityLabels) as AmenityId[]).map((a) => (
          <label key={a} className="fl-check"><input type="checkbox" checked={filters.amenities.includes(a)} onChange={() => set({ amenities: toggle(filters.amenities, a) })} /> {amenityLabels[a]}</label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Operators</legend>
        {operators.map((o) => (
          <label key={o} className="fl-check"><input type="checkbox" checked={filters.operators.includes(o)} onChange={() => set({ operators: toggle(filters.operators, o) })} /> {o}</label>
        ))}
      </fieldset>
    </div>
  );
}
