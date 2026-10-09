import { Icon } from "../components/Icon";

// Placeholder for screens that are planned but not built yet (see progress.md).
export function ComingNext({ title }: { title: string }) {
  return (
    <div className="empty card">
      <Icon name="clock" size={28} />
      <h1>{title}</h1>
      <p className="muted">This screen is part of the next demo step.</p>
    </div>
  );
}
