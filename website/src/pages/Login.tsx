import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { site } from "../config";
import { DEMO_BAD_CODE, login, OTP_MAX_ATTEMPTS, OTP_RESEND_SECONDS, safeNext, useSession } from "../data/auth";

// Demo login: no SMS is sent. Rules match the backend (6 digits, 30 second resend, 5 tries).
export function Login() {
  const [p] = useSearchParams();
  const go = useNavigate();
  const session = useSession();
  const next = safeNext(p.get("next"));
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (session && step === "phone") return <Navigate to={next} replace />;

  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const locked = tries >= OTP_MAX_ATTEMPTS;

  function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!phoneOk) { setError("Enter a valid 10-digit mobile number."); return; }
    setError(""); setOtp(""); setTries(0); setWait(OTP_RESEND_SECONDS); setStep("otp");
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (otp.length !== 6) { setError("Enter the 6-digit code."); return; }
    if (otp === DEMO_BAD_CODE) {
      const used = tries + 1;
      setTries(used);
      setError(used >= OTP_MAX_ATTEMPTS ? "Too many wrong attempts. Please request a new code." : `That code is not right. ${OTP_MAX_ATTEMPTS - used} attempt${OTP_MAX_ATTEMPTS - used === 1 ? "" : "s"} left.`);
      return;
    }
    login(phone);
    go(next, { replace: true });
  }

  return (
    <section className="section">
      <div className="container">
        <div className="card login-card">
          <span className="ico"><Icon name="phone" size={24} /></span>
          <h1>{step === "phone" ? "Log in or sign up" : "Enter the code"}</h1>
          <p className="muted">{step === "phone" ? "We will text you a 6-digit code. No password needed." : `We sent a 6-digit code to +91 ${phone}.`}</p>

          {step === "phone" ? (
            <form onSubmit={sendOtp} noValidate>
              <div className="field">
                <label htmlFor="lp">Mobile number</label>
                <div className="input-prefix"><span>+91</span>
                  <input id="lp" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="9876543210" value={phone} aria-invalid={!!error} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }} />
                </div>
                {error && <span className="err" role="alert">{error}</span>}
              </div>
              <button className="btn btn-primary">Send code <Icon name="arrow" size={18} /></button>
            </form>
          ) : (
            <form onSubmit={verify} noValidate>
              <div className="field">
                <label htmlFor="lo">6-digit code</label>
                <input id="lo" className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={otp} disabled={locked} aria-invalid={!!error} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }} />
                {error && <span className="err" role="alert">{error}</span>}
              </div>
              <button className="btn btn-primary" disabled={locked}>Verify and continue</button>
              <div className="login-links">
                <button type="button" className="text-link plain" onClick={() => { setStep("phone"); setError(""); }}>Change number</button>
                <button type="button" className="text-link plain" disabled={wait > 0} onClick={() => sendOtp()}>{wait > 0 ? `Resend code in ${wait}s` : "Resend code"}</button>
              </div>
            </form>
          )}

          {site.showSampleBadge && (
            <p className="demo-hint"><b>Demo:</b> no SMS is sent. Use any valid number, then any 6 digits. The code {DEMO_BAD_CODE} always fails, to show the error.</p>
          )}
          <p className="muted small">By continuing you agree to our terms and privacy policy.</p>
        </div>
      </div>
    </section>
  );
}
