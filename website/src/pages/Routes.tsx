import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DownloadBand, PageHead, SampleTag } from "../components/Bits";
import { Icon } from "../components/Icon";
import { RouteCard } from "../components/RouteCard";
import { findRoute, routes, sampleDepartures } from "../data/routes";
import { NotFound } from "./NotFound";

export function RoutesPage() {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? routes.filter((r) => `${r.from} ${r.to}`.toLowerCase().includes(s)) : routes;
  }, [q]);

  return (
    <>
      <PageHead eyebrow="Routes" title="Popular bus routes" text="Browse some of the routes you can book in the app.">
        <SampleTag />
      </PageHead>
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="container">
          <label className="search-box">
            <Icon name="search" size={20} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city, e.g. Delhi" aria-label="Search routes" />
          </label>
          {list.length ? (
            <div className="grid-3">{list.map((r) => <RouteCard key={r.slug} r={r} />)}</div>
          ) : (
            <p className="muted">No routes match &ldquo;{q}&rdquo;. Try another city.</p>
          )}
        </div>
      </section>
      <DownloadBand />
    </>
  );
}

export function RouteDetail() {
  const { slug } = useParams();
  const r = findRoute(slug);
  if (!r) return <NotFound />;

  return (
    <>
      <PageHead eyebrow="Route" title={`${r.from} to ${r.to} bus`} text={r.blurb}>
        <SampleTag />
      </PageHead>
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="stats">
            <div className="stat"><span className="muted">Duration</span><b>{r.duration}</b></div>
            <div className="stat"><span className="muted">Distance</span><b>{r.km} km</b></div>
            <div className="stat"><span className="muted">Operators</span><b>{r.operators}</b></div>
            <div className="stat"><span className="muted">Fares from</span><b className="mono">&#8377;{r.fareFrom.toLocaleString("en-IN")}</b></div>
          </div>

          <h2 style={{ margin: "36px 0 14px", fontSize: "1.4rem" }}>Sample departures</h2>
          <div className="tablewrap">
            <table className="table">
              <thead><tr><th>Operator</th><th>Bus type</th><th>Departs</th><th>Arrives</th><th>Seats left</th><th>Fare</th></tr></thead>
              <tbody>
                {sampleDepartures.map((d) => (
                  <tr key={d.operator}>
                    <td>{d.operator}</td><td>{d.type}</td><td className="mono">{d.dep}</td><td className="mono">{d.arr}</td>
                    <td>{d.seats}</td><td className="mono">&#8377;{(Math.round((r.fareFrom * d.factor) / 10) * 10).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>Live timings, seats and fares are shown in the app.</p>
          <p style={{ marginTop: 18 }}><Link to="/routes" className="text-link">&larr; All routes</Link></p>
        </div>
      </section>
      <DownloadBand />
    </>
  );
}
