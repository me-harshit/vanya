import type { ComponentProps } from "react";
import { MorphIcon } from "morphicons/react";
import * as L from "lucide";

// Icon data comes from Lucide (stroke-based, one weight everywhere).
// Morphicons animates between icons whenever the `name` changes.
type IconData = NonNullable<ComponentProps<typeof MorphIcon>["icon"]>;

const icons = {
  bus: L.Bus,
  ticket: L.Ticket,
  shield: L.ShieldCheck,
  seat: L.Armchair,
  pin: L.MapPin,
  wallet: L.Wallet,
  phone: L.Smartphone,
  clock: L.Clock,
  route: L.Route,
  support: L.Headset,
  offer: L.BadgePercent,
  star: L.Star,
  menu: L.Menu,
  close: L.X,
  sun: L.Sun,
  moon: L.Moon,
  down: L.ChevronDown,
  arrow: L.ArrowRight,
  check: L.Check,
  search: L.Search,
  swap: L.ArrowLeftRight,
  filter: L.SlidersHorizontal,
  lock: L.Lock,
  user: L.UserRound,
  logout: L.LogOut,
  alert: L.TriangleAlert,
  download: L.Download,
  share: L.Share2,
  left: L.ChevronLeft,
  right: L.ChevronRight,
  wifi: L.Wifi,
  charging: L.BatteryCharging,
  blanket: L.BedDouble,
  water: L.Droplet,
  light: L.Lightbulb,
  tv: L.Tv,
  toilet: L.Bath,
  calendar: L.CalendarDays,
  building: L.Building2,
  plug: L.Plug,
  store: L.Store,
  file: L.FileText,
  mail: L.Mail,
  call: L.Phone,
  verified: L.BadgeCheck,
  refund: L.RotateCcw,
  qr: L.QrCode,
  zap: L.Zap,
  users: L.Users,
  dashboard: L.LayoutDashboard,
  link: L.Link,
  card: L.CreditCard,
  bell: L.Bell,
} satisfies Record<string, IconData>;

export type IconName = keyof typeof icons;

type Props = { name: IconName; size?: number; className?: string; label?: string };

export function Icon({ name, size = 22, className, label }: Props) {
  return <MorphIcon icon={icons[name]} size={size} strokeWidth={1.75} className={className} label={label} />;
}
