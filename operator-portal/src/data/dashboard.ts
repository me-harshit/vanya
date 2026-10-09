// DEMO data: replace with API calls when the backend is connected.

export const operator = { name: "Shree Ganesh Travels", owner: "Rakesh Sharma", phone: "+91 98765 43210" };

export const stats = [
  { label: "Bookings today", value: "38", change: "+12%", up: true, icon: "ticket" },
  { label: "Revenue today", value: "₹54,320", change: "+8%", up: true, icon: "wallet" },
  { label: "Seats filled (next 7 days)", value: "72%", change: "-3%", up: false, icon: "seat" },
  { label: "Active buses", value: "14", change: "of 16", up: true, icon: "bus" },
] as const;

export const upcomingTrips = [
  { id: "T-2041", route: "Delhi → Jaipur", bus: "RJ14 PA 2210 · Volvo AC Sleeper", departs: "Today, 21:30", filled: 31, total: 36 },
  { id: "T-2042", route: "Jaipur → Delhi", bus: "RJ14 PA 2210 · Volvo AC Sleeper", departs: "Tomorrow, 06:00", filled: 18, total: 36 },
  { id: "T-2043", route: "Delhi → Chandigarh", bus: "DL1P 5532 · AC Seater 2+2", departs: "Today, 23:00", filled: 40, total: 44 },
  { id: "T-2044", route: "Indore → Mumbai", bus: "MP09 FA 7781 · Multi-axle Sleeper", departs: "Tomorrow, 18:15", filled: 9, total: 30 },
] as const;

export const recentBookings = [
  { id: "VH-93K2Q", passenger: "Anita Verma", trip: "Delhi → Jaipur", seats: "L12, L13", amount: "₹1,640", status: "Confirmed" },
  { id: "VH-77PLM", passenger: "Imran Khan", trip: "Delhi → Chandigarh", seats: "7", amount: "₹560", status: "Confirmed" },
  { id: "VH-55ZXA", passenger: "Priya Nair", trip: "Indore → Mumbai", seats: "U4", amount: "₹1,150", status: "Cancelled" },
  { id: "VH-20QWE", passenger: "Karan Mehta", trip: "Jaipur → Delhi", seats: "L3", amount: "₹820", status: "Confirmed" },
  { id: "VH-18BNV", passenger: "Sunita Rao", trip: "Delhi → Jaipur", seats: "U9, U10", amount: "₹1,640", status: "Confirmed" },
] as const;

export const alerts = [
  { tone: "warning", text: "Bus MP09 FA 7781: pollution certificate expires in 6 days." },
  { tone: "danger", text: "Trip T-2038 (Jaipur → Delhi) has 2 unpaid held seats expiring soon." },
  { tone: "success", text: "Settlement of ₹1,82,400 for 1 to 7 Oct was paid on 8 Oct." },
] as const;

// Revenue for the last 7 days (₹ thousands), for the small bar chart.
export const revenueWeek = [
  { day: "Fri", amount: 38 },
  { day: "Sat", amount: 61 },
  { day: "Sun", amount: 72 },
  { day: "Mon", amount: 44 },
  { day: "Tue", amount: 49 },
  { day: "Wed", amount: 53 },
  { day: "Thu", amount: 54 },
] as const;
