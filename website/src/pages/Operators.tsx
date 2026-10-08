import { Icon, type IconName } from "../components/Icon";
import { Reveal } from "../components/Reveal";
import { site } from "../config";

const modes: { icon: IconName; title: string; text: string }[] = [
  { icon: "bus", title: "List directly", text: "Add your buses, seat layouts, routes, schedules and fares in the operator portal. No other software needed." },
  { icon: "plug", title: "Use your own ERP", text: "Already run your own booking system? Connect it so seats stay in sync across every channel you sell on." },
  { icon: "link", title: "Use a third-party provider", text: "Use a ticketing software provider? We can connect to supported providers so your inventory appears on Vanya Holidays." },
];

const benefits: { icon: IconName; title: string; text: string }[] = [
  { icon: "users", title: "More passengers", text: "Get in front of travellers who book from their phones." },
  { icon: "dashboard", title: "Simple dashboard", text: "Manage buses, trips, fares and bookings from one place." },
  { icon: "wallet", title: "Clear earnings", text: "See bookings, commissions and earnings without the paperwork." },
  { icon: "bell", title: "Passenger lists", text: "Get the manifest for every trip so boarding is smooth." },
];

const steps = ["Register your business", "Complete verification", "Add buses and schedules, or connect your software", "Go live and start receiving bookings"];

export function Operators() {
  return (
    <>
      <div className="container page-head">
        <span className="eyebrow">For bus operators</span>
        <h1>List your buses on {site.name}</h1>
        <p>Sell more seats with less effort. Choose the way of listing that fits your business.</p>
        <div className="store-row">
          {site.operatorPortalUrl ? (
            <a className="btn btn-primary" href={site.operatorPortalUrl}>Register as operator <Icon name="arrow" size={18} /></a>
          ) : (
            <span className="btn btn-primary btn-disabled">Operator registration opens soon</span>
          )}
        </div>
      </div>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container">
          <Reveal><div className="section-head"><h2>Three ways to list</h2></div></Reveal>
          <div className="grid-3">
            {modes.map((m, i) => (
              <Reveal key={m.title} delay={i * 80}>
                <div className="card">
                  <span className="ico"><Icon name={m.icon} size={24} /></span>
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal><div className="section-head"><h2>What you get</h2></div></Reveal>
          <div className="grid-2">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 70}>
                <div className="card" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span className="ico" style={{ flex: "none" }}><Icon name={b.icon} size={24} /></span>
                  <div><h3 style={{ marginTop: 0 }}>{b.title}</h3><p>{b.text}</p></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal><div className="section-head"><h2>Get started in four steps</h2></div></Reveal>
          <div className="steps">
            {steps.map((s, i) => (
              <Reveal key={s} delay={i * 80}>
                <div className="step"><span className="num">0{i + 1}</span><h3>{s}</h3></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
