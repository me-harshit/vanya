import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { SampleTag } from "../components/Bits";
import { rupee } from "../components/TicketCard";
import { site } from "../config";
import { useSession } from "../data/auth";
import { departureOf, kindOf, resetDemoBookings, useBookings, type BookingRecord } from "../data/myBookings";
import { fmtTime } from "../data/trips";

type Tab = "upcoming" | "completed" | "cancelled";
const tabs: { id: Tab; label: string; empty: string }[] = [
  { id: "upcoming", label: "Upcoming", empty: "You have no upcoming trips." },
  { id: "completed", label: "Completed", empty: "Trips you have taken will show up here." },
  { id: "cancelled", label: "Cancelled", empty: "You have not cancelled any bookings." },
];

function when(r: BookingRecord) {
  return departureOf(r).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function Card({ r, kind }: { r: BookingRecord; kind: Tab }) {
  return (
    <article className="card mb-card">
      <div className="mb-top">
        <div>
          <h3>{r.from} <Icon name="arrow" size={16} /> {r.to}</h3>
          <p className="muted">{r.operator} · {r.busName}</p>
        </div>
        <span className={"status " + kind}>{kind === "upcoming" ? "Confirmed" : kind === "completed" ? "Completed" : "Cancelled"}</span>
      </div>
      <div className="mb-meta">
        <span><Icon name="calendar" size={16} /> {when(r)}, {fmtTime(r.depMin)}</span>
        <span><Icon name="seat" size={16} /> {r.passengers.map((p) => p.seat).join(", ")}</span>
        <span><Icon name="users" size={16} /> {r.passengers.length} passenger{r.passengers.length > 1 ? "s" : ""}</span>
        <span className="mono">{r.id}</span>
      </div>
      <div className="mb-foot">
        <div>
          {kind === "cancelled" && r.cancellation
            ? <><small className="muted">Refund</small><b className="refund">{rupee(r.cancellation.refund)}</b></>
            : <><small className="muted">Amount paid</small><b>{rupee(r.pricing.total)}</b></>}
        </div>
        <div className="mb-actions">
          <Link to={`/my-bookings/${r.id}`} className="btn btn-ghost">{kind === "upcoming" ? "View ticket" : "View details"}</Link>
          {kind === "upcoming" && <Link to={`/my-bookings/${r.id}/cancel`} className="btn btn-ghost danger">Cancel</Link>}
        </div>
      </div>
    </article>
  );
}

export function MyBookings() {
  const session = useSession();
  const all = useBookings();
  const [tab, setTab] = useState<Tab>("upcoming");

  if (!session) return <Navigate to="/login?next=/my-bookings" replace />;

  const now = Date.now();
  const groups: Record<Tab, BookingRecord[]> = { upcoming: [], completed: [], cancelled: [] };
  for (const r of all) groups[kindOf(r, now)].push(r);
  groups.upcoming.sort((a, b) => departureOf(a).getTime() - departureOf(b).getTime());
  groups.completed.sort((a, b) => departureOf(b).getTime() - departureOf(a).getTime());
  const list = groups[tab];

  return (
    <section className="section results">
      <div className="container mb-wrap">
        <div className="res-head">
          <div><h1>My bookings</h1><p className="muted">Logged in as +91 {session.phone}</p></div>
          <SampleTag />
        </div>

        <div className="mb-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.label} <span className="count">{groups[t.id].length}</span>
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="card search-soon">
            <Icon name="ticket" size={28} />
            <h2>{tabs.find((t) => t.id === tab)!.empty}</h2>
            <Link to="/" className="btn btn-primary">Search buses</Link>
          </div>
        ) : (
          <div className="mb-list">{list.map((r) => <Card key={r.id} r={r} kind={tab} />)}</div>
        )}

        {site.showSampleBadge && (
          <p className="muted small mb-reset">Demo bookings are made up. <button type="button" className="text-link plain" onClick={() => resetDemoBookings()}>Reset demo bookings</button></p>
        )}
      </div>
    </section>
  );
}
