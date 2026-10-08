import { createHmac, timingSafeEqual } from "node:crypto";
import { GatewayError, type GatewayPayment, type PaymentGateway } from "./types.js";

/**
 * Razorpay over its REST API (no SDK needed).
 *
 * NOT TESTED AGAINST THE LIVE API YET: this was written from Razorpay's documentation before
 * API keys were available. Test every method in Razorpay's test mode before going live.
 * Also set payments to AUTO-CAPTURE in the Razorpay dashboard, otherwise payments stay
 * "authorized" and bookings are never confirmed.
 */
export class RazorpayGateway implements PaymentGateway {
  readonly name = "razorpay" as const;
  readonly publicKeyId: string;
  private auth: string;

  constructor(private keys: { keyId: string; keySecret: string; webhookSecret: string }) {
    this.publicKeyId = keys.keyId;
    this.auth = "Basic " + Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64");
  }

  private async call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`https://api.razorpay.com/v1${path}`, {
        method,
        headers: { authorization: this.auth, "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new GatewayError(`Razorpay is not reachable: ${(err as Error).message}`);
    }
    const json = (await res.json().catch(() => ({}))) as { error?: { description?: string } } & T;
    if (!res.ok) throw new GatewayError(`Razorpay error ${res.status}: ${json.error?.description ?? "unknown error"}`);
    return json;
  }

  async createOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
    const order = await this.call<{ id: string }>("POST", "/orders", {
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40), // Razorpay allows at most 40 characters
      notes: input.notes,
    });
    return { orderId: order.id };
  }

  verifyCheckoutSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }) {
    return safeHexEqual(hmac(this.keys.keySecret, `${orderId}|${paymentId}`), signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string) {
    return safeHexEqual(hmac(this.keys.webhookSecret, rawBody), signature);
  }

  async fetchOrderPayments(orderId: string): Promise<GatewayPayment[]> {
    const r = await this.call<{ items: { id: string; status: GatewayPayment["status"]; amount: number }[] }>(
      "GET",
      `/orders/${encodeURIComponent(orderId)}/payments`,
    );
    return r.items.map((p) => ({ paymentId: p.id, status: p.status, amountPaise: p.amount }));
  }

  async refund(input: { paymentId: string; amountPaise: number; receipt: string }) {
    const r = await this.call<{ id: string; status: string }>("POST", `/payments/${encodeURIComponent(input.paymentId)}/refund`, {
      amount: input.amountPaise,
      speed: "normal",
      receipt: input.receipt.slice(0, 40),
    });
    return { refundId: r.id, status: r.status === "processed" ? ("processed" as const) : ("pending" as const) };
  }
}

function hmac(secret: string, data: string | Buffer) {
  return createHmac("sha256", secret).update(data).digest("hex");
}

export function safeHexEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
