import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

class CaptureSms {
  codes = new Map<string, string>();
  async sendOtp(phone: string, code: string) {
    this.codes.set(phone, code);
  }
}

export type Api = (
  path: string,
  opts?: { method?: string; body?: unknown; token?: string },
) => Promise<{ status: number; json: any }>;

/**
 * Starts the app against its own test database. Test files run in parallel, so every file
 * passes a different database name. Only databases starting with "vanya_test" are ever dropped.
 */
export async function setupTestApp(dbName: string) {
  assert.ok(dbName.startsWith("vanya_test"), "test databases must start with vanya_test");
  process.env.MONGODB_DB = dbName; // must be set before the config module loads

  const { createApp } = await import("../src/app.js");
  const { connectDb, disconnectDb } = await import("../src/db.js");
  const mongoose = (await import("mongoose")).default;
  const { User } = await import("../src/models/User.js");

  const conn = await connectDb();
  assert.equal(conn.name, dbName, "connected to the wrong database");
  await conn.dropDatabase();
  await mongoose.syncIndexes(); // dropping the database also dropped the indexes

  const { MockGateway } = await import("../src/modules/payments/mock.js");
  const { createBookingService } = await import("../src/modules/bookings/bookings.service.js");
  const gateway = new MockGateway();
  const bookings = createBookingService(gateway);

  const sms = new CaptureSms();
  const server = createApp({ sms, bookings }).listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const api: Api = async (path, opts = {}) => {
    const res = await fetch(base + path, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: {
        "content-type": "application/json",
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text(); // some replies (204 No Content) have no body
    return { status: res.status, json: (text ? JSON.parse(text) : null) as any };
  };

  /** Signs in with an OTP and returns the verify response. */
  async function login(phone: string) {
    const req = await api("/auth/otp/request", { body: { phone } });
    assert.equal(req.status, 200);
    return api("/auth/otp/verify", { body: { phone, code: sms.codes.get(phone)! } });
  }

  /** Signs in and makes the user an admin. Returns the token. */
  async function loginAdmin(phone: string) {
    const r = await login(phone);
    await User.updateOne({ phone }, { role: "admin" });
    return r.json.token as string;
  }

  async function teardown() {
    await new Promise<void>((r) => server.close(() => r()));
    if (mongoose.connection.name.startsWith("vanya_test")) await mongoose.connection.dropDatabase();
    await disconnectDb();
  }

  /** Calls the payment webhook the way the provider would, with a valid signature (or a bad one). */
  async function webhook(body: object, opts: { signature?: string } = {}) {
    const raw = JSON.stringify(body);
    const res = await fetch(`${base}/payments/razorpay/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": opts.signature ?? gateway.signWebhook(raw) },
      body: raw,
    });
    return { status: res.status, json: (await res.json()) as any };
  }

  return { api, login, loginAdmin, sms, teardown, gateway, bookings, webhook };
}
