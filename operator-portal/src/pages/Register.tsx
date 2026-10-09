import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Shell";
import { ThemeToggle } from "../components/ThemeToggle";
import { portal } from "../config";
import { cityNames } from "../data/routes";

const steps = ["Business", "Documents", "Bank", "Review"];
const docList = [
  { id: "gst", label: "GST certificate" }, { id: "pan", label: "PAN card" }, { id: "rc", label: "Bus registration (RC)" }, { id: "permit", label: "Route permit" }, { id: "cheque", label: "Cancelled cheque" },
];

// Demo sign-up: nothing is sent. Only file NAMES are kept, the files are never read.
export function Register() {
  const go = useNavigate();
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [f, setF] = useState({ business: "", owner: "", phone: "", email: "", city: "", gstin: "", pan: "", holder: "", account: "", ifsc: "", agree: false });
  const [files, setFiles] = useState<Record<string, string>>({});

  const check = [
    () => [!f.business.trim() && "Enter your business name", !f.owner.trim() && "Enter the owner's name", !/^[6-9]\d{9}$/.test(f.phone) && "Enter a 10-digit mobile number", !/^\S+@\S+\.\S+$/.test(f.email) && "Enter a valid email", !f.city && "Choose your city", !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9]Z[A-Z0-9]$/.test(f.gstin.toUpperCase()) && "Enter a valid GSTIN", !/^[A-Z]{5}\d{4}[A-Z]$/.test(f.pan.toUpperCase()) && "Enter a valid PAN"],
    () => docList.filter((d) => d.id !== "cheque" && !files[d.id]).map((d) => `Upload your ${d.label.toLowerCase()}`),
    () => [!f.holder.trim() && "Enter the account holder's name", !/^\d{9,18}$/.test(f.account) && "Account number must be 9 to 18 digits", !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.ifsc.toUpperCase()) && "Enter a valid IFSC"],
    () => [!f.agree && "Please accept the operator terms"],
  ];
  const errs = (n: number) => check[n]().filter(Boolean) as string[];

  function next() {
    setTried(true);
    if (errs(step).length) return;
    setTried(false);
    if (step === steps.length - 1) go("/pending"); else setStep(step + 1);
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="auth wide">
      <div className="auth-top"><Logo /><ThemeToggle /></div>
      <div className="auth-card reg">
        <h1>Register your bus business</h1>
        <p className="muted">It takes about 5 minutes. We review every application within 2 working days.</p>
        <ol className="stepper" aria-label="Progress">
          {steps.map((s, i) => <li key={s} className={i === step ? "on" : i < step ? "done" : ""}><span>{i < step ? <Icon name="check" size={14} /> : i + 1}</span>{s}</li>)}
        </ol>

        {step === 0 && (
          <div className="form-grid">
            <label>Business name<input value={f.business} onChange={set("business")} /></label>
            <label>Owner name<input value={f.owner} onChange={set("owner")} /></label>
            <label>Mobile number<input inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "") })} /></label>
            <label>Email<input type="email" value={f.email} onChange={set("email")} /></label>
            <label>City<select value={f.city} onChange={set("city")}><option value="">Choose a city</option>{cityNames.map((c) => <option key={c}>{c}</option>)}</select></label>
            <span />
            <label>GSTIN<input value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} placeholder="15 characters" /></label>
            <label>PAN<input value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} placeholder="10 characters" /></label>
          </div>
        )}

        {step === 1 && (
          <ul className="docs">
            {docList.map((d) => (
              <li key={d.id}>
                <Icon name="file" />
                <div><b>{d.label}{d.id === "cheque" && <span className="muted small"> (optional now)</span>}</b><span className="muted small">{files[d.id] ?? "PDF or photo"}</span></div>
                <label className="btn btn-ghost file-btn"><Icon name="upload" /> {files[d.id] ? "Replace" : "Choose file"}
                  <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => { const x = e.target.files?.[0]; if (x) setFiles({ ...files, [d.id]: x.name }); }} />
                </label>
              </li>
            ))}
          </ul>
        )}

        {step === 2 && (
          <div className="form-grid">
            <label>Account holder<input value={f.holder} onChange={set("holder")} /></label>
            <label>Account number<input inputMode="numeric" value={f.account} onChange={(e) => setF({ ...f, account: e.target.value.replace(/\D/g, "") })} /></label>
            <label>IFSC<input value={f.ifsc} onChange={(e) => setF({ ...f, ifsc: e.target.value.toUpperCase() })} placeholder="e.g. HDFC0000045" /></label>
          </div>
        )}

        {step === 3 && (
          <div className="review">
            <dl className="kv">
              <div><dt>Business</dt><dd>{f.business}</dd></div><div><dt>Owner</dt><dd>{f.owner}</dd></div>
              <div><dt>Mobile</dt><dd>+91 {f.phone}</dd></div><div><dt>Email</dt><dd>{f.email}</dd></div>
              <div><dt>City</dt><dd>{f.city}</dd></div><div><dt>GSTIN</dt><dd>{f.gstin}</dd></div>
              <div><dt>Documents</dt><dd>{Object.keys(files).length} uploaded</dd></div><div><dt>Bank account</dt><dd>•••• {f.account.slice(-4)}, {f.ifsc}</dd></div>
            </dl>
            <label className="check"><input type="checkbox" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} /> I agree to the operator terms, the commission and the cancellation rules.</label>
          </div>
        )}

        {tried && errs(step).length > 0 && <ul className="problems">{errs(step).map((e) => <li key={e}><Icon name="alert" size={16} /> {e}</li>)}</ul>}

        <div className="head-actions between">
          {step > 0 ? <button className="btn btn-ghost" onClick={() => { setStep(step - 1); setTried(false); }}>Back</button> : <Link to="/" className="btn btn-ghost">I already have an account</Link>}
          <button className="btn btn-primary" onClick={next}>{step === steps.length - 1 ? "Submit for review" : "Continue"} <Icon name="arrow" /></button>
        </div>
        {portal.showDemoBadge && <p className="demo-hint">Demo: nothing is sent. Only file names are kept, the files are never read.</p>}
      </div>
    </div>
  );
}

export function Pending() {
  return (
    <div className="auth">
      <div className="auth-top"><Logo /><ThemeToggle /></div>
      <div className="auth-card reg">
        <span className="tick ok"><Icon name="check" size={30} /></span>
        <h1>Application received</h1>
        <p className="muted">Thank you. Our team will check your documents and get back to you within 2 working days. We will text and email you.</p>
        <ol className="timeline">
          <li className="done"><b>Application submitted</b><span className="muted small">Just now</span></li>
          <li className="now"><b>Documents under review</b><span className="muted small">Usually within 2 working days</span></li>
          <li><b>Approved, you can add buses and trips</b><span className="muted small">We will tell you as soon as it is done</span></li>
        </ol>
        <Link to="/dashboard" className="btn btn-primary">See a preview of the portal</Link>
        <Link to="/" className="link-btn">Back to login</Link>
      </div>
    </div>
  );
}
