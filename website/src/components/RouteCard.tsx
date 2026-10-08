import { Link } from "react-router-dom";
import type { Route } from "../data/routes";
import { Icon } from "./Icon";

export function RouteCard({ r }: { r: Route }) {
  return (
    <Link to={`/routes/${r.slug}`} className="card route-card">
      <div className="route-title">
        <span>{r.from}</span><Icon name="arrow" size={18} /><span>{r.to}</span>
      </div>
      <div className="route-meta">
        <span><Icon name="clock" size={16} /> {r.duration}</span>
        <span><Icon name="route" size={16} /> {r.km} km</span>
        <span><Icon name="bus" size={16} /> {r.operators} operators</span>
      </div>
      <div className="route-foot">
        <span className="muted">From</span>
        <b className="mono">&#8377;{r.fareFrom.toLocaleString("en-IN")}</b>
      </div>
    </Link>
  );
}
