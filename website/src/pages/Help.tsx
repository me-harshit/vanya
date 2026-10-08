import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaqList, PageHead } from "../components/Bits";
import { Icon } from "../components/Icon";
import { faqGroups } from "../data/content";

export function Help() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return faqGroups;
    return faqGroups
      .map((g) => ({ ...g, items: g.items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(s)) }))
      .filter((g) => g.items.length);
  }, [q]);

  return (
    <>
      <PageHead eyebrow="Help centre" title="How can we help?" text="Find quick answers about booking, payments, cancellations and listing your buses." />
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="container">
          <label className="search-box">
            <Icon name="search" size={20} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for an answer" aria-label="Search help" />
          </label>
          {groups.length ? <FaqList groups={groups} /> : <p className="muted">No answers match &ldquo;{q}&rdquo;.</p>}
          <div className="card" style={{ marginTop: 36, maxWidth: 780 }}>
            <h3 style={{ marginTop: 0 }}>Still need help?</h3>
            <p>Send us a message and we will get back to you.</p>
            <p style={{ marginTop: 14 }}><Link to="/contact" className="btn btn-primary">Contact us <Icon name="arrow" size={18} /></Link></p>
          </div>
        </div>
      </section>
    </>
  );
}
