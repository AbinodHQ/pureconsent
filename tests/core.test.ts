import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { siteInput, consentInput, originAllowed, csv } from "../lib/domain";
import { authConfigured, checkPassword, issueSession, validSession, rateLimit } from "../lib/auth";

test("origins normalize while rejecting insecure public hosts and invalid schemes", () => {
  const base = { name: "Abinod", origin: "https://EXAMPLE.com/path", privacyUrl: "https://example.com/privacy" };
  const parsed = siteInput.parse(base);
  assert.equal(parsed.origin, "https://example.com");
  assert.equal(siteInput.safeParse({ ...base, origin: "http://example.com" }).success, false);
  assert.equal(siteInput.safeParse({ ...base, origin: "javascript:alert(1)" }).success, false);
  assert.equal(siteInput.safeParse({ ...base, privacyUrl: "javascript:alert(1)" }).success, false);
  assert.equal(siteInput.safeParse({ ...base, origin: "http://localhost:3100" }).success, true);
  assert.equal(originAllowed({ ...parsed, id: "", ownerId: "", version: 1, createdAt: "", updatedAt: "" }, "https://sub.example.com"), false);
  assert.equal(originAllowed({ ...parsed, id: "", ownerId: "", version: 1, createdAt: "", updatedAt: "" }, null), false);
});
test("receipt schema rejects identity fields, inconsistent choices, and necessary=false", () => {
  const input = { id: randomUUID(), consentId: randomUUID(), version: 1, language: "en", action: "reject", choices: { necessary: true, analytics: false, marketing: false } };
  assert.equal(consentInput.safeParse(input).success, true);
  assert.equal(consentInput.safeParse({ ...input, ip: "127.0.0.1" }).success, false);
  assert.equal(consentInput.safeParse({ ...input, choices: { ...input.choices, analytics: true } }).success, false);
  assert.equal(consentInput.safeParse({ ...input, choices: { ...input.choices, necessary: false } }).success, false);
  assert.equal(consentInput.safeParse({ ...input, action: "accept" }).success, false);
});
test("operator sessions require configured secrets and resist tampering and expiry", () => {
  const priorPassword = process.env.ADMIN_PASSWORD, priorSecret = process.env.SESSION_SECRET;
  process.env.ADMIN_PASSWORD = "test-password-not-for-use";
  process.env.SESSION_SECRET = "a".repeat(40);
  try {
    assert.equal(authConfigured(), true);
    assert.equal(checkPassword("test-password-not-for-use"), true);
    assert.equal(checkPassword("wrong"), false);
    const token = issueSession();
    assert.equal(validSession(token), true);
    assert.equal(validSession(`${token}x`), false);
    assert.equal(validSession(`1.${token.split(".")[1]}`), false);
    assert.equal(validSession(), false);
  } finally {
    if (priorPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = priorPassword;
    if (priorSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = priorSecret;
  }
});
test("rate limits reject excess requests and CSV exports keep a stable schema", () => {
  const key = randomUUID();
  assert.equal(rateLimit(key, 2), true); assert.equal(rateLimit(key, 2), true); assert.equal(rateLimit(key, 2), false);
  assert.equal(csv([]), "id,siteId,createdAt,action,version,language,analytics,marketing");
});
