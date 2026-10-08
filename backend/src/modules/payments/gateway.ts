import { config } from "../../config.js";
import { MockGateway } from "./mock.js";
import { RazorpayGateway } from "./razorpay.js";
import type { PaymentGateway } from "./types.js";

export function createGateway(): PaymentGateway {
  if (config.PAYMENT_GATEWAY === "razorpay") {
    return new RazorpayGateway({
      keyId: config.RAZORPAY_KEY_ID!,
      keySecret: config.RAZORPAY_KEY_SECRET!,
      webhookSecret: config.RAZORPAY_WEBHOOK_SECRET!,
    });
  }
  return new MockGateway();
}
