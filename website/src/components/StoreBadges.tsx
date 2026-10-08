import { site } from "../config";
import { Icon } from "./Icon";

// Shows a real link when the store URL is set in config.ts, otherwise "Coming soon".
export function StoreBadges() {
  const items = [
    { url: site.playStoreUrl, label: "Google Play", small: "Get it on" },
    { url: site.appStoreUrl, label: "App Store", small: "Download on the" },
  ];
  return (
    <div className="store-row">
      {items.map((s) =>
        s.url ? (
          <a key={s.label} className="store" href={s.url} target="_blank" rel="noreferrer">
            <Icon name="phone" size={26} />
            <span><small>{s.small}</small><b>{s.label}</b></span>
          </a>
        ) : (
          <span key={s.label} className="store soon" aria-disabled="true">
            <Icon name="phone" size={26} />
            <span><small>Coming soon on</small><b>{s.label}</b></span>
          </span>
        ),
      )}
    </div>
  );
}
