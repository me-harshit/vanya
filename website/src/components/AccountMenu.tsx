import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout, useSession } from "../data/auth";
import { Icon } from "./Icon";

// Header account area: "Log in" when signed out, a small menu (My bookings, Log out) when signed in.
export function AccountMenu() {
  const session = useSession();
  const { pathname } = useLocation();
  const go = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!session) {
    return <Link to={`/login?next=${encodeURIComponent(pathname.startsWith("/login") ? "/my-bookings" : pathname)}`} className="btn btn-ghost acct-login"><Icon name="user" size={18} /><span>Log in</span></Link>;
  }
  return (
    <div className="acct" ref={box}>
      <button className="btn btn-ghost acct-btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <Icon name="user" size={18} /><span>+91 {session.phone.slice(0, 2)}••••{session.phone.slice(-3)}</span>
      </button>
      {open && (
        <div className="acct-menu" role="menu">
          <Link to="/my-bookings" role="menuitem"><Icon name="ticket" size={18} /> My bookings</Link>
          <button role="menuitem" onClick={() => { logout(); setOpen(false); go("/"); }}><Icon name="logout" size={18} /> Log out</button>
        </div>
      )}
    </div>
  );
}
