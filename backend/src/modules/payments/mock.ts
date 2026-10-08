import { createHmac, randomBytes } from "node:crypto";
import { GatewayError, type GatewayPayment, type PaymentGateway } from "./types.js";
import { safeHexEqual } from "./razorpay.js";

/**
 * A fake payment gateway for development and tests. Nothing leaves this computer.
 * It behaves like Razorpay: orders, payments, signed webhooks, refunds.
 * Tests drive it with simulateCapture / simulateFailure and by calling the webhook route.
 */
export class MockGateway implements PaymentGateway {
  readonly name = "mock" as const;
  readonly publicKeyId = "mock_key_id";
  static readonly KEY_SECRET = "mock_key_secret";
  static readonly WEBHOOK_SECRET = "mock_webhook_secret";

  orders = new Map<string, { amountPaise: number; receipt: string; payments: GatewayPayment[] }>();
  refunds: { refundId: string; paymentId: string; amountPaise: number; receipt: string }[] = [];
  /** Tests set this to make the next calls fail, to prove retries work. */
  failRefunds = false;
  failOrders = false;

  async createOrder(input: { amountPaise: number; receipt: string }) {
    if (this.failOrders) throw new GatewayError("mock: order creation failed");
    const orderId = `order_mock_${randomBytes(8).toString("hex")}`;
    this.orders.set(orderId, { amountPaise: input.amountPaise, receipt: input.receipt, payments: [] });
    return { orderId };
  }

  /** What the customer's payment app would send back after paying. */
  checkoutSignature(orderId: string, paymentId: string) {
    return hmac(MockGateway.KEY_SECRET, `${orderId}|${paymentId}`);
  }

  verifyCheckoutSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }) {
    return safeHexEqual(this.checkoutSignature(orderId, paymentId), signature);
  }

  /** Signs a webhook body the way the real provider would. */
  signWebhook(body: string | Buffer) {
    return hmac(MockGateway.WEBHOOK_SECRET, body);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string) {
    return safeHexEqual(this.signWebhook(rawBody), signature);
  }

  async fetchOrderPayments(orderId: string) {
    return this.orders.get(orderId)?.payments ?? [];
  }

  /** The customer pays. Returns the payment id (default amount: the order's amount). */
  simulatePayment(orderId: string, opts: { status?: GatewayPayment["status"]; amountPaise?: number } = {}) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`unknown order ${orderId}`);
    const payment: GatewayPayment = {
      paymentId: `pay_mock_${randomBytes(8).toString("hex")}`,
      status: opts.status ?? "captured",
      amountPaise: opts.amountPaise ?? order.amountPaise,
    };
    order.payments.push(payment);
    return payment;
  }

  async refund(input: { paymentId: string; amountPaise: number; receipt: string }) {
    if (this.failRefunds) throw new GatewayError("mock: refund failed");
    const refundId = `rfnd_mock_${randomBytes(8).toString("hex")}`;
    this.refunds.push({ refundId, ...input });
    return { refundId, status: "processed" as const };
  }
}

function hmac(secret: string, data: string | Buffer) {
  return createHmac("sha256", secret).update(data).digest("hex");
}
