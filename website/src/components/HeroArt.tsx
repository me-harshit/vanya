// Decorative hero illustration: a bus on a road between hills. Colours come from theme.css via CSS variables.
export function HeroArt() {
  return (
    <svg className="hero-svg" viewBox="0 0 460 240" role="img" aria-label="A bus travelling along a hill road" xmlns="http://www.w3.org/2000/svg">
      <circle cx="372" cy="58" r="30" fill="var(--color-primary)" opacity=".16" />
      <path d="M0 170 Q70 96 150 140 T300 124 T460 150 V240 H0 Z" fill="var(--color-primary)" opacity=".14" />
      <path d="M0 196 Q110 130 210 172 T460 168 V240 H0 Z" fill="var(--color-primary)" opacity=".24" />
      <path d="M0 214 Q150 188 460 206 V240 H0 Z" fill="var(--color-text)" opacity=".85" />
      <path d="M20 224 H440" stroke="var(--color-bg)" strokeWidth="3" strokeDasharray="26 22" opacity=".7" />
      <g className="hero-bus">
        <rect x="118" y="112" width="232" height="86" rx="18" fill="var(--color-primary)" />
        <rect x="118" y="168" width="232" height="8" fill="var(--color-on-primary)" opacity=".35" />
        <g fill="var(--color-on-primary)" opacity=".92">
          <rect x="136" y="126" width="38" height="28" rx="6" />
          <rect x="182" y="126" width="38" height="28" rx="6" />
          <rect x="228" y="126" width="38" height="28" rx="6" />
          <rect x="274" y="126" width="38" height="28" rx="6" />
        </g>
        <path d="M322 124 h14 q14 0 14 14 v26 h-28 z" fill="var(--color-on-primary)" opacity=".92" />
        <circle cx="344" cy="186" r="5" fill="var(--color-on-primary)" />
        {[168, 308].map((x) => (
          <g key={x}>
            <circle cx={x} cy="200" r="19" fill="var(--color-text)" />
            <circle cx={x} cy="200" r="8" fill="var(--color-bg)" />
          </g>
        ))}
      </g>
    </svg>
  );
}
