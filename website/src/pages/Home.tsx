import { Link } from "react-router-dom";
import { DownloadBand, MoreLink, SampleTag, SectionHead } from "../components/Bits";
import { HeroArt } from "../components/HeroArt";
import { Icon } from "../components/Icon";
import { PhoneMock } from "../components/PhoneMock";
import { Reveal } from "../components/Reveal";
import { RouteCard } from "../components/RouteCard";
import { SearchBar } from "../components/SearchBar";
import { StoreBadges } from "../components/StoreBadges";
import { features, steps } from "../data/content";
import { offers } from "../data/offers";
import { routes } from "../data/routes";

export function Home() {
  return (
    <>
      <section className="hero hero-compact">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Bus tickets, made simple</span>
            <h1>Book your bus in a <em>few taps</em>.</h1>
            <p className="lead">Search routes, pick your exact seat, pay securely and travel with trusted operators across India.</p>
          </div>
          <div className="hero-art"><HeroArt /></div>
        </div>
        <div className="container hero-search">
          <SearchBar />
        </div>
      </section>

      <section className="section app-section">
        <div className="container app-grid">
          <div className="hero-art">
            <div className="blob" />
            <PhoneMock />
            <span className="float-chip c1"><Icon name="seat" size={16} /> Seat A3 selected</span>
            <span className="float-chip c2"><Icon name="check" size={16} /> Free cancellation</span>
            <span className="float-chip c3"><Icon name="ticket" size={16} /> E-ticket in seconds</span>
          </div>
          <div>
            <span className="eyebrow">Web and app</span>
            <h2 className="app-title">Book on the web, or take it with you in the app.</h2>
            <p className="lead">Sign in with just your mobile number. Your bookings and tickets are the same everywhere, so you can start on the website and board with the app.</p>
            <div id="download"><StoreBadges /></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Why Vanya Holidays" title="Everything you need for a smooth journey" action={<MoreLink to="/features">All features</MoreLink>} />
          <div className="grid-3">
            {features.slice(0, 3).map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <div className="card">
                  <span className="ico"><Icon name={f.icon} size={24} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <SectionHead eyebrow="How it works" title="From search to seat in four steps" action={<MoreLink to="/how-it-works">See the details</MoreLink>} />
          <div className="steps">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="step"><span className="num">0{i + 1}</span><h3>{s.title}</h3><p>{s.text}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <SectionHead eyebrow="Popular routes" title="Where are you headed?" action={<MoreLink to="/routes">All routes</MoreLink>} />
          <SampleTag />
          <div className="grid-3" style={{ marginTop: 12 }}>
            {routes.slice(0, 6).map((r, i) => (
              <Reveal key={r.slug} delay={i * 60}><RouteCard r={r} /></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <SectionHead eyebrow="Offers" title="Save on your next trip" action={<MoreLink to="/offers">All offers</MoreLink>} />
          <SampleTag />
          <div className="grid-3" style={{ marginTop: 12 }}>
            {offers.slice(0, 3).map((o, i) => (
              <Reveal key={o.code} delay={i * 70}>
                <div className="card offer-mini">
                  <span className="pill">{o.tag}</span>
                  <h3>{o.title}</h3>
                  <p>{o.text}</p>
                  <code className="code">{o.code}</code>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal>
            <div className="band">
              <div>
                <h2>Run a bus business? List it on Vanya Holidays.</h2>
                <p>Reach more passengers. Add your buses directly, or connect your own booking software or a third-party provider.</p>
              </div>
              <div className="band-actions">
                <Link to="/operators" className="btn">Learn more <Icon name="arrow" size={18} /></Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <DownloadBand />
    </>
  );
}
