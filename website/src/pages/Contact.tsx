import { useState, type FormEvent } from "react";
import { PageHead } from "../components/Bits";
import { Icon } from "../components/Icon";
import { site } from "../config";

type Values = { name: string; email: string; phone: string; topic: string; message: string };
const empty: Values = { name: "", email: "", phone: "", topic: "Booking help", message: "" };
const topics = ["Booking help", "Payments and refunds", "List my buses (operator)", "Partnership", "Something else"];

function validate(v: Values) {
  const e: Partial<Record<keyof Values, string>> = {};
  if (!v.name.trim()) e.name = "Please enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = "Please enter a valid email.";
  if (v.phone && !/^[6-9]\d{9}$/.test(v.phone)) e.phone = "Enter a 10-digit Indian mobile number.";
  if (v.message.trim().length < 10) e.message = "Please write at least 10 characters.";
  return e;
}

export function Contact() {
  const [v, setV] = useState<Values>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [done, setDone] = useState(false);

  const set = (k: keyof Values) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));

  // The form is not connected to a backend yet. It validates and shows a notice, and sends nothing.
  // When the API exists, POST `v` here before calling setDone(true).
  function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length === 0) setDone(true);
  }

  return (
    <>
      <PageHead eyebrow="Contact" title="Contact us" text="Questions about a booking, or want to list your buses? Send us a message." />
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="container contact-grid">
          <form className="card form" onSubmit={submit} noValidate>
            {done ? (
              <div role="status">
                <span className="ico"><Icon name="check" size={24} /></span>
                <h3>Thanks, {v.name.split(" ")[0] || "there"}</h3>
                <p>The contact form is not live yet, so this message has not been sent. For now, please email {site.supportEmail}.</p>
                <button type="button" className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => { setV(empty); setDone(false); }}>Back to the form</button>
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input id="name" value={v.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} />
                  {errors.name && <span className="err">{errors.name}</span>}
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" value={v.email} onChange={set("email")} autoComplete="email" aria-invalid={!!errors.email} />
                    {errors.email && <span className="err">{errors.email}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="phone">Mobile (optional)</label>
                    <input id="phone" inputMode="numeric" maxLength={10} value={v.phone} onChange={set("phone")} autoComplete="tel-national" aria-invalid={!!errors.phone} />
                    {errors.phone && <span className="err">{errors.phone}</span>}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="topic">Topic</label>
                  <select id="topic" value={v.topic} onChange={set("topic")}>
                    {topics.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="message">Message</label>
                  <textarea id="message" rows={5} value={v.message} onChange={set("message")} aria-invalid={!!errors.message} />
                  {errors.message && <span className="err">{errors.message}</span>}
                </div>
                <button type="submit" className="btn btn-primary">Send message <Icon name="arrow" size={18} /></button>
                <p className="muted" style={{ fontSize: ".85rem" }}>The form is not connected yet; messages are not sent for now.</p>
              </>
            )}
          </form>

          <div className="contact-list" style={{ marginTop: 0 }}>
            <a className="contact-item" href={`mailto:${site.supportEmail}`}>
              <span className="ico"><Icon name="mail" size={22} /></span>
              <span><b>Email</b><br /><span className="muted">{site.supportEmail}</span></span>
            </a>
            <a className="contact-item" href={`tel:${site.supportPhone.replace(/\s/g, "")}`}>
              <span className="ico"><Icon name="call" size={22} /></span>
              <span><b>Phone</b><br /><span className="muted">{site.supportPhone}</span></span>
            </a>
            <div className="contact-item">
              <span className="ico"><Icon name="pin" size={22} /></span>
              <span><b>Office</b><br /><span className="muted">{site.address}</span></span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
