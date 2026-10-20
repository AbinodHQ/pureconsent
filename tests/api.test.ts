import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, OPTIONS } from "../app/api/[...path]/route";
import { cookieName, issueSession } from "../lib/auth";

test("API enforces operator auth, CSRF, origins, versioned choices, idempotency and exports", async () => {
  const prior = process.cwd();
  const directory = await mkdtemp(path.join(tmpdir(), "pureconsent-api-test-"));
  const oldEnv = { ...process.env };
  Object.assign(process.env, { NODE_ENV: "test" });
  process.chdir(directory);
  process.env.PURECONSENT_STORAGE = "local";
  process.env.ADMIN_PASSWORD = "integration-test-password";
  process.env.SESSION_SECRET = "integration-test-secret-at-least-32-characters";
  process.env.APP_ORIGIN = "http://localhost:3100";
  const token = issueSession();
  async function call(method: string, endpoint: string, input?: unknown, origin = "http://localhost:3100", authenticated = true) {
    const request = new NextRequest(`http://localhost:3100/api/${endpoint}`, {
      method, headers: {
        "origin": origin, "content-type": "application/json",
        ...(authenticated ? { cookie: `${cookieName}=${token}` } : {})
      }, body: input === undefined ? undefined : JSON.stringify(input)
    });
    const handler = method === "GET" ? GET : method === "PATCH" ? PATCH : method === "OPTIONS" ? OPTIONS : POST;
    return handler(request, { params: Promise.resolve({ path: endpoint.split("?")[0].split("/") }) });
  }
  try {
    assert.equal((await call("GET", "overview", undefined, undefined, false)).status, 401);
    const input = { name: "API test", origin: "https://test.example", privacyUrl: "https://test.example/privacy" };
    assert.equal((await call("POST", "sites", input, "https://evil.example")).status, 403);
    const response = await call("POST", "sites", input);
    assert.equal(response.status, 201);
    const site = await response.json();
    const configPath = `public/${site.id}/config`, receiptPath = `public/${site.id}/consent`;
    assert.equal((await call("GET", configPath, undefined, "https://evil.example", false)).status, 403);
    const config = await call("GET", configPath, undefined, input.origin, false);
    assert.equal(config.status, 200); assert.equal(config.headers.get("access-control-allow-origin"), input.origin);
    assert.equal((await config.json()).ownerId, undefined);
    assert.equal((await call("OPTIONS", receiptPath, undefined, input.origin, false)).status, 204);
    const record = { id: randomUUID(), consentId: randomUUID(), version: 1, language: "en", action: "reject", choices: { necessary: true, analytics: false, marketing: false } };
    assert.equal((await call("POST", receiptPath, { ...record, email: "forbidden" }, input.origin, false)).status, 400);
    assert.equal((await call("POST", receiptPath, { ...record, version: 2 }, input.origin, false)).status, 409);
    assert.equal((await call("POST", receiptPath, record, input.origin, false)).status, 201);
    assert.equal((await call("POST", receiptPath, record, input.origin, false)).status, 201);
    const records = await (await call("GET", "receipts")).json();
    assert.equal(records.length, 1);
    assert.equal(records[0].notice.version, 1);
    assert.equal(records[0].ip, undefined);
    assert.equal(records[0].userAgent, undefined);
    const exported = await call("GET", "receipts?format=csv");
    assert.match(exported.headers.get("content-type")!, /text\/csv/);
    assert.match(await exported.text(), /"reject"/);
    const updated = await (await call("PATCH", `sites/${site.id}`, { ...input, name: "New notice" })).json();
    assert.equal(updated.version, 2);
    assert.equal((await call("POST", receiptPath, { ...record, id: randomUUID() }, input.origin, false)).status, 409);
    assert.equal((await (await call("GET", "receipts")).json())[0].notice.name, "API test");
  } finally {
    process.chdir(prior);
    for (const name of ["NODE_ENV", "PURECONSENT_STORAGE", "ADMIN_PASSWORD", "SESSION_SECRET", "APP_ORIGIN"]) {
      if (oldEnv[name] === undefined) delete process.env[name]; else process.env[name] = oldEnv[name];
    }
    // Delete only the disposable directory created by this test.
    await rm(directory, { recursive: true, force: true });
  }
});
