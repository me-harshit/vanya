import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { DeviceToken } from "../src/models/DeviceToken.js";
import { User } from "../src/models/User.js";
import { setupTestApp } from "./helpers.js";

let t: Awaited<ReturnType<typeof setupTestApp>>;
before(async () => {
  t = await setupTestApp("vanya_test_me");
});
after(async () => {
  await t.teardown();
});

describe("editing your profile", () => {
  test("a customer can set their name", async () => {
    const { json } = await t.login("9400000001");
    assert.equal(json.user.name, null);
    const r = await t.api("/auth/me", { method: "PATCH", token: json.token, body: { name: "  Asha Rao " } });
    assert.equal(r.status, 200);
    assert.equal(r.json.user.name, "Asha Rao");
    assert.equal((await t.api("/auth/me", { token: json.token })).json.user.name, "Asha Rao");
  });

  test("only the name can change: not the role, not the phone number", async () => {
    const { json } = await t.login("9400000002");
    const r = await t.api("/auth/me", {
      method: "PATCH", token: json.token, body: { name: "Mallory Lane", role: "admin", phone: "9999999999" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.user.role, "customer");
    assert.equal(r.json.user.phone, "9400000002");
    assert.equal((await User.findOne({ phone: "9400000002" }))!.role, "customer");
  });

  test("bad names and missing sign-in are rejected", async () => {
    const { json } = await t.login("9400000003");
    for (const name of ["", "A", "<script>alert(1)</script>", "x".repeat(80), "1234"]) {
      assert.equal((await t.api("/auth/me", { method: "PATCH", token: json.token, body: { name } })).status, 400, name);
    }
    assert.equal((await t.api("/auth/me", { method: "PATCH", token: json.token, body: {} })).status, 400);
    assert.equal((await t.api("/auth/me", { method: "PATCH", body: { name: "Asha Rao" } })).status, 401);
  });
});

describe("push notification devices", () => {
  const token = "ExponentPushToken[abcdefghijklmnop]";

  test("a phone registers its token, and registering again does not duplicate it", async () => {
    const u = await t.login("9400000004");
    const body = { token, platform: "android", appVersion: "1.0.0" };
    assert.equal((await t.api("/me/devices", { token: u.json.token, body })).status, 204);
    assert.equal((await t.api("/me/devices", { token: u.json.token, body })).status, 204);
    assert.equal(await DeviceToken.countDocuments({ token }), 1);
    const doc = await DeviceToken.findOne({ token });
    assert.equal(String(doc!.user), u.json.user.id);
  });

  test("the token moves to the next customer who signs in on that phone", async () => {
    const a = await t.login("9400000004");
    const b = await t.login("9400000005");
    await t.api("/me/devices", { token: a.json.token, body: { token, platform: "ios" } });
    await t.api("/me/devices", { token: b.json.token, body: { token, platform: "ios" } });
    assert.equal(await DeviceToken.countDocuments({ token }), 1);
    assert.equal(String((await DeviceToken.findOne({ token }))!.user), b.json.user.id);
  });

  test("you can only remove your own token", async () => {
    const a = await t.login("9400000004");
    const b = await t.login("9400000005");
    // The token belongs to b now.
    await t.api("/me/devices", { method: "DELETE", token: a.json.token, body: { token } });
    assert.equal(await DeviceToken.countDocuments({ token }), 1, "a cannot remove b's token");
    assert.equal((await t.api("/me/devices", { method: "DELETE", token: b.json.token, body: { token } })).status, 204);
    assert.equal(await DeviceToken.countDocuments({ token }), 0);
  });

  test("validates the token and platform, and needs sign-in", async () => {
    const u = await t.login("9400000006");
    assert.equal((await t.api("/me/devices", { token: u.json.token, body: { token: "short", platform: "android" } })).status, 400);
    assert.equal((await t.api("/me/devices", { token: u.json.token, body: { token, platform: "windows" } })).status, 400);
    assert.equal((await t.api("/me/devices", { body: { token, platform: "android" } })).status, 401);
  });
});
