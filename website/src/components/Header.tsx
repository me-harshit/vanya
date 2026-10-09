import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { site } from "../config";
import { Icon } from "./Icon";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/routes", label: "Routes" },
  { to: "/offers", label: "Offers" },
  { to: "/operators", label: "For operators" },
  { to: "/about", label: "About" },
  { to: "/help", label: "Help" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="header">
      <div className="container header-in">
        <Link to="/" className="logo">
          <span className="logo-mark"><Icon name="bus" size={20} /></span>
          {site.name}
        </Link>

        <nav className={`nav ${open ? "open" : ""}`} aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
          ))}
          <NavLink to="/contact" className="nav-contact">Contact</NavLink>
          <NavLink to="/my-bookings" className="nav-contact">My bookings</NavLink>
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <AccountMenu />
          <Link to={{ pathname: "/", hash: "#download" }} className="btn btn-primary header-cta">Get the app</Link>
          <button className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
    </header>
  );
}
