import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Shell";
import { Icon } from "../components/Icon";
import { ThemeToggle } from "../components/ThemeToggle";
import { portal } from "../config";

// Demo only: any 10-digit number and any 6 digits log in. Nothing is sent or checked.
export function Login() {
  const go = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  return (
    <div className="auth">
      <div className="auth-top"><Logo /><ThemeToggle /></div>
      <div className="auth-card">
        <h1>{step === "phone" ? "Operator login" : "Enter the OTP"}</h1>
        <p className="muted">
          {step === "phone" ? "Manage your buses, trips and bookings in one place." : `We sent a 6-digit code to +91 ${phone}.`}
        </p>
        {step === "phone" ? (
          <form onSubmit={(e) => { e.preventDefault(); setStep("otp"); }}>
            <label>Mobile number
              <div className="input-row"><span>+91</span>
                <input inputMode="numeric" maxLength={10} placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
              </div>
            </label>
            <button className="btn btn-primary" disabled={phone.length !== 10}>Send OTP <Icon name="arrow" /></button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); go("/dashboard"); }}>
            <label>6-digit code
              <input className="otp" inputMode="numeric" maxLength={6} placeholder="••••••" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
            </label>
            <button className="btn btn-primary" disabled={otp.length !== 6}>Log in <Icon name="arrow" /></button>
            <button type="button" className="link-btn" onClick={() => setStep("phone")}>Change number</button>
          </form>
        )}
        <p className="muted small">New operator? <Link to="/register">Register your bus business</Link></p>
        {portal.showDemoBadge && <p className="demo-hint">Demo: enter any 10-digit number, then any 6 digits.</p>}
      </div>
    </div>
  );
}
