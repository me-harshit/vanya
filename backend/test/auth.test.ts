import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { OtpRequest } from "../src/models/OtpRequest.js";
import { User } from "../src/models/User.js";
import { setupTestApp } from "./helpers.js";

let t: Awaited<ReturnType<typeof setupTestApp>>;
before(async () => {
  t = await setupTestApp("vanya_test_auth");
});
after(async () => {
  await t.teardown();
});

describe("health", () => {
  test("reports ok and database connected", async () => {
    const r = await t.api("/health");
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { ok: true, db: true });
  });
});

describe("OTP login", () => {
  test("request, verify, then /auth/me works with the token", async () => {
    const r = await t.login("9000000001");
    assert.equal(r.status, 200);
    assert.equal(r.json.user.role, "customer");
    assert.ok(r.json.token);

    const me = await t.api("/auth/me", { token: r.json.token });
    assert.equal(me.status, 200);
    assert.equal(me.json.user.phone, "9000000001");
  });

  test("rejects a badly formatted phone number", async () => {
    const r = await t.api("/auth/otp/request", { body: { phone: "12345" } });
    assert.equal(r.status, 400);
    assert.equal(r.json.error.code, "VALIDATION_ERROR");
  });

  test("blocks requesting another code too soon", async () => {
    await t.api("/auth/otp/request", { body: { phone: "9000000002" } });
    const again = await t.api("/auth/otp/request", { body: { phone: "9000000002" } });
    assert.equal(again.status, 429);
    assert.equal(again.json.error.code, "OTP_TOO_SOON");
    assert.ok(again.json.error.retryAfterSeconds > 0);
  });

  test("a wrong code is rejected", async () => {
    await t.api("/auth/otp/request", { body: { phone: "9000000003" } });
    const real = t.sms.codes.get("9000000003")!;
    const wrong = real === "000000" ? "111111" : "000000";
    const r = await t.api("/auth/otp/verify", { body: { phone: "9000000003", code: wrong } });
    assert.equal(r.status, 400);
    assert.equal(r.json.error.code, "OTP_INVALID");
  });

  test("locks after too many wrong attempts, even with the right code", async () => {
    const phone = "9000000004";
    await t.api("/auth/otp/request", { body: { phone } });
    const real = t.sms.codes.get(phone)!;
    const wrong = real === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await t.api("/auth/otp/verify", { body: { phone, code: wrong } });
    const r = await t.api("/auth/otp/verify", { body: { phone, code: real } });
    assert.equal(r.status, 400);
    assert.equal(r.json.error.code, "OTP_INVALID");
  });

  test("a code works only once", async () => {
    const phone = "9000000005";
    await t.api("/auth/otp/request", { body: { phone } });
    const code = t.sms.codes.get(phone)!;
    const first = await t.api("/auth/otp/verify", { body: { phone, code } });
    const second = await t.api("/auth/otp/verify", { body: { phone, code } });
    assert.equal(first.status, 200);
    assert.equal(second.status, 400);
  });

  test("an expired code is rejected", async () => {
    const phone = "9000000006";
    await t.api("/auth/otp/request", { body: { phone } });
    const code = t.sms.codes.get(phone)!;
    await OtpRequest.updateOne({ phone }, { expiresAt: new Date(Date.now() - 1000) });
    const r = await t.api("/auth/otp/verify", { body: { phone, code } });
    assert.equal(r.status, 400);
  });

  test("five simultaneous verifications with the right code: exactly one succeeds", async () => {
    const phone = "9000000007";
    await t.api("/auth/otp/request", { body: { phone } });
    const code = t.sms.codes.get(phone)!;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => t.api("/auth/otp/verify", { body: { phone, code } })),
    );
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.equal(await User.countDocuments({ phone }), 1);
  });
});

describe("authorization", () => {
  test("rejects missing and invalid tokens", async () => {
    assert.equal((await t.api("/auth/me")).status, 401);
    assert.equal((await t.api("/auth/me", { token: "not-a-token" })).status, 401);
  });

  test("admin route: 401 without a token, 403 for a customer, 200 for an admin", async () => {
    assert.equal((await t.api("/admin/ping")).status, 401);

    const customer = await t.login("9000000008");
    assert.equal((await t.api("/admin/ping", { token: customer.json.token })).status, 403);

    await User.updateOne({ phone: "9000000008" }, { role: "admin" });
    assert.equal((await t.api("/admin/ping", { token: customer.json.token })).status, 200);
  });

  test("a deleted user's token stops working", async () => {
    const u = await t.login("9000000009");
    await User.deleteOne({ phone: "9000000009" });
    assert.equal((await t.api("/auth/me", { token: u.json.token })).status, 401);
  });
});
