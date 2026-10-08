import { Link } from "react-router-dom";
import { PageHead } from "../components/Bits";
import { Icon } from "../components/Icon";

export function NotFound() {
  return (
    <PageHead eyebrow="404" title="We could not find that page" text="The page may have moved, or the link may be wrong.">
      <p style={{ marginTop: 20 }}><Link to="/" className="btn btn-primary">Back to home <Icon name="arrow" size={18} /></Link></p>
    </PageHead>
  );
}
