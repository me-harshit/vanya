import { Link } from "react-router-dom";
import { amenityLabels, dayOffset, fmtDuration, fmtTime, type AmenityId, type Trip } from "../data/trips";
import { Icon, type IconName } from "./Icon";

const amenityIcon: Record<AmenityId, IconName> = {
  wifi: "wifi", charging: "charging", blanket: "blanket", water: "water", reading_light: "light", tv: "tv", toilet: "toilet",
};

export function BusCard({ trip, query }: { trip: Trip; query: string }) {
  const next = dayOffset(trip);
  const low = trip.seatsLeft <= 6;
  return (
    <article className="card bus-card">
      <div className="bc-main">
        <div className="bc-head">
          <div>
            <h3>{trip.operator}</h3>
            <p className="muted">{trip.busName} · {trip.layout}</p>
          </div>
          <span className="rating" title={`${trip.reviews} ratings`}><Icon name="star" size={14} /> {trip.rating.toFixed(1)}</span>
        </div>

        <div className="bc-times">
          <div><b>{fmtTime(trip.depMin)}</b><span className="muted">{trip.boarding}</span></div>
          <div className="bc-dur"><span>{fmtDuration(trip.durMin)}</span><i /></div>
          <div><b>{fmtTime(trip.depMin + trip.durMin)}{next > 0 && <sup> +{next}d</sup>}</b><span className="muted">{trip.dropping}</span></div>
        </div>

        <ul className="bc-amen">
          {trip.amenities.slice(0, 5).map((a) => (
            <li key={a} title={amenityLabels[a]}><Icon name={amenityIcon[a]} size={16} /><span>{amenityLabels[a]}</span></li>
          ))}
          {trip.amenities.length > 5 && <li className="muted">+{trip.amenities.length - 5} more</li>}
        </ul>
      </div>

      <div className="bc-side">
        <div className="bc-fare"><small className="muted">Starts from</small><b>₹{trip.fare.toLocaleString("en-IN")}</b></div>
        <span className={"bc-seats" + (low ? " low" : "")}>{trip.seatsLeft} seats left</span>
        <Link to={`/book/${trip.id}?${query}`} className="btn btn-primary">Select seats</Link>
      </div>
    </article>
  );
}
