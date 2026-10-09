import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CitySelect } from "./CitySelect";
import { Icon } from "./Icon";

type Initial = { from?: string; to?: string; date?: string };

// Local calendar date as YYYY-MM-DD (not UTC, so late-night users get the right day).
function iso(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}
function pretty(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// The main search box: From, To, date (with Today / Tomorrow), Search buses.
export function SearchBar({ initial = {} }: { initial?: Initial }) {
  const go = useNavigate();
  const today = plusDays(0);
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [date, setDate] = useState(initial.date && initial.date >= today ? initial.date : today);
  const [tried, setTried] = useState(false);

  const sameCity = from !== "" && from === to;
  const problem = !from ? "Choose where you are travelling from." : !to ? "Choose where you are going." : sameCity ? "From and To must be different cities." : "";

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (problem) return;
    go(`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`);
  }

  const label = date === today ? "Today" : date === plusDays(1) ? "Tomorrow" : "";

  return (
    <form className="searchbar" onSubmit={submit} noValidate>
      <div className="sb-row">
        <div className="sb-cities">
          <CitySelect label="From" placeholder="Leaving from" icon="bus" value={from} onChange={setFrom} id="sb-from" nextId="sb-to" invalid={tried && (!from || sameCity)} />
          <button type="button" className="sb-swap" onClick={swap} aria-label="Swap From and To"><Icon name="swap" size={18} /></button>
          <CitySelect label="To" placeholder="Going to" icon="pin" value={to} onChange={setTo} id="sb-to" invalid={tried && (!to || sameCity)} />
        </div>
        <div className="sb-field sb-date">
          <Icon name="calendar" size={22} className="sb-ico" />
          <div className="sb-body">
            <label htmlFor="sb-date">Date of journey</label>
            <div className="sb-datevalue">
              <span>{pretty(date)}{label && <small> ({label})</small>}</span>
              <input id="sb-date" type="date" min={today} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Choose journey date" />
            </div>
          </div>
          <div className="sb-quick">
            <button type="button" className={date === today ? "on" : ""} onClick={() => setDate(today)}>Today</button>
            <button type="button" className={date === plusDays(1) ? "on" : ""} onClick={() => setDate(plusDays(1))}>Tomorrow</button>
          </div>
        </div>
      </div>
      {tried && problem && <p className="sb-error" role="alert">{problem}</p>}
      <button className="btn btn-primary sb-go"><Icon name="search" size={20} /> Search buses</button>
    </form>
  );
}
