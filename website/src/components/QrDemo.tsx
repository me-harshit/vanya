// DEMO placeholder for the ticket QR code. It is NOT scannable.
// The real QR is drawn from the backend's `qrText` (GET /bookings/:id/ticket) with a QR library,
// which needs approval before it is added as a dependency.

const N = 25;

function bits(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return (a >>> 16) & 1; };
}

export function QrDemo({ value }: { value: string }) {
  const next = bits(value);
  const finder = (r: number, c: number) => {
    const inBox = (r0: number, c0: number) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
    for (const [r0, c0] of [[0, 0], [0, N - 7], [N - 7, 0]] as const) {
      if (inBox(r0, c0)) {
        const dr = r - r0, dc = c - c0;
        return dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
      }
    }
    return null;
  };
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const f = finder(r, c);
      const on = f ?? next() === 1;
      if (on) cells.push(<rect key={`${r}-${c}`} x={c} y={r} width="1.02" height="1.02" />);
    }
  }
  return (
    <figure className="qr">
      <svg viewBox={`-2 -2 ${N + 4} ${N + 4}`} role="img" aria-label="Demo QR code, not scannable" fill="currentColor">{cells}</svg>
      <figcaption>Demo QR (not scannable)</figcaption>
    </figure>
  );
}
