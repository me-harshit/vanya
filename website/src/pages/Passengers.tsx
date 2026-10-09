import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookingSummary, HoldBar } from "../components/BookingSummary";
import { Icon } from "../components/Icon";
import { SampleTag } from "../components/Bits";
import { getSession } from "../data/auth";
import { checkCoupon, coupons, saveDraft, startDraft, totalsFor, useHold, type Draft, type Gender } from "../data/booking";
import { findTrip } from "../data/trips";

export function NoSession({ title = "Your booking session has ended", text = "Please choose your seats again." }: { title?: string; text?: string }) {
  return (
    <section className="section"><div className="container">
      <div className="card search-soon">
        <Icon name="clock" size={28} />
        <h2>{title}</h2>
        <p className="muted">{text}</p>
        <Link to="/" className="btn btn-primary">Search buses</Link>
      </div>
    </div></section>
  );
}

const genders: { id: Gender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

export function Passengers() {
  const { tripId } = useParams();
  const [p] = useSearchParams();
  const go = useNavigate();
  const from = p.get("from") ?? "";
  const to = p.get("to") ?? "";
  const date = p.get("date") ?? "";
  const seats = (p.get("seats") ?? "").split(",").filter(Boolean);

  const trip = useMemo(() => findTrip(from, to, date, tripId), [from, to, date, tripId]);
  const [draft, setDraft] = useState<Draft | null>(() => {
    if (!trip || !seats.length) return null;
    const d = startDraft({ from, to, date, tripId: trip.id, seats, bp: p.get("bp") ?? "", dp: p.get("dp") ?? "" });
    // Logged-in customers get their number filled in.
    const s = getSession();
    if (s && !d.phone) { const withPhone = { ...d, phone: s.phone }; saveDraft(withPhone); return withPhone; }
    return d;
  });
  const { expired } = useHold(draft?.holdUntil ?? 0);
  const [tried, setTried] = useState(false);
  const [code, setCode] = useState(draft?.coupon ?? "");
  const [couponMsg, setCouponMsg] = useState("");

  if (!trip || !draft) return <NoSession title="We could not find this booking" text="The link may be old. Search again to pick your seats." />;

  const back = `/book/${trip.id}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;
  if (expired) {
    return (
      <section className="section"><div className="container">
        <div className="card search-soon">
          <Icon name="clock" size={28} />
          <h2>Your seat hold has ended</h2>
          <p className="muted">Seats are held for 10 minutes. Choose them again to continue.</p>
          <Link to={back} className="btn btn-primary">Choose seats again</Link>
        </div>
      </div></section>
    );
  }

  const totals = totalsFor(trip, draft.seats.length, draft.coupon, date);
  const update = (patch: Partial<Draft>) => { const d = { ...draft, ...patch }; setDraft(d); saveDraft(d); };
  const setPax = (i: number, patch: Partial<Draft["passengers"][number]>) =>
    update({ passengers: draft.passengers.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  function applyCoupon(c: string) {
    const res = checkCoupon(c, trip!, draft!.seats.length, date);
    if (res.ok) { update({ coupon: c.trim().toUpperCase() }); setCode(c.trim().toUpperCase()); setCouponMsg(`${c.trim().toUpperCase()} applied: you save ₹${res.discount}.`); }
    else { update({ coupon: "" }); setCouponMsg(res.message); }
  }

  const paxErr = draft.passengers.map((x) => ({
    name: x.name.trim().length < 2 || !/^[A-Za-z .'-]+$/.test(x.name.trim()) ? "Enter the name as on the ID" : "",
    age: !/^\d{1,3}$/.test(x.age) || Number(x.age) < 1 || Number(x.age) > 120 ? "Enter an age from 1 to 120" : "",
    gender: x.gender ? "" : "Choose a gender",
  }));
  const phoneErr = /^[6-9]\d{9}$/.test(draft.phone) ? "" : "Enter a 10-digit mobile number";
  const emailErr = draft.email && !/^\S+@\S+\.\S+$/.test(draft.email) ? "Enter a valid email or leave it empty" : "";
  const valid = paxErr.every((e) => !e.name && !e.age && !e.gender) && !phoneErr && !emailErr;

  function next(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    saveDraft(draft!);
    const payment = `/book/${trip!.id}/payment`;
    // Paying needs a logged-in customer; the draft is kept, so they come straight back here.
    go(getSession() ? payment : `/login?next=${encodeURIComponent(payment)}`);
  }

  return (
    <section className="section results">
      <div className="container">
        <Link to={back} className="back-link"><Icon name="left" size={18} /> Change seats</Link>
        <div className="res-head">
          <div><h1>Passenger details</h1><p className="muted">{from} to {to} · {trip.operator}</p></div>
          <SampleTag />
        </div>
        <HoldBar until={draft.holdUntil} />

        <form className="book-grid" onSubmit={next} noValidate>
          <div className="book-main">
            {draft.passengers.map((x, i) => (
              <div className="card" key={x.seat}>
                <div className="card-head">
                  <h2>Passenger {i + 1}</h2>
                  <span className="chip on">Seat {x.seat}</span>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor={`n${i}`}>Full name</label>
                    <input id={`n${i}`} autoComplete="off" value={x.name} aria-invalid={tried && !!paxErr[i].name} onChange={(e) => setPax(i, { name: e.target.value })} placeholder="As on government ID" />
                    {tried && paxErr[i].name && <span className="err">{paxErr[i].name}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor={`a${i}`}>Age</label>
                    <input id={`a${i}`} inputMode="numeric" maxLength={3} value={x.age} aria-invalid={tried && !!paxErr[i].age} onChange={(e) => setPax(i, { age: e.target.value.replace(/\D/g, "") })} placeholder="e.g. 28" />
                    {tried && paxErr[i].age && <span className="err">{paxErr[i].age}</span>}
                  </div>
                </div>
                <div className="field">
                  <span className="lbl" id={`g${i}`}>Gender</span>
                  <div className="fl-seg" role="radiogroup" aria-labelledby={`g${i}`}>
                    {genders.map((g) => (
                      <button key={g.id} type="button" role="radio" aria-checked={x.gender === g.id} className={x.gender === g.id ? "on" : ""} onClick={() => setPax(i, { gender: g.id })}>{g.label}</button>
                    ))}
                  </div>
                  {tried && paxErr[i].gender && <span className="err">{paxErr[i].gender}</span>}
                </div>
              </div>
            ))}

            <div className="card">
              <h2>Contact details</h2>
              <p className="muted small">Your ticket and trip updates are sent here.</p>
              <div className="field-row" style={{ marginTop: 14 }}>
                <div className="field">
                  <label htmlFor="ph">Mobile number</label>
                  <div className="input-prefix"><span>+91</span><input id="ph" inputMode="numeric" maxLength={10} value={draft.phone} aria-invalid={tried && !!phoneErr} onChange={(e) => update({ phone: e.target.value.replace(/\D/g, "") })} placeholder="9876543210" /></div>
                  {tried && phoneErr && <span className="err">{phoneErr}</span>}
                </div>
                <div className="field">
                  <label htmlFor="em">Email <span className="muted">(optional)</span></label>
                  <input id="em" type="email" value={draft.email} aria-invalid={tried && !!emailErr} onChange={(e) => update({ email: e.target.value })} placeholder="you@example.com" />
                  {tried && emailErr && <span className="err">{emailErr}</span>}
                </div>
              </div>
            </div>

            <div className="card">
              <h2>Coupon</h2>
              <div className="coupon-row">
                <input aria-label="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" />
                <button type="button" className="btn btn-ghost" onClick={() => applyCoupon(code)} disabled={!code.trim()}>Apply</button>
                {draft.coupon && <button type="button" className="btn btn-ghost" onClick={() => { update({ coupon: "" }); setCode(""); setCouponMsg(""); }}>Remove</button>}
              </div>
              {couponMsg && <p className={draft.coupon ? "ok-msg" : "err"} role="status">{couponMsg}</p>}
              <div className="chips coupon-list">
                {coupons.map((c) => (
                  <button key={c.code} type="button" className="coupon-tip" onClick={() => { setCode(c.code); applyCoupon(c.code); }}>
                    <b>{c.code}</b><small className="muted">{c.text}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <BookingSummary trip={trip} draft={draft} totals={totals}>
            {tried && !valid && <p className="err" role="alert">Please fix the highlighted details.</p>}
            <button className="btn btn-primary bs-go">Continue to payment</button>
          </BookingSummary>
        </form>
      </div>
    </section>
  );
}
