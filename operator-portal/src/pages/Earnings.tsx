import { useMemo } from "react";
import { Icon } from "../components/Icon";
import { portal } from "../config";
import { bookingsOf, useTrips } from "../data/trips";

const rupee = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

// DEMO settlements: replace with the real payout ledger (not built in the backend yet).
const settlements = [
  { id: "ST-1042", period: "29 Sep to 5 Oct", bookings: 118, gross: 164200, ref: "UTR 4098127731", paid: "7 Oct", status: "Paid" },
  { id: "ST-1031", period: "22 Sep to 28 Sep", bookings: 102, gross: 141800, ref: "UTR 4097611208", paid: "30 Sep", status: "Paid" },
  { id: "ST-1019", period: "15 Sep to 21 Sep", bookings: 96, gross: 128650, ref: "UTR 4097002954", paid: "23 Sep", status: "Paid" },
  { id: "ST-1004", period: "8 Sep to 14 Sep", bookings: 88, gross: 119300, ref: "UTR 4096388102", paid: "16 Sep", status: "Paid" },
];

export function Earnings() {
  const trips = useTrips();
  const bookings = useMemo(() => bookingsOf(trips), [trips]);
  const rate = portal.commissionPercent / 100;

  const done = bookings.filter((b) => b.status === "completed");
  const upcoming = bookings.filter((b) => b.status === "confirmed");
  const refunded = bookings.filter((b) => b.status === "cancelled");
  const gross = done.reduce((n, b) => n + b.amount, 0);
  const commission = gross * rate;

  // Last 7 days of completed trips, for the chart.
  const days = useMemo(() => {
    const out: { label: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({ label: d.toLocaleDateString("en-IN", { weekday: "short" }), amount: done.filter((b) => b.date === key).reduce((n, b) => n + b.amount, 0) });
    }
    return out;
  }, [done]);
  const max = Math.max(1, ...days.map((d) => d.amount));

  function exportCsv() {
    const rows = [["Settlement", "Period", "Bookings", "Gross", "Commission", "Net paid", "Reference", "Paid on"], ...settlements.map((s) => [s.id, s.period, s.bookings, s.gross, s.gross * rate, s.gross * (1 - rate), s.ref, s.paid])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "settlements.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Earnings</h1><p className="muted">What you have earned and when it is paid to your bank.</p></div>
        <button className="btn btn-ghost" onClick={exportCsv}><Icon name="download" /> Export settlements (CSV)</button>
      </div>

      <section className="stat-grid">
        <div className="card stat"><div className="stat-top"><span className="muted">Earned so far (completed trips)</span><Icon name="wallet" /></div><b>{rupee(gross)}</b><span className="delta">gross fare</span></div>
        <div className="card stat"><div className="stat-top"><span className="muted">Vanya commission ({portal.commissionPercent}%)</span><Icon name="ticket" /></div><b>{rupee(commission)}</b><span className="delta down">deducted</span></div>
        <div className="card stat"><div className="stat-top"><span className="muted">Your share</span><Icon name="check" /></div><b>{rupee(gross - commission)}</b><span className="delta up">to be paid</span></div>
        <div className="card stat"><div className="stat-top"><span className="muted">Upcoming bookings</span><Icon name="clock" /></div><b>{rupee(upcoming.reduce((n, b) => n + b.amount, 0))}</b><span className="delta">{upcoming.length} bookings, paid after the trip</span></div>
      </section>

      <section className="two-col">
        <div className="card">
          <h2>Last 7 days <small className="muted">(completed trips)</small></h2>
          <div className="bars">
            {days.map((d, i) => (
              <div key={i} className="bar-col">
                <span className="bar-val">{d.amount ? Math.round(d.amount / 1000) + "k" : "0"}</span>
                <div className="bar" style={{ height: `${Math.max(2, (d.amount / max) * 100)}%` }} />
                <span className="muted small">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>How you are paid</h2>
          <ul className="how">
            <li><Icon name="check" size={18} /> Payouts go to your bank account once a week, for trips completed in the week before.</li>
            <li><Icon name="check" size={18} /> The commission is taken from the fare. Taxes are shown on each statement.</li>
            <li><Icon name="alert" size={18} /> Trips you cancel are refunded to passengers in full and are not paid out ({refunded.length} cancelled bookings, {rupee(refunded.reduce((n, b) => n + b.amount, 0))}).</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <h2>Settlements</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Statement</th><th>Period</th><th>Bookings</th><th>Gross</th><th>Commission</th><th>Paid to you</th><th>Reference</th><th>Status</th></tr></thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.id}</td><td>{s.period}</td><td>{s.bookings}</td><td>{rupee(s.gross)}</td><td>−{rupee(s.gross * rate)}</td><td><b>{rupee(s.gross * (1 - rate))}</b></td>
                  <td className="muted small">{s.ref}<br />Paid {s.paid}</td><td><span className="pill ok">{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
