import { useState } from "react";
import { DownloadBand, PageHead, SampleTag } from "../components/Bits";
import { Icon } from "../components/Icon";
import { Reveal } from "../components/Reveal";
import { offers } from "../data/offers";

export function Offers() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard unavailable: the code is still visible to copy by hand */
    }
  }

  return (
    <>
      <PageHead eyebrow="Offers" title="Offers and coupons" text="Apply a code at checkout in the app to save on your trip.">
        <SampleTag />
      </PageHead>
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="container grid-2">
          {offers.map((o, i) => (
            <Reveal key={o.code} delay={(i % 2) * 70}>
              <div className="card offer">
                <div>
                  <span className="pill">{o.tag}</span>
                  <h3>{o.title}</h3>
                  <p>{o.text}</p>
                  <p className="terms">{o.terms}</p>
                </div>
                <div className="offer-code">
                  <code className="code">{o.code}</code>
                  <button className="btn btn-ghost" onClick={() => copy(o.code)}>
                    <Icon name={copied === o.code ? "check" : "link"} size={16} />
                    {copied === o.code ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <DownloadBand />
    </>
  );
}
