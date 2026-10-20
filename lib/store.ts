import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Collection, Document } from "mongodb";
import type { Site, SiteInput, Receipt } from "./domain";
import { PLANS, effectivePlan, type Plan } from "./plans";
export type Account = {
  id: string; email: string; name: string; workspace: string; passwordHash: string;
  emailVerified: boolean; authVersion: number; createdAt: string; plan: Plan;
  stripeCustomerId?: string; subscriptionId?: string; subscriptionStatus?: string;
  paidThrough?: number; cancelAtPeriodEnd?: boolean; billingSyncedAt?: number;
};
type Session = { tokenHash: string; ownerId: string; authVersion: number; expiresAt: Date | string };
type ActionToken = { tokenHash: string; ownerId: string; kind: "verify" | "reset"; expiresAt: Date | string };
type Usage = { ownerId: string; month: string; count: number };
type Limit = { key: string; count: number; expiresAt: Date | string };
type Lease = { key: string; holder: string; expiresAt: Date | string };
type Data = { sites: Site[]; receipts: Receipt[]; accounts: Account[]; sessions: Session[]; tokens: ActionToken[]; usage: Usage[]; limits: Limit[]; leases: Lease[]; events: string[] };
type Db = { collection: <T extends Document>(name: string) => Promise<Collection<T>>; close: () => Promise<void> };
const state = globalThis as typeof globalThis & { pcDbV2?: Promise<Db>; pcQueueV2?: Promise<unknown> };
export class UserError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function storageMode() {
  const mode = process.env.PURECONSENT_STORAGE || "local";
  if (!["local", "ambiten"].includes(mode)) throw new Error("Unknown storage adapter.");
  if (process.env.NODE_ENV === "production" && mode !== "ambiten") throw new Error("Production requires Ambiten.");
  return mode;
}
async function database() {
  if (!state.pcDbV2) state.pcDbV2 = (async () => {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
    const { AmbitenClient } = await import("@ambiten/core");
    const client = new AmbitenClient({ uri: process.env.MONGODB_URI, options: { dbName: process.env.MONGODB_DB || "pureconsent" } });
    try {
      await client.connect();
      const db: Db = { collection: name => client.collection(name), close: () => client.close() };
      // Do not assign legacy single-operator data to new customers.
      const indexes: [string, Record<string, 1 | -1>, object][] = [
        ["accounts_v2", { id: 1 }, { unique: true }], ["accounts_v2", { email: 1 }, { unique: true }],
        ["accounts_v2", { stripeCustomerId: 1 }, { unique: true, sparse: true }],
        ["sites_v2", { id: 1 }, { unique: true }],
        ["sites_v2", { ownerId: 1, origin: 1 }, { unique: true, partialFilterExpression: { deleted: false } }],
        ["sites_v2", { ownerId: 1, slot: 1 }, { unique: true, partialFilterExpression: { deleted: false } }],
        ["receipts_v2", { siteId: 1, id: 1 }, { unique: true }], ["receipts_v2", { ownerId: 1, siteId: 1, createdAt: -1 }, {}],
        ["receipts_v2", { expiresAt: 1 }, { expireAfterSeconds: 0 }],
        ["sessions_v2", { tokenHash: 1 }, { unique: true }], ["sessions_v2", { expiresAt: 1 }, { expireAfterSeconds: 0 }],
        ["tokens_v2", { tokenHash: 1 }, { unique: true }], ["tokens_v2", { expiresAt: 1 }, { expireAfterSeconds: 0 }],
        ["usage_v2", { ownerId: 1, month: 1 }, { unique: true }],
        ["limits_v2", { key: 1 }, { unique: true }], ["limits_v2", { expiresAt: 1 }, { expireAfterSeconds: 0 }],
        ["leases_v2", { key: 1 }, { unique: true }], ["leases_v2", { expiresAt: 1 }, { expireAfterSeconds: 0 }],
        ["events_v2", { id: 1 }, { unique: true }], ["events_v2", { expiresAt: 1 }, { expireAfterSeconds: 0 }]
      ];
      for (const [name, fields, options] of indexes) await (await db.collection(name)).createIndex(fields, options);
      return db;
    } catch (error) { await client.close().catch(() => {}); throw error; }
  })().catch(error => { state.pcDbV2 = undefined; throw error; });
  return state.pcDbV2;
}
async function col<T extends Document>(name: string) { return (await database()).collection<T>(`${name}_v2`); }
export async function closeStore() { if (state.pcDbV2) await (await state.pcDbV2).close(); state.pcDbV2 = undefined; }
async function local<T>(fn: (data: Data) => T, write = false): Promise<T> {
  const job = (state.pcQueueV2 || Promise.resolve()).then(async () => {
    const file = path.join(process.cwd(), ".data", "saas-v2.json");
    let data: Data;
    try { data = JSON.parse(await readFile(file, "utf8")); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; data = { sites: [], receipts: [], accounts: [], sessions: [], tokens: [], usage: [], limits: [], leases: [], events: [] }; }
    for (const key of ["receipts", "sessions", "tokens", "limits", "leases"] as const) (data[key] as { expiresAt: Date | string }[]) = data[key].filter(item => new Date(item.expiresAt).getTime() > Date.now());
    const result = fn(data);
    if (write) { await mkdir(path.dirname(file), { recursive: true }); const temp = `${file}.${randomUUID()}.tmp`; await writeFile(temp, JSON.stringify(data)); await rename(temp, file); }
    return result;
  });
  state.pcQueueV2 = job.catch(() => {});
  return job;
}
export function safeAccount(account: Account) {
  const { passwordHash: _, authVersion: __, stripeCustomerId: ___, ...safe } = account;
  return { ...safe, effectivePlan: effectivePlan(account) };
}
export async function accountByEmail(email: string) {
  return storageMode() === "local" ? local(d => d.accounts.find(a => a.email === email) || null) : (await col<Account>("accounts")).findOne({ email }, { projection: { _id: 0 } });
}
export async function accountById(id: string) {
  return storageMode() === "local" ? local(d => d.accounts.find(a => a.id === id) || null) : (await col<Account>("accounts")).findOne({ id }, { projection: { _id: 0 } });
}
export async function accountByCustomer(stripeCustomerId: string) {
  return storageMode() === "local" ? local(d => d.accounts.find(a => a.stripeCustomerId === stripeCustomerId) || null) : (await col<Account>("accounts")).findOne({ stripeCustomerId }, { projection: { _id: 0 } });
}
export async function createAccount(input: Pick<Account, "name" | "workspace" | "email" | "passwordHash">) {
  const account: Account = { ...input, id: randomUUID(), emailVerified: false, authVersion: 1, createdAt: new Date().toISOString(), plan: "free" };
  try {
    if (storageMode() === "local") return await local(d => { if (d.accounts.some(a => a.email === input.email)) throw new UserError("An account with this email already exists. Sign in or reset your password.", 409); d.accounts.push(account); return account; }, true);
    await (await col<Account>("accounts")).insertOne({ ...account }); return account;
  } catch (e) { if ((e as { code?: number }).code === 11000) throw new UserError("An account with this email already exists. Sign in or reset your password.", 409); throw e; }
}
export async function updateAccount(id: string, values: Partial<Account>) {
  if (storageMode() === "local") return local(d => { const a = d.accounts.find(a => a.id === id); if (a) Object.assign(a, values); return a || null; }, true);
  return (await col<Account>("accounts")).findOneAndUpdate({ id }, { $set: values }, { returnDocument: "after", projection: { _id: 0 } });
}
export async function saveSession(session: Session) {
  if (storageMode() === "local") return local(d => { d.sessions.push(session); }, true);
  await (await col<Session>("sessions")).insertOne(session);
}
export async function sessionAccount(tokenHash: string) {
  const s = storageMode() === "local" ? await local(d => d.sessions.find(s => s.tokenHash === tokenHash)) : await (await col<Session>("sessions")).findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!s) return null;
  const a = await accountById(s.ownerId);
  return a?.emailVerified && a.authVersion === s.authVersion ? a : null;
}
export async function removeSession(tokenHash: string) {
  if (storageMode() === "local") return local(d => { d.sessions = d.sessions.filter(s => s.tokenHash !== tokenHash); }, true);
  await (await col<Session>("sessions")).deleteOne({ tokenHash });
}
export async function saveToken(value: ActionToken) {
  if (storageMode() === "local") return local(d => { d.tokens = d.tokens.filter(t => t.ownerId !== value.ownerId || t.kind !== value.kind); d.tokens.push(value); }, true);
  const tokens = await col<ActionToken>("tokens"); await tokens.deleteMany({ ownerId: value.ownerId, kind: value.kind }); await tokens.insertOne(value);
}
export async function consumeToken(tokenHash: string, kind: ActionToken["kind"]) {
  if (storageMode() === "local") return local(d => { const item = d.tokens.find(t => t.tokenHash === tokenHash && t.kind === kind); d.tokens = d.tokens.filter(t => t !== item); return item || null; }, true);
  return (await col<ActionToken>("tokens")).findOneAndDelete({ tokenHash, kind, expiresAt: { $gt: new Date() } });
}
export async function listSites(ownerId: string) {
  if (storageMode() === "local") return local(d => d.sites.filter(s => s.ownerId === ownerId && !s.deleted));
  return (await col<Site>("sites")).find({ ownerId, deleted: false }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
}
export async function getSite(id: string, ownerId: string) { const s = await publicSiteById(id); return s?.ownerId === ownerId ? s : null; }
export async function publicSiteById(id: string) {
  if (storageMode() === "local") return local(d => d.sites.find(s => s.id === id && !s.deleted) || null);
  return (await col<Site>("sites")).findOne({ id, deleted: false }, { projection: { _id: 0 } });
}
export async function createSite(ownerId: string, input: SiteInput) {
  const a = await accountById(ownerId); if (!a) throw new UserError("Account not found.", 401);
  const limit = PLANS[effectivePlan(a)];
  if (input.retentionDays > limit.retention) throw new UserError(`Your plan supports up to ${limit.retention} days of retention.`);
  const isLocal = ["localhost", "127.0.0.1"].includes(new URL(input.origin).hostname);
  if (isLocal && process.env.NODE_ENV === "production") throw new UserError("Add a public HTTPS website.");
  const now = new Date().toISOString();
  const base = { ...input, id: randomUUID(), ownerId, version: 1, createdAt: now, updatedAt: now, deleted: false, verificationToken: randomUUID(), verified: isLocal && process.env.NODE_ENV !== "production" };
  if (storageMode() === "local") return local(d => {
    const sites = d.sites.filter(s => s.ownerId === ownerId && !s.deleted);
    if (sites.some(s => s.origin === input.origin)) throw new UserError("This origin is already registered.", 409);
    const slot = Array.from({ length: limit.sites }, (_, i) => i).find(i => !sites.some(s => s.slot === i));
    if (slot === undefined) throw new UserError("Website limit reached. Upgrade your plan or remove a website.", 402);
    const site: Site = { ...base, slot }; d.sites.unshift(site); return site;
  }, true);
  const sites = await col<Site>("sites");
  for (let slot = 0; slot < limit.sites; slot++) {
    try { const site: Site = { ...base, slot }; await sites.insertOne({ ...site }); return site; }
    catch (e) { if ((e as { code?: number }).code !== 11000) throw e; if (await sites.findOne({ ownerId, origin: input.origin, deleted: false })) throw new UserError("This origin is already registered.", 409); }
  }
  throw new UserError("Website limit reached. Upgrade your plan or remove a website.", 402);
}
export async function updateSite(ownerId: string, id: string, input: SiteInput) {
  const current = await getSite(id, ownerId), a = await accountById(ownerId); if (!current || !a) return null;
  if (input.retentionDays > PLANS[effectivePlan(a)].retention) throw new UserError("This retention period requires an upgraded plan.");
  const values = { ...input, updatedAt: new Date().toISOString(), ...(current.origin !== input.origin ? { verified: false, verificationToken: randomUUID() } : {}) };
  if (storageMode() === "local") return local(d => {
    const s = d.sites.find(s => s.id === id && s.ownerId === ownerId && !s.deleted); if (!s) return null;
    if (d.sites.some(s => s.id !== id && s.ownerId === ownerId && s.origin === input.origin && !s.deleted)) throw new UserError("This origin is already registered.", 409);
    Object.assign(s, values, { version: s.version + 1 }); return s;
  }, true);
  return (await col<Site>("sites")).findOneAndUpdate({ id, ownerId, deleted: false }, { $set: values, $inc: { version: 1 } }, { returnDocument: "after", projection: { _id: 0 } });
}
export async function verifySite(ownerId: string, id: string, verificationToken: string) {
  if (storageMode() === "local") return local(d => { const s = d.sites.find(s => s.id === id && s.ownerId === ownerId && s.verificationToken === verificationToken && !s.deleted); if (s) s.verified = true; return !!s; }, true);
  return !!(await (await col<Site>("sites")).updateOne({ id, ownerId, verificationToken, deleted: false }, { $set: { verified: true } })).matchedCount;
}
export async function deleteSite(ownerId: string, id: string) {
  if (storageMode() === "local") return local(d => { const s = d.sites.find(s => s.id === id && s.ownerId === ownerId); if (s) s.deleted = true; }, true);
  await (await col<Site>("sites")).updateOne({ id, ownerId }, { $set: { deleted: true } });
}
export async function listReceipts(ownerId: string, siteId?: string, limit = 1000) {
  if (storageMode() === "local") return local(d => d.receipts.filter(r => r.ownerId === ownerId && (!siteId || r.siteId === siteId)).reverse().slice(0, limit));
  return (await col<Receipt>("receipts")).find({ ownerId, ...(siteId ? { siteId } : {}), expiresAt: { $gt: new Date() } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
}
export async function saveReceipt(receipt: Receipt) {
  if (storageMode() === "local") return local(d => { if (!d.receipts.some(r => r.id === receipt.id && r.siteId === receipt.siteId)) d.receipts.push(receipt); }, true);
  await (await col<Receipt>("receipts")).updateOne({ id: receipt.id, siteId: receipt.siteId }, { $setOnInsert: receipt }, { upsert: true });
}
export async function monthlyUsage(ownerId: string, increment = false) {
  const month = new Date().toISOString().slice(0, 7);
  if (storageMode() === "local") return local(d => { let row = d.usage.find(u => u.ownerId === ownerId && u.month === month); if (!row) { row = { ownerId, month, count: 0 }; d.usage.push(row); } if (increment) row.count++; return row; }, increment);
  const usage = await col<Usage>("usage");
  if (increment) await usage.updateOne({ ownerId, month }, { $inc: { count: 1 } }, { upsert: true }).catch(async e => { if (e.code !== 11000) throw e; await usage.updateOne({ ownerId, month }, { $inc: { count: 1 } }); });
  return await usage.findOne({ ownerId, month }, { projection: { _id: 0 } }) || { ownerId, month, count: 0 };
}
export async function consumeLimit(key: string, max: number, duration: number) {
  const bucket = `${key}:${Math.floor(Date.now() / duration)}`, expiresAt = new Date(Date.now() + duration * 2);
  if (storageMode() === "local") return local(d => { let l = d.limits.find(l => l.key === bucket); if (!l) { l = { key: bucket, count: 0, expiresAt }; d.limits.push(l); } return ++l.count <= max; }, true);
  try { const row = await (await col<Limit>("limits")).findOneAndUpdate({ key: bucket }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, returnDocument: "after" }); return !!row && row.count <= max; }
  catch (e) { if ((e as { code?: number }).code === 11000) return consumeLimit(key, max, duration); throw e; }
}
export async function withLease<T>(key: string, work: () => Promise<T>) {
  const holder = randomUUID(), expiresAt = new Date(Date.now() + 120000); let acquired = false;
  if (storageMode() === "local") acquired = await local(d => { if (d.leases.some(l => l.key === key)) return false; d.leases.push({ key, holder, expiresAt }); return true; }, true);
  else { const leases = await col<Lease>("leases"); await leases.deleteOne({ key, expiresAt: { $lte: new Date() } }); try { await leases.insertOne({ key, holder, expiresAt }); acquired = true; } catch (e) { if ((e as { code?: number }).code !== 11000) throw e; } }
  if (!acquired) throw new UserError("Another update is in progress. Please retry shortly.", 409);
  try { return await work(); }
  finally { if (storageMode() === "local") await local(d => { d.leases = d.leases.filter(l => l.holder !== holder); }, true); else await (await col<Lease>("leases")).deleteOne({ key, holder }); }
}
export async function eventProcessed(id: string, mark = false) {
  if (storageMode() === "local") return local(d => { const exists = d.events.includes(id); if (mark && !exists) d.events.push(id); return exists; }, mark);
  const events = await col("events"); if (mark) await events.updateOne({ id }, { $setOnInsert: { id, expiresAt: new Date(Date.now() + 30 * 86400000) } }, { upsert: true }); return !!await events.findOne({ id });
}
export async function deleteAccount(ownerId: string) {
  if (storageMode() === "local") return local(d => { d.accounts = d.accounts.filter(a => a.id !== ownerId); for (const key of ["sites", "receipts", "sessions", "tokens", "usage"] as const) (d[key] as { ownerId: string }[]) = d[key].filter(v => v.ownerId !== ownerId); }, true);
  await (await col<Account>("accounts")).deleteOne({ id: ownerId });
  for (const name of ["sites", "receipts", "sessions", "tokens", "usage"]) await (await col(name)).deleteMany({ ownerId });
}
