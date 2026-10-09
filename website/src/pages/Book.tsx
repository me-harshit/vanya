import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { SeatLegend, SeatMap } from "../components/SeatMap";
import { SampleTag } from "../components/Bits";
import { bookedFor, layoutFor, MAX_SEATS_PER_BOOKING, type Deck, type Seat } from "../data/seats";
import { dayOffset, findTrip, fmtDuration, fmtTime, pointsFor } from "../data/trips";

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function Book() {
  const { tripId } = useParams();
  const [p] = useSearchParams();
  const go = useNavigate();
  const from = p.get("from") ?? "";
  const to = p.get("to") ?? "";
  const date = p.get("date") ?? "";
  const back = `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;

  const trip = useMemo(() => findTrip(from, to, date, tripId), [from, to, date, tripId]);
  const seats = useMemo(() => (trip ? layoutFor(trip) : []), [trip]);
  const booked = useMemo(() => (trip ? bookedFor(trip, seats, date) : new Map()), [trip, seats, date]);
  const points = useMemo(() => (trip ? pointsFor(trip) : null), [trip]);

  const [selected, setSelected] = useState<string[]>([]);
  const [deck, setDeck] = useState<Deck>("lower");
  const [bp, setBp] = useState("");
  const [dp, setDp] = useState("");
  const [notice, setNotice] = useState("");

  if (!trip || !points) {
    return (
      <section className="section"><div className="container">
        <div className="card search-soon">
          <Icon name="bus" size={28} />
          <h2>We could not find this bus</h2>
          <p className="muted">The link may be old. Search again to see the latest buses.</p>
          <Link to={from && to ? back : "/"} className="btn btn-primary">Back to search</Link>
        </div>
      </div></section>
    );
  }

  const hasUpper = seats.some((s) => s.deck === "upper");
  const total = selected.length * trip.fare;
  const ready = selected.length > 0 && bp !== "" && dp !== "";

  function toggle(seat: Seat) {
    if (selected.includes(seat.no)) {
      setSelected(selected.filter((n) => n !== seat.no));
      setNotice("");
    } else if (selected.length >= MAX_SEATS_PER_BOOKING) {
      setNotice(`You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time.`);
    } else {
      setSelected([...selected, seat.no]);
      setNotice("");
    }
  }

  function next() {
    if (!ready) return;
    go(`/book/${trip!.id}/passengers?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&seats=${selected.join(",")}&bp=${bp}&dp=${dp}`);
  }

  const arrDay = dayOffset(trip);
  const hint = selected.length === 0 ? "Choose your seats" : !bp ? "Choose a boarding point" : !dp ? "Choose a dropping point" : "";

  return (
    <section className="section results">
      <div className="container">
        <Link to={back} className="back-link"><Icon name="left" size={18} /> Back to results</Link>
        <div className="res-head">
          <div>
            <h1>{from} <Icon name="arrow" size={22} /> {to}</h1>
            <p className="muted">{dayLabel(date)} · {trip.operator}</p>
          </div>
          <SampleTag />
        </div>

        <div className="book-grid">
          <div className="book-main">
            <div className="card">
              <div className="card-head">
                <h2>Choose your seats</h2>
                {hasUpper && (
                  <div className="fl-seg" role="tablist" aria-label="Deck">
                    {(["lower", "upper"] as const).map((d) => (
                      <button key={d} type="button" role="tab" aria-selected={deck === d} className={deck === d ? "on" : ""} onClick={() => setDeck(d)}>{d === "lower" ? "Lower deck" : "Upper deck"}</button>
                    ))}
                  </div>
                )}
              </div>
              <SeatLegend />
              <div className="seat-canvas">
                <SeatMap seats={seats} deck={hasUpper ? deck : "lower"} booked={booked} selected={selected} fare={trip.fare} onToggle={toggle} />
              </div>
              {notice && <p className="err" role="alert">{notice}</p>}
              {hasUpper && selected.some((n) => n.startsWith(deck === "lower" ? "U" : "L")) && (
                <p className="muted small">You also have seats selected on the {deck === "lower" ? "upper" : "lower"} deck.</p>
              )}
            </div>

            <div className="card">
              <h2>Boarding and dropping points</h2>
              <div className="points">
                <fieldset>
                  <legend>Boarding point</legend>
                  {points.boarding.map((x) => (
                    <label key={x.id} className={"point" + (bp === x.id ? " on" : "")}>
                      <input type="radio" name="bp" checked={bp === x.id} onChange={() => setBp(x.id)} />
                      <span className="pt-time">{fmtTime(x.time)}</span>
                      <span><b>{x.name}</b><small className="muted">{x.note}</small></span>
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Dropping point</legend>
                  {points.dropping.map((x) => (
                    <label key={x.id} className={"point" + (dp === x.id ? " on" : "")}>
                      <input type="radio" name="dp" checked={dp === x.id} onChange={() => setDp(x.id)} />
                      <span className="pt-time">{fmtTime(x.time)}{arrDay > 0 && <sup> +{arrDay}d</sup>}</span>
                      <span><b>{x.name}</b><small className="muted">{x.note}</small></span>
                    </label>
                  ))}
                </fieldset>
              </div>
            </div>
          </div>

          <aside className="card book-summary">
            <h2>Your trip</h2>
            <p className="bs-bus"><b>{trip.operator}</b><span className="muted">{trip.busName} · {trip.layout}</span></p>
            <div className="bs-times">
              <div><b>{fmtTime(trip.depMin)}</b><span className="muted">{dayLabel(date)}</span></div>
              <span className="muted">{fmtDuration(trip.durMin)}</span>
              <div><b>{fmtTime(trip.depMin + trip.durMin)}</b><span className="muted">{arrDay > 0 ? "Next day" : "Same day"}</span></div>
            </div>

            <div className="bs-seats">
              <h3>Seats</h3>
              {selected.length === 0 ? (
                <p className="muted small">Pick up to {MAX_SEATS_PER_BOOKING} seats on the map.</p>
              ) : (
                <div className="chips">
                  {selected.map((n) => (
                    <button key={n} type="button" className="chip on" onClick={() => setSelected(selected.filter((x) => x !== n))} aria-label={`Remove seat ${n}`}>{n} <Icon name="close" size={12} /></button>
                  ))}
                </div>
              )}
            </div>

            <dl className="bs-fare">
              <div><dt>Fare ({selected.length} × ₹{trip.fare.toLocaleString("en-IN")})</dt><dd>₹{total.toLocaleString("en-IN")}</dd></div>
              <div><dt>Convenience fee</dt><dd>₹0</dd></div>
              <div className="total"><dt>Total</dt><dd>₹{total.toLocaleString("en-IN")}</dd></div>
            </dl>
            <button className="btn btn-primary bs-go" disabled={!ready} onClick={next}>{ready ? "Continue to passenger details" : hint}</button>
          </aside>
        </div>
      </div>

      <div className="mobile-bar">
        <div><b>₹{total.toLocaleString("en-IN")}</b><small className="muted">{selected.length} seat{selected.length === 1 ? "" : "s"}</small></div>
        <button className="btn btn-primary" disabled={!ready} onClick={next}>{ready ? "Continue" : hint}</button>
      </div>
    </section>
  );
}
