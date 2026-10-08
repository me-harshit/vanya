import { Icon } from "./Icon";

// A CSS-built preview of the app. It uses theme tokens, so it re-colours with the site.
export function PhoneMock() {
  return (
    <div className="phone" aria-hidden="true">
      <div className="notch" />
      <div className="ph-status"><span>9:41</span><span>5G 100%</span></div>
      <div className="ph-body">
        <div className="ph-top"><span>Vanya Holidays</span><Icon name="bus" size={20} /></div>

        <div className="ph-card">
          <div className="ph-row">
            <div><div className="ph-muted">From</div><div className="ph-big">Delhi</div></div>
            <Icon name="arrow" size={16} />
            <div style={{ textAlign: "right" }}><div className="ph-muted">To</div><div className="ph-big">Manali</div></div>
          </div>
          <div className="ph-btn">Search buses</div>
        </div>

        <div className="ph-card">
          <div className="ph-row">
            <div><div className="ph-big">Vanya Holidays</div><div className="ph-muted">AC Sleeper (2+1)</div></div>
            <div className="mono ph-big">&#8377;1,250</div>
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="ph-tag" style={{ color: "var(--color-warning)" }}>4 seats left</span>
            <span className="ph-tag" style={{ color: "var(--color-success)" }}>Free cancellation</span>
          </div>
        </div>

        <div className="ph-card">
          <div className="ph-big" style={{ fontSize: ".85rem" }}>Select seats</div>
          <div className="ph-seats">
            <div className="seat">A1</div><div className="seat bkd">A2</div><div className="seat pick">A3</div><div className="seat lad">A4</div>
            <div className="seat">B1</div><div className="seat sel">B2</div><div className="seat bkd">B3</div><div className="seat">B4</div>
          </div>
          <div className="ph-btn">Pay &#8377;2,500</div>
        </div>
      </div>
      <div className="ph-tabs">
        <div className="on"><Icon name="bus" size={16} />Home</div>
        <div><Icon name="ticket" size={16} />Bookings</div>
        <div><Icon name="offer" size={16} />Offers</div>
        <div><Icon name="users" size={16} />Profile</div>
      </div>
    </div>
  );
}
