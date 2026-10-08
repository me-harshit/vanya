// SAMPLE DATA: replace with real offers from the backend later.

export type Offer = { code: string; title: string; text: string; terms: string; tag: string };

export const offers: Offer[] = [
  { code: "WELCOME", title: "Welcome offer", text: "Get a discount on your first booking in the app.", terms: "New users only. Minimum booking value applies.", tag: "New users" },
  { code: "WEEKEND", title: "Weekend getaway", text: "Save on Friday and Saturday night departures.", terms: "Valid on selected routes and operators.", tag: "Weekend" },
  { code: "SLEEPER", title: "Sleeper savings", text: "Extra savings on AC sleeper buses.", terms: "Valid on AC sleeper services only.", tag: "Sleeper" },
  { code: "GROUP", title: "Travel together", text: "Book four or more seats in one go and save.", terms: "Minimum four seats in a single booking.", tag: "Groups" },
  { code: "UPI", title: "Pay with UPI", text: "A small discount when you pay using UPI.", terms: "Valid on UPI payments above the minimum amount.", tag: "Payments" },
  { code: "EARLY", title: "Early bird", text: "Book a week ahead and pay less.", terms: "Valid on bookings made 7 or more days before travel.", tag: "Advance" },
];
