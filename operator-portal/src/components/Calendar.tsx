import { iso } from "../data/trips";
import { Icon } from "./Icon";

type Props = {
  month: Date; // any day in the month to show
  onMonth: (d: Date) => void;
  selected: string;
  onSelect: (date: string) => void;
  counts: Record<string, number>; // trips per date
};

const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// A plain month grid (Monday first). Each day shows how many trips run on it.
export function Calendar({ month, onMonth, selected, onSelect, counts }: Props) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7; // blank cells before the 1st
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = iso(new Date());
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => iso(new Date(first.getFullYear(), first.getMonth(), i + 1)))];

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => onMonth(new Date(first.getFullYear(), first.getMonth() - 1, 1))} aria-label="Previous month"><Icon name="left" /></button>
        <b>{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</b>
        <button className="icon-btn" onClick={() => onMonth(new Date(first.getFullYear(), first.getMonth() + 1, 1))} aria-label="Next month"><Icon name="right" /></button>
      </div>
      <div className="cal-grid" role="grid">
        {names.map((n) => <span key={n} className="cal-dow" role="columnheader">{n}</span>)}
        {cells.map((d, i) => d === null ? <span key={`b${i}`} /> : (
          <button key={d} className={"cal-day" + (d === selected ? " on" : "") + (d === today ? " today" : "")} onClick={() => onSelect(d)} aria-label={`${d}, ${counts[d] ?? 0} trips`} aria-pressed={d === selected}>
            <span>{Number(d.slice(8))}</span>
            {counts[d] ? <i>{counts[d]}</i> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
