import type { ComponentProps } from "react";
import { MorphIcon } from "morphicons/react";
import * as L from "lucide";

// Icon data comes from Lucide (stroke-based, one weight everywhere).
// Morphicons animates between icons whenever the `name` changes.
type IconData = NonNullable<ComponentProps<typeof MorphIcon>["icon"]>;

const icons = {
  bus: L.Bus,
  dashboard: L.LayoutDashboard,
  route: L.Route,
  calendar: L.CalendarDays,
  ticket: L.Ticket,
  wallet: L.Wallet,
  plug: L.Plug,
  user: L.UserRound,
  menu: L.Menu,
  close: L.X,
  sun: L.Sun,
  moon: L.Moon,
  arrow: L.ArrowRight,
  alert: L.TriangleAlert,
  check: L.CircleCheck,
  clock: L.Clock,
  seat: L.Armchair,
  logout: L.LogOut,
  bell: L.Bell,
  plus: L.Plus,
  left: L.ChevronLeft,
  right: L.ChevronRight,
  download: L.Download,
  upload: L.Upload,
  file: L.FileText,
  refresh: L.RefreshCw,
  users: L.Users,
  edit: L.Pencil,
  trash: L.Trash2,
  snowflake: L.Snowflake,
  search: L.Search,
  eye: L.Eye,
  back: L.ArrowLeft,
} satisfies Record<string, IconData>;

export type IconName = keyof typeof icons;

type Props = { name: IconName; size?: number; className?: string; label?: string };

export function Icon({ name, size = 20, className, label }: Props) {
  return <MorphIcon icon={icons[name]} size={size} strokeWidth={1.75} className={className} label={label} />;
}
