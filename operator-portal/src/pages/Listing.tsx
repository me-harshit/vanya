import { useState } from "react";
import { Icon } from "../components/Icon";
import { updateProfile, useProfile, vendors, type ListingMode } from "../data/profile";

const modes: { id: ListingMode; title: string; text: string; points: string[] }[] = [
  { id: "direct", title: "List directly on Vanya", text: "You add your buses, routes and trips here, and we handle bookings.", points: ["Fastest way to start", "You control seats and fares in this portal", "Best if you do not sell the same seats elsewhere"] },
  { id: "own_erp", title: "Connect my own booking software", text: "Your ERP stays the source of truth. We read seats and book through its API.", points: ["No double booking: the seat is blocked in your system first", "Needs API access from your software", "Your trips are synced automatically"] },
  { id: "third_party", title: "Through my software provider", text: "Your provider (for example a ticketing platform) connects you to us.", points: ["Pick your provider and enter the details they gave you", "We connect once per provider", "Needs a partner agreement with us"] },
];

// Fixed demo status and errors, so the sync view has something to show.
const syncErrors = [
  { at: "Today, 09:12", text: "Seat block timed out for Delhi to Jaipur, 21:30. Retrying automatically." },
  { at: "Yesterday, 18:40", text: "Fare mismatch on Jaipur to Delhi: portal ₹780, software ₹800. Software fare was used." },
];

export function Listing() {
  const p = useProfile();
  const [mode, setMode] = useState<ListingMode>(p.mode);
  const [vendor, setVendor] = useState(p.erp.vendor || vendors[0]);
  const [url, setUrl] = useState(p.erp.baseUrl);
  const [key, setKey] = useState(p.erp.apiKey);
  const [test, setTest] = useState<"idle" | "testing" | "ok" | "bad">("idle");
  const [saved, setSaved] = useState("");

  const needsErp = mode !== "direct";
  const urlOk = /^https:\/\/\S+\.\S+/.test(url);
  const keyOk = key.trim().length >= 8;

  function runTest() {
    setTest("testing");
    // Demo only: nothing is sent. The test passes when the details look valid.
    setTimeout(() => setTest(urlOk && keyOk ? "ok" : "bad"), 1200);
  }

  function save() {
    updateProfile({ mode, erp: needsErp ? { vendor, baseUrl: url, apiKey: key, connected: test === "ok" || p.erp.connected, lastSync: test === "ok" ? Date.now() : p.erp.lastSync } : p.erp });
    setSaved("Listing mode saved.");
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Listing mode</h1><p className="muted">How your buses reach customers on Vanya Holidays.</p></div>
        <button className="btn btn-primary" onClick={save} disabled={needsErp && !(urlOk && keyOk)}><Icon name="check" /> Save</button>
      </div>
      {saved && <div className="card notice ok" role="status"><Icon name="check" /> <span>{saved}</span></div>}

      <section className="mode-grid" role="radiogroup" aria-label="Listing mode">
        {modes.map((m) => (
          <label key={m.id} className={"card mode" + (mode === m.id ? " on" : "")}>
            <input type="radio" name="mode" checked={mode === m.id} onChange={() => { setMode(m.id); setSaved(""); }} />
            <h2>{m.title}</h2>
            <p className="muted">{m.text}</p>
            <ul>{m.points.map((x) => <li key={x}><Icon name="check" size={16} /> {x}</li>)}</ul>
            {m.id === p.mode && <span className="pill ok">Current</span>}
          </label>
        ))}
      </section>

      {needsErp && (
        <section className="card form">
          <h2>{mode === "own_erp" ? "Your booking software" : "Your software provider"}</h2>
          <div className="form-grid">
            <label>{mode === "own_erp" ? "Software" : "Provider"}
              <select value={vendor} onChange={(e) => setVendor(e.target.value)}>{vendors.map((v) => <option key={v}>{v}</option>)}</select>
            </label>
            <label>API address
              <input value={url} onChange={(e) => { setUrl(e.target.value); setTest("idle"); }} placeholder="https://api.yoursoftware.example" />
              {url && !urlOk && <span className="err">Use a secure address starting with https://</span>}
            </label>
            <label>API key
              <input type="password" autoComplete="off" value={key} onChange={(e) => { setKey(e.target.value); setTest("idle"); }} placeholder="Given to you by your provider" />
              {key && !keyOk && <span className="err">The key looks too short.</span>}
            </label>
          </div>
          <p className="muted small">Demo only: nothing is sent or stored. In the real portal the key is kept encrypted on our server and never shown again.</p>
          <div className="head-actions">
            <button className="btn btn-ghost" onClick={runTest} disabled={test === "testing" || !url || !key}><Icon name="refresh" /> {test === "testing" ? "Testing…" : "Test connection"}</button>
            {test === "ok" && <span className="pill ok">Connected</span>}
            {test === "bad" && <span className="pill bad">Could not connect. Check the address and key.</span>}
          </div>
        </section>
      )}

      {needsErp && (p.erp.connected || test === "ok") && (
        <section className="two-col even">
          <div className="card">
            <h2>Sync status</h2>
            <dl className="kv">
              <div><dt>Connection</dt><dd><span className="pill ok">Healthy</span></dd></div>
              <div><dt>Last sync</dt><dd>{test === "ok" ? "Just now" : p.erp.lastSync ? new Date(p.erp.lastSync).toLocaleString("en-IN") : "Never"}</dd></div>
              <div><dt>Buses synced</dt><dd>6 of 6</dd></div>
              <div><dt>Trips synced (next 30 days)</dt><dd>142</dd></div>
              <div><dt>Seat checks</dt><dd>Live, on every booking</dd></div>
            </dl>
          </div>
          <div className="card">
            <h2>Recent issues</h2>
            <ul className="alerts">{syncErrors.map((e) => <li key={e.text} className="warning"><Icon name="alert" /> <span>{e.text}<small className="muted block">{e.at}</small></span></li>)}</ul>
          </div>
        </section>
      )}
      <p className="muted small">Listing a bus here <b>and</b> selling the same seats on another platform can sell a seat twice. If you do both, tell us and we will agree a fixed seat quota instead.</p>
    </>
  );
}
