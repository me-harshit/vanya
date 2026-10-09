import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BusCard } from "../components/BusCard";
import { FilterPanel } from "../components/FilterPanel";
import { Icon } from "../components/Icon";
import { SearchBar } from "../components/SearchBar";
import { SampleTag } from "../components/Bits";
import { applyFilters, emptyFilters, generateTrips, sortOptions, sortTrips, type Filters, type SortKey } from "../data/trips";

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shift(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return iso(new Date(y, m - 1, d + days));
}
function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function Search() {
  const [p, setP] = useSearchParams();
  const from = p.get("from") ?? "";
  const to = p.get("to") ?? "";
  const today = iso(new Date());
  const rawDate = p.get("date") ?? today;
  const date = rawDate >= today ? rawDate : today;
  const valid = from !== "" && to !== "" && from !== to;

  const all = useMemo(() => (valid ? generateTrips(from, to, date) : []), [valid, from, to, date]);
  // Trips that already left today are not shown.
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const available = useMemo(() => (date === today ? all.filter((t) => t.depMin > nowMin + 30) : all), [all, date, today, nowMin]);

  const fareBounds = useMemo(() => {
    const f = available.map((t) => t.fare);
    return { min: f.length ? Math.min(...f) : 0, max: f.length ? Math.max(...f) : 0 };
  }, [available]);
  const operators = useMemo(() => [...new Set(available.map((t) => t.operator))].sort(), [available]);

  const [filters, setFilters] = useState<Filters>(() => emptyFilters(fareBounds.max));
  const [sort, setSort] = useState<SortKey>("earliest");
  const [panel, setPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  // New search: reset the filters and show a short loading state, as the real API would.
  useEffect(() => {
    setFilters(emptyFilters(fareBounds.max));
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [from, to, date, fareBounds.max]);

  const shown = useMemo(() => sortTrips(applyFilters(available, filters), sort), [available, filters, sort]);
  const query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;
  const activeCount = filters.kinds.length + filters.bands.length + filters.operators.length + filters.amenities.length + (filters.ac !== "any" ? 1 : 0) + (filters.maxFare < fareBounds.max ? 1 : 0);
  const clear = () => setFilters(emptyFilters(fareBounds.max));

  const strip = [-2, -1, 0, 1, 2].map((n) => shift(date, n));
  const goDate = (d: string) => setP({ from, to, date: d });

  return (
    <section className="section results">
      <div className="container">
        <SearchBar initial={{ from, to, date }} key={`${from}|${to}|${date}`} />

        {!valid ? (
          <div className="card search-soon">
            <Icon name="bus" size={28} />
            <h2>Where would you like to go?</h2>
            <p className="muted">Choose where you are travelling from and to, and we will show the buses.</p>
          </div>
        ) : (
          <>
            <div className="res-head">
              <div>
                <h1>{from} <Icon name="arrow" size={22} /> {to}</h1>
                <p className="muted">{loading ? "Searching buses…" : `${shown.length} of ${available.length} buses`} · {dayLabel(date)}</p>
              </div>
              <SampleTag />
            </div>

            <div className="datestrip" role="group" aria-label="Choose another date">
              <button type="button" className="icon-btn" onClick={() => goDate(shift(date, -1))} disabled={date <= today} aria-label="Previous day"><Icon name="left" /></button>
              {strip.map((d) => (
                <button key={d} type="button" className={d === date ? "on" : ""} disabled={d < today} onClick={() => goDate(d)}>{dayLabel(d)}</button>
              ))}
              <button type="button" className="icon-btn" onClick={() => goDate(shift(date, 1))} aria-label="Next day"><Icon name="right" /></button>
            </div>

            <div className="res-grid">
              <aside className={"res-filters" + (panel ? " open" : "")}>
                <div className="sheet-bar"><b>Filters</b><button type="button" className="icon-btn" onClick={() => setPanel(false)} aria-label="Close filters"><Icon name="close" /></button></div>
                <FilterPanel filters={filters} onChange={setFilters} operators={operators} fareBounds={fareBounds} onClear={clear} />
                <button type="button" className="btn btn-primary sheet-done" onClick={() => setPanel(false)}>Show {shown.length} buses</button>
              </aside>
              {panel && <div className="scrim" onClick={() => setPanel(false)} />}

              <div className="res-list">
                <div className="res-tools">
                  <button type="button" className="btn btn-ghost filter-btn" onClick={() => setPanel(true)}><Icon name="filter" size={18} /> Filters{activeCount > 0 && <span className="count">{activeCount}</span>}</button>
                  <div className="sortbar" role="group" aria-label="Sort buses">
                    <span className="muted">Sort by</span>
                    {sortOptions.map((o) => (
                      <button key={o.id} type="button" className={sort === o.id ? "on" : ""} onClick={() => setSort(o.id)}>{o.label}</button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  [0, 1, 2].map((i) => <div key={i} className="card skeleton" aria-hidden />)
                ) : available.length === 0 ? (
                  <div className="card search-soon">
                    <Icon name="clock" size={28} />
                    <h2>No more buses today</h2>
                    <p className="muted">All of today's departures have left. Try tomorrow.</p>
                    <button className="btn btn-primary" onClick={() => goDate(shift(today, 1))}>See tomorrow's buses</button>
                  </div>
                ) : shown.length === 0 ? (
                  <div className="card search-soon">
                    <Icon name="search" size={28} />
                    <h2>No buses match your filters</h2>
                    <p className="muted">Try removing a filter or raising the price limit.</p>
                    <button className="btn btn-primary" onClick={clear}>Clear all filters</button>
                  </div>
                ) : (
                  shown.map((t) => <BusCard key={t.id} trip={t} query={query} />)
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
