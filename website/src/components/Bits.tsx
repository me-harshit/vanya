import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { site } from "../config";
import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { StoreBadges } from "./StoreBadges";
import type { FaqGroup } from "../data/content";

export function SampleTag() {
  if (!site.showSampleBadge) return null;
  return <span className="sample-tag">Sample data</span>;
}

export function PageHead({ eyebrow, title, text, children }: { eyebrow?: string; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="container page-head">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export function SectionHead({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <Reveal>
      <div className="section-head row-head">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {text && <p>{text}</p>}
        </div>
        {action}
      </div>
    </Reveal>
  );
}

export function DownloadBand() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <Reveal>
          <div className="band">
            <div>
              <h2>Take {site.name} with you</h2>
              <p>Search, book and manage your trips from the app.</p>
            </div>
            <div className="band-actions"><StoreBadges /></div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function FaqList({ groups }: { groups: FaqGroup[] }) {
  return (
    <div className="faq">
      {groups.map((g) => (
        <div key={g.group} className="faq-group">
          <h3>{g.group}</h3>
          {g.items.map((f) => (
            <details key={f.q}>
              <summary>{f.q}<Icon name="down" size={20} /></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      ))}
    </div>
  );
}

export function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="more-link">{children} <Icon name="arrow" size={16} /></Link>
  );
}
