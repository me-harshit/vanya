export type GatewayPayment = {
  paymentId: string;
  status: "created" | "authorized" | "captured" | "failed";
  amountPaise: number;
};

/** Everything the rest of the app needs from a payment provider. */
export interface PaymentGateway {
  readonly name: "razorpay" | "mock";
  /** Public key the mobile app needs to open the payment screen. */
  readonly publicKeyId: string;
  createOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }): Promise<{ orderId: string }>;
  /** Checks the signature the app sends after a successful payment. */
  verifyCheckoutSignature(input: { orderId: string; paymentId: string; signature: string }): boolean;
  /** Checks that a webhook really came from the provider. Needs the exact raw request body. */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  /** Payments made against an order, straight from the provider (used when a webhook was missed). */
  fetchOrderPayments(orderId: string): Promise<GatewayPayment[]>;
  refund(input: { paymentId: string; amountPaise: number; receipt: string }): Promise<{ refundId: string; status: "processed" | "pending" }>;
}

export class GatewayError extends Error {}
