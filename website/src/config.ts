// Site-wide settings. Replace the placeholders before launch.

export const site = {
  name: "Vanya Holidays",
  tagline: "Book bus tickets in a few taps",
  // Leave a store URL empty to show a "Coming soon" badge instead of a link.
  playStoreUrl: "",
  appStoreUrl: "",
  // Where the "Register as operator" button goes (operator portal).
  operatorPortalUrl: "https://operator.vanyaholidays.com",
  supportEmail: "support@your-domain.com",
  supportPhone: "+91 00000 00000",
  // Shows a "Sample data" badge on pages that use dummy data (routes, offers, team).
  // Set to false once real data is connected, and delete the files in src/data marked SAMPLE.
  showSampleBadge: true,
  // Extra fee on top of the fare, as a percent of the fare. TO CONFIRM WITH THE CLIENT (0 = none).
  // Must match CONVENIENCE_FEE_PERCENT in the backend .env.
  convenienceFeePercent: 0,
  address: "Office address to be added",
  companyName: "Vanya Holidays (registered company name to be confirmed)",
  lastUpdated: "To be set before launch",
};
