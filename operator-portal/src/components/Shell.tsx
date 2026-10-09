import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { portal } from "../config";
import { operator } from "../data/dashboard";
import { Icon, type IconName } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

const nav: { to: string; label: string; icon: IconName }[] = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/buses", label: "Buses", icon: "bus" },
  { to: "/routes", label: "Routes & schedules", icon: "route" },
  { to: "/trips", label: "Trips", icon: "calendar" },
  { to: "/bookings", label: "Bookings", icon: "ticket" },
  { to: "/earnings", label: "Earnings", icon: "wallet" },
  { to: "/listing", label: "Listing mode", icon: "plug" },
  { to: "/profile", label: "Profile", icon: "user" },
];

export function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark"><Icon name="bus" size={20} /></span>
      <span>{portal.name}<small>{portal.product}</small></span>
    </span>
  );
}

export function Shell() {
  const [open, setOpen] = useState(false);
  const go = useNavigate();
  return (
    <div className="shell">
      <aside className={"sidebar" + (open ? " open" : "")}>
        <Logo />
        <nav>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}>
              <Icon name={n.icon} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <button className="nav-out" onClick={() => go("/")}><Icon name="logout" /> Log out</button>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="topbar-title">{operator.name}</div>
          <div className="topbar-actions">
            {portal.showDemoBadge && <span className="badge">Demo data</span>}
            <button className="icon-btn" aria-label="Notifications"><Icon name="bell" /></button>
            <ThemeToggle />
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
