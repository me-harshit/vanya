import { Link } from "react-router-dom";
import { DownloadBand, PageHead, SampleTag } from "../components/Bits";
import { Icon, type IconName } from "../components/Icon";
import { Reveal } from "../components/Reveal";
import { site } from "../config";

const values: { icon: IconName; title: string; text: string }[] = [
  { icon: "shield", title: "Trust first", text: "Clear prices, clear policies and verified operators." },
  { icon: "zap", title: "Simple and fast", text: "Booking should take minutes, not an evening." },
  { icon: "users", title: "Fair to operators", text: "Simple tools and transparent earnings for the people who run the buses." },
  { icon: "support", title: "Here to help", text: "When plans change, we help you sort it out." },
];

// SAMPLE DATA: replace with the real team before launch.
const team = [
  { name: "Team member", role: "Founder" },
  { name: "Team member", role: "Operations" },
  { name: "Team member", role: "Customer support" },
];

export function About() {
  return (
    <>
      <PageHead eyebrow="About us" title={`About ${site.name}`} text="We make bus travel in India simple for passengers and profitable for operators." />

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="container prose-wide">
          <Reveal>
            <h2>Our story</h2>
            <p>Booking a bus should not mean calling around, standing in queues or guessing which seat is free. {site.name} brings trusted operators and passengers together in one app, with clear seat maps, secure payments and instant tickets.</p>
            <p>We also give bus operators, big or small, an easy way to list their buses and reach more travellers, whether they add buses directly or connect their existing booking software.</p>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal><div className="section-head"><h2>What we stand for</h2></div></Reveal>
          <div className="grid-2">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={(i % 2) * 70}>
                <div className="card" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span className="ico" style={{ flex: "none" }}><Icon name={v.icon} size={24} /></span>
                  <div><h3 style={{ marginTop: 0 }}>{v.title}</h3><p>{v.text}</p></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal><div className="section-head"><h2>The team</h2></div></Reveal>
          <SampleTag />
          <div className="grid-3" style={{ marginTop: 12 }}>
            {team.map((t, i) => (
              <Reveal key={i} delay={i * 70}>
                <div className="card team">
                  <span className="avatar" aria-hidden="true"><Icon name="users" size={28} /></span>
                  <h3>{t.name}</h3>
                  <p>{t.role}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 28 }}>Want to work with us or list your buses? <Link to="/contact" className="text-link">Get in touch</Link>.</p>
        </div>
      </section>
      <DownloadBand />
    </>
  );
}
