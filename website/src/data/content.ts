import type { IconName } from "../components/Icon";

export const features: { icon: IconName; title: string; text: string }[] = [
  { icon: "seat", title: "Pick your exact seat", text: "See the live seat map, choose window, aisle or sleeper berths, and know what is available before you pay." },
  { icon: "card", title: "Secure payments", text: "Pay with UPI, cards or netbanking. Your payment is confirmed the moment your seat is locked in." },
  { icon: "refund", title: "Clear cancellations", text: "See the cancellation policy before you book. Eligible refunds go back to your original payment method." },
  { icon: "verified", title: "Verified operators", text: "Every operator on Vanya Holidays is checked before they can list buses, so you travel with confidence." },
  { icon: "ticket", title: "Instant e-tickets", text: "Your ticket arrives in the app and by SMS and email, with a QR code for easy boarding." },
  { icon: "pin", title: "Choose where you board", text: "Pick the boarding and dropping points that suit you, with times shown for each stop." },
  { icon: "offer", title: "Offers and coupons", text: "Apply coupons at checkout and see your final price before you pay." },
  { icon: "bell", title: "Trip updates", text: "Get notified about your booking, boarding details and any change to your trip." },
  { icon: "support", title: "Help when you need it", text: "Reach our support team from the app if something does not go as planned." },
];

export const steps: { title: string; text: string }[] = [
  { title: "Search", text: "Enter where you are going and when. Filter by bus type, time and price." },
  { title: "Choose a seat", text: "Open the seat map and tap the seats you want. We hold them while you pay." },
  { title: "Pay securely", text: "Pay with UPI, card or netbanking. Apply a coupon if you have one." },
  { title: "Travel", text: "Show the e-ticket at boarding. Need to change plans? Cancel from the app." },
];

export type FaqGroup = { group: string; items: { q: string; a: string }[] };

export const faqGroups: FaqGroup[] = [
  {
    group: "Booking",
    items: [
      { q: "How do I book a ticket?", a: "Download the Vanya Holidays app, sign in with your mobile number, search your route, choose your seats, and pay. Your e-ticket appears instantly." },
      { q: "Can I book on the website?", a: "Bookings are made in the Vanya Holidays mobile app for Android and iOS. This website tells you about us and lets operators learn how to list their buses." },
      { q: "How long are my seats held while I pay?", a: "Seats are held for a few minutes while you complete payment. If time runs out, the seats are released and you can search again." },
    ],
  },
  {
    group: "Payments",
    items: [
      { q: "What payment methods can I use?", a: "UPI, debit and credit cards, and netbanking, processed through a secure payment gateway." },
      { q: "Money was deducted but my booking failed. What now?", a: "If your payment went through but the booking was not confirmed, the amount is refunded automatically to the original payment method." },
    ],
  },
  {
    group: "Cancellation and refunds",
    items: [
      { q: "How do I cancel a ticket?", a: "Open My Bookings in the app and choose Cancel. The refund amount depends on the operator's cancellation policy, which is shown before you book." },
      { q: "When will I get my refund?", a: "Eligible refunds return to your original payment method. Timing depends on your bank or provider and is usually a few working days." },
    ],
  },
  {
    group: "For operators",
    items: [
      { q: "I am a bus operator. How do I list my buses?", a: "Register on the operator portal. You can add buses directly, or connect your existing booking software. See the For operators page for details." },
      { q: "Can I connect my existing booking software?", a: "Yes. You can list through your own ERP or a supported third-party provider so seats stay in sync across channels." },
    ],
  },
];
