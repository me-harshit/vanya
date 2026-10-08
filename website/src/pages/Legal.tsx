import type { ReactNode } from "react";
import { site } from "../config";

// DRAFT legal text. Have a lawyer review and finalise these pages before launch.
// They are also required for payment gateway approval and app store review.

function Page({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <div className="container page-head">
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      <div className="container prose">
        <div className="draft-note">Draft: this page is a working draft and must be reviewed and finalised before launch. Last updated: {site.lastUpdated}.</div>
        {children}
      </div>
    </>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy policy" intro={`How ${site.name} collects, uses and protects your information.`}>
      <h2>Information we collect</h2>
      <ul>
        <li>Account details: your mobile number and name, and email if you provide it.</li>
        <li>Booking details: passenger names, ages, seat choices, boarding and dropping points.</li>
        <li>Payment status from our payment gateway. We do not store your full card details.</li>
        <li>Device and usage information to keep the app secure and working well.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To confirm and manage bookings, send tickets and updates, process payments and refunds, prevent fraud, provide support, and improve the service.</p>
      <h2>Sharing</h2>
      <p>We share the details needed for your trip with the bus operator, and with service providers such as payment, SMS and email providers. We do not sell your personal information.</p>
      <h2>Your choices</h2>
      <p>You can ask to access, correct or delete your information, subject to legal requirements. Contact us at {site.supportEmail}.</p>
      <h2>Security and retention</h2>
      <p>We use reasonable safeguards to protect your information and keep it only as long as needed for the purposes above or as required by law.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of use" intro={`The rules for using ${site.name}.`}>
      <h2>Our role</h2>
      <p>{site.name} is a platform that connects passengers with independent bus operators. The journey itself is provided by the operator, who is responsible for the bus, schedule and service.</p>
      <h2>Bookings</h2>
      <p>A booking is confirmed only after payment succeeds and you receive an e-ticket. Please check passenger details, boarding point and timings before paying.</p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Provide accurate details and carry valid ID during travel.</li>
        <li>Reach the boarding point on time.</li>
        <li>Do not misuse the app or attempt to book seats in bulk or by automated means.</li>
      </ul>
      <h2>Changes by operators</h2>
      <p>Operators may change or cancel a trip. In that case you will be informed and refunded as described in the cancellation and refund policy.</p>
      <h2>Liability</h2>
      <p>To the extent allowed by law, {site.name} is not liable for the operator's acts or omissions during the journey.</p>
      <h2>Contact</h2>
      <p>Questions about these terms: {site.supportEmail}.</p>
    </Page>
  );
}

export function Refunds() {
  return (
    <Page title="Cancellation and refunds" intro="What happens when you cancel a ticket or a trip changes.">
      <h2>Cancelling a ticket</h2>
      <p>You can cancel from My Bookings in the app. The refund depends on the operator's cancellation policy for that bus, which is shown before you book.</p>
      <h2>Cancellation by the operator</h2>
      <p>If an operator cancels a trip, you receive a full refund.</p>
      <h2>How refunds are paid</h2>
      <p>Eligible refunds are returned to the original payment method. Timing depends on your bank or payment provider and is usually a few working days.</p>
      <h2>Failed payments</h2>
      <p>If money is debited but your booking is not confirmed, the amount is refunded automatically to the original payment method.</p>
      <h2>Need help?</h2>
      <p>Write to {site.supportEmail} with your booking details.</p>
    </Page>
  );
}
