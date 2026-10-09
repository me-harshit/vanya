import { useId, useState } from "react";
import { cities, popularCities } from "../data/cities";
import { Icon, type IconName } from "./Icon";

type Props = {
  label: string;
  placeholder: string;
  icon: IconName;
  value: string;
  onChange: (city: string) => void;
  invalid?: boolean;
  // Element id to focus after a city is chosen (the next field in the search bar).
  id?: string;
  nextId?: string;
};

// Type-ahead city picker: type to filter, arrow keys + Enter to choose, Escape to close.
export function CitySelect({ label, placeholder, icon, value, onChange, invalid, id: givenId, nextId }: Props) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Keep the box in sync when the value is changed from outside (the swap button).
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value);
  }

  const q = text.trim().toLowerCase();
  const typing = open && q !== "" && q !== value.toLowerCase();
  const list = typing ? cities.filter((c) => c.toLowerCase().includes(q)).slice(0, 8) : popularCities;

  function choose(city: string) {
    onChange(city);
    setText(city);
    setOpen(false);
    if (nextId) document.getElementById(nextId)?.focus();
  }

  function close() {
    setOpen(false);
    // Typed something that is not a city: go back to the last valid choice.
    setText(value);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && open && list[active]) { e.preventDefault(); choose(list[active]); }
    else if (e.key === "Escape") close();
  }

  return (
    <div className={"sb-field" + (invalid ? " bad" : "")}>
      <Icon name={icon} size={22} className="sb-ico" />
      <div className="sb-body">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={id + "-list"}
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          onFocus={(e) => { setOpen(true); setActive(0); e.target.select(); }}
          onBlur={close}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={onKey}
        />
      </div>
      {open && list.length > 0 && (
        <ul className="sb-list" id={id + "-list"} role="listbox">
          {!typing && <li className="sb-hint" aria-hidden>Popular cities</li>}
          {list.map((c, i) => (
            // onMouseDown (not onClick) so the choice lands before the input loses focus.
            <li key={c} role="option" aria-selected={i === active} className={i === active ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); choose(c); }} onMouseEnter={() => setActive(i)}>
              <Icon name="pin" size={16} /> {c}
            </li>
          ))}
        </ul>
      )}
      {open && typing && list.length === 0 && (
        <ul className="sb-list"><li className="sb-hint">No city found</li></ul>
      )}
    </div>
  );
}
