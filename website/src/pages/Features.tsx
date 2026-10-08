import { DownloadBand, PageHead } from "../components/Bits";
import { Icon } from "../components/Icon";
import { Reveal } from "../components/Reveal";
import { features } from "../data/content";

export function Features() {
  return (
    <>
      <PageHead eyebrow="Features" title="Built for easy bus travel" text="Everything in the Vanya Holidays app is designed to make finding, booking and boarding a bus quick and clear." />
      <section className="section" style={{ paddingTop: 16 }}>
        <div className="container grid-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 70}>
              <div className="card">
                <span className="ico"><Icon name={f.icon} size={24} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <DownloadBand />
    </>
  );
}
