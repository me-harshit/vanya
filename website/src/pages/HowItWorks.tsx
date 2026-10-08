import { Link } from "react-router-dom";
import { DownloadBand, PageHead } from "../components/Bits";
import { Icon } from "../components/Icon";
import { Reveal } from "../components/Reveal";
import { steps } from "../data/content";

const extras = [
  { title: "Before you book", items: ["Check the bus type, timings and boarding points.", "Read the cancellation policy shown on the booking screen.", "Add every passenger's name and age exactly as on their ID."] },
  { title: "After you book", items: ["Find your e-ticket in My Bookings, and in your SMS and email.", "Show the QR code on your ticket when you board.", "Cancel or view details anytime from the app."] },
];

export function HowItWorks() {
  return (
    <>
      <PageHead eyebrow="How it works" title="Four steps from search to seat" text="Booking with Vanya Holidays takes a couple of minutes." />
      <section className="section" style={{ paddingTop: 16 }}>
        <div className="container">
          <div className="timeline">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 60}>
                <div className="tl-item">
                  <span className="tl-num mono">0{i + 1}</span>
                  <div><h3>{s.title}</h3><p>{s.text}</p></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container grid-2">
          {extras.map((e, i) => (
            <Reveal key={e.title} delay={i * 80}>
              <div className="card">
                <h3 style={{ marginTop: 0 }}>{e.title}</h3>
                <ul className="check-list">
                  {e.items.map((t) => <li key={t}><Icon name="check" size={18} />{t}</li>)}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="container" style={{ marginTop: 24 }}>
          <p className="muted">Questions? Visit the <Link to="/help" className="text-link">Help centre</Link>.</p>
        </div>
      </section>
      <DownloadBand />
    </>
  );
}
