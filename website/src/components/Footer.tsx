import { Link } from "react-router-dom";
import { site } from "../config";
import { Icon } from "./Icon";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link to="/" className="logo">
              <span className="logo-mark"><Icon name="bus" size={20} /></span>
              {site.name}
            </Link>
            <p style={{ color: "var(--color-muted)", marginTop: 12, maxWidth: 320 }}>
              {site.tagline}. Trusted operators, secure payments and instant e-tickets.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><Link to="/features">Features</Link></li>
              <li><Link to="/how-it-works">How it works</Link></li>
              <li><Link to="/routes">Routes</Link></li>
              <li><Link to="/offers">Offers</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About us</Link></li>
              <li><Link to="/operators">For operators</Link></li>
              <li><Link to="/help">Help centre</Link></li>
              <li><Link to="/contact">Contact us</Link></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link to="/privacy">Privacy policy</Link></li>
              <li><Link to="/terms">Terms of use</Link></li>
              <li><Link to="/refunds">Cancellation and refunds</Link></li>
            </ul>
          </div>
        </div>
        <p className="copy">&copy; {new Date().getFullYear()} {site.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
