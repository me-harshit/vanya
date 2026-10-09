import { useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { portal } from "../config";
import { setDocFile, updateProfile, useProfile, type DocStatus } from "../data/profile";

const label: Record<DocStatus, string> = { verified: "Verified", pending: "Under review", missing: "Not uploaded", rejected: "Needs a new copy" };
const tone: Record<DocStatus, string> = { verified: "ok", pending: "warn", missing: "off", rejected: "bad" };

export function Profile() {
  const p = useProfile();
  const [b, setB] = useState({ business: p.business, owner: p.owner, phone: p.phone, email: p.email, city: p.city, address: p.address, gstin: p.gstin, pan: p.pan });
  const [bank, setBank] = useState(p.bank);
  const [saved, setSaved] = useState("");
  const pick = useRef<string>("");
  const input = useRef<HTMLInputElement>(null);

  const gstOk = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9]Z[A-Z0-9]$/.test(b.gstin.toUpperCase());
  const panOk = /^[A-Z]{5}\d{4}[A-Z]$/.test(b.pan.toUpperCase());
  const ifscOk = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc.toUpperCase());
  const accOk = /^\d{9,18}$/.test(bank.account);
  const emailOk = /^\S+@\S+\.\S+$/.test(b.email);
  const valid = b.business.trim() && b.owner.trim() && /^[6-9]\d{9}$/.test(b.phone) && emailOk && gstOk && panOk && ifscOk && accOk;

  function save() {
    if (!valid) { setSaved("Please fix the highlighted details first."); return; }
    updateProfile({ ...b, gstin: b.gstin.toUpperCase(), pan: b.pan.toUpperCase(), bank: { ...bank, ifsc: bank.ifsc.toUpperCase() } });
    setSaved("Profile saved.");
  }
  const bad = (cond: boolean) => (cond ? undefined : true);

  return (
    <>
      <div className="page-head">
        <div><h1>Profile</h1><p className="muted">Your business, documents and bank account.</p></div>
        <button className="btn btn-primary" onClick={save}><Icon name="check" /> Save changes</button>
      </div>
      {saved && <div className={"card notice " + (saved.startsWith("Please") ? "bad" : "ok")} role="status"><Icon name={saved.startsWith("Please") ? "alert" : "check"} /> <span>{saved}</span></div>}

      <section className="card form">
        <h2>Business details</h2>
        <div className="form-grid">
          <label>Business name<input value={b.business} onChange={(e) => setB({ ...b, business: e.target.value })} /></label>
          <label>Owner name<input value={b.owner} onChange={(e) => setB({ ...b, owner: e.target.value })} /></label>
          <label>Mobile number<input inputMode="numeric" maxLength={10} value={b.phone} aria-invalid={bad(/^[6-9]\d{9}$/.test(b.phone))} onChange={(e) => setB({ ...b, phone: e.target.value.replace(/\D/g, "") })} /></label>
          <label>Email<input value={b.email} aria-invalid={bad(emailOk)} onChange={(e) => setB({ ...b, email: e.target.value })} /></label>
          <label>GSTIN<input value={b.gstin} aria-invalid={bad(gstOk)} onChange={(e) => setB({ ...b, gstin: e.target.value.toUpperCase() })} />{!gstOk && <span className="err">Enter a valid 15-character GSTIN.</span>}</label>
          <label>PAN<input value={b.pan} aria-invalid={bad(panOk)} onChange={(e) => setB({ ...b, pan: e.target.value.toUpperCase() })} />{!panOk && <span className="err">Enter a valid 10-character PAN.</span>}</label>
          <label className="wide">Office address<input value={b.address} onChange={(e) => setB({ ...b, address: e.target.value })} /></label>
        </div>
      </section>

      <section className="card form">
        <h2>Bank account for payouts</h2>
        <div className="form-grid">
          <label>Account holder<input value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value })} /></label>
          <label>Bank<input value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} /></label>
          <label>Account number<input inputMode="numeric" value={bank.account} aria-invalid={bad(accOk)} onChange={(e) => setBank({ ...bank, account: e.target.value.replace(/\D/g, "") })} />{!accOk && <span className="err">Use 9 to 18 digits.</span>}</label>
          <label>IFSC<input value={bank.ifsc} aria-invalid={bad(ifscOk)} onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })} />{!ifscOk && <span className="err">Example: HDFC0000045</span>}</label>
        </div>
        <p className="muted small">Changing bank details may pause payouts for 24 hours while we verify them.</p>
      </section>

      <section className="card">
        <h2>Documents</h2>
        <input ref={input} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && pick.current) setDocFile(pick.current, f.name); e.target.value = ""; }} />
        <ul className="docs">
          {p.docs.map((d) => (
            <li key={d.id}>
              <Icon name="file" />
              <div><b>{d.label}</b><span className="muted small">{d.file ?? d.hint}</span>{d.note && <span className="err">{d.note}</span>}</div>
              <span className={"pill " + tone[d.status]}>{label[d.status]}</span>
              <button className="btn btn-ghost" onClick={() => { pick.current = d.id; input.current?.click(); }}><Icon name="upload" /> {d.status === "missing" ? "Upload" : "Replace"}</button>
            </li>
          ))}
        </ul>
        <p className="muted small">Demo only: only the file name is kept. In the real portal documents are stored securely and checked by our team within 2 working days.</p>
      </section>

      <section className="card form">
        <h2>Notifications</h2>
        {([["booking", "A new booking is made"], ["cancellation", "A passenger cancels"], ["settlement", "A payout is made"], ["sms", "Also send me an SMS"]] as const).map(([k, t]) => (
          <label key={k} className="check"><input type="checkbox" checked={p.notify[k]} onChange={(e) => updateProfile({ notify: { ...p.notify, [k]: e.target.checked } })} /> {t}</label>
        ))}
      </section>
      <p className="muted small">Need help? Write to {portal.supportEmail} or call {portal.supportPhone}.</p>
    </>
  );
}
