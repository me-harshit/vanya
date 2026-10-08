import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, describe, test } from "node:test";
import { RazorpayGateway } from "../src/modules/payments/razorpay.js";
import { GatewayError } from "../src/modules/payments/types.js";

// These check our Razorpay client against Razorpay's DOCUMENTED formats, with the network stubbed.
// They do not prove it works against the live API: test in Razorpay's test mode once keys exist.

const keys = { keyId: "rzp_test_abc", keySecret: "secret_xyz", webhookSecret: "whsec_123" };
const gw = new RazorpayGateway(keys);
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

type Call = { url: string; init: RequestInit };
function stubFetch(response: { status?: number; body: unknown }) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(response.body), { status: response.status ?? 200 });
  }) as typeof fetch;
  return calls;
}

describe("signatures (Razorpay's documented scheme)", () => {
  test("checkout signature is HMAC-SHA256 of 'order_id|payment_id' with the key secret", () => {
    const sig = hmac(keys.keySecret, "order_1|pay_1");
    assert.equal(gw.verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: sig }), true);
    assert.equal(gw.verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_2", signature: sig }), false);
    assert.equal(gw.verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: "" }), false);
  });

  test("webhook signature is HMAC-SHA256 of the raw body with the webhook secret", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = hmac(keys.webhookSecret, body);
    assert.equal(gw.verifyWebhookSignature(Buffer.from(body), sig), true);
    assert.equal(gw.verifyWebhookSignature(Buffer.from(body + " "), sig), false, "one extra byte must fail");
    assert.equal(gw.verifyWebhookSignature(Buffer.from(body), hmac(keys.keySecret, body)), false, "the key secret is not the webhook secret");
  });
});

describe("requests", () => {
  test("createOrder posts the amount in paise with basic auth", async () => {
    const calls = stubFetch({ body: { id: "order_123" } });
    const r = await gw.createOrder({ amountPaise: 105_000, receipt: "ABCD2345", notes: { bookingId: "b1" } });
    assert.equal(r.orderId, "order_123");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.razorpay.com/v1/orders");
    assert.equal(calls[0].init.method, "POST");
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers.authorization, "Basic " + Buffer.from("rzp_test_abc:secret_xyz").toString("base64"));
    const body = JSON.parse(calls[0].init.body as string);
    assert.equal(body.amount, 105_000);
    assert.equal(body.currency, "INR");
    assert.equal(body.receipt, "ABCD2345");
  });

  test("a receipt longer than Razorpay's 40-character limit is shortened", async () => {
    const calls = stubFetch({ body: { id: "order_1" } });
    await gw.createOrder({ amountPaise: 100, receipt: "x".repeat(60) });
    assert.equal(JSON.parse(calls[0].init.body as string).receipt.length, 40);
  });

  test("fetchOrderPayments reads the payments of an order", async () => {
    const calls = stubFetch({ body: { items: [{ id: "pay_1", status: "captured", amount: 5000 }, { id: "pay_2", status: "failed", amount: 5000 }] } });
    const r = await gw.fetchOrderPayments("order_9");
    assert.equal(calls[0].url, "https://api.razorpay.com/v1/orders/order_9/payments");
    assert.equal(calls[0].init.method, "GET");
    assert.deepEqual(r, [
      { paymentId: "pay_1", status: "captured", amountPaise: 5000 },
      { paymentId: "pay_2", status: "failed", amountPaise: 5000 },
    ]);
  });

  test("refund posts to the payment's refund endpoint with the amount in paise", async () => {
    const calls = stubFetch({ body: { id: "rfnd_1", status: "processed" } });
    const r = await gw.refund({ paymentId: "pay_7", amountPaise: 90_000, receipt: "r1" });
    assert.equal(calls[0].url, "https://api.razorpay.com/v1/payments/pay_7/refund");
    const body = JSON.parse(calls[0].init.body as string);
    assert.equal(body.amount, 90_000);
    assert.deepEqual(r, { refundId: "rfnd_1", status: "processed" });

    stubFetch({ body: { id: "rfnd_2", status: "pending" } });
    assert.equal((await gw.refund({ paymentId: "pay_8", amountPaise: 100, receipt: "r2" })).status, "pending");
  });

  test("an error from Razorpay becomes a GatewayError without leaking the secret", async () => {
    stubFetch({ status: 400, body: { error: { description: "The amount must be at least INR 1.00" } } });
    await assert.rejects(
      () => gw.createOrder({ amountPaise: 1, receipt: "r" }),
      (err: Error) => {
        assert.ok(err instanceof GatewayError);
        assert.match(err.message, /at least INR 1/);
        assert.ok(!err.message.includes(keys.keySecret));
        return true;
      },
    );
  });

  test("a network failure becomes a GatewayError", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNRESET");
    }) as typeof fetch;
    await assert.rejects(() => gw.createOrder({ amountPaise: 100, receipt: "r" }), GatewayError);
  });
});
