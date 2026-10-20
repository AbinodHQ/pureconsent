import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { consumeLimit } from "./store";
const scrypt = promisify(scryptCallback);
export const cookieName = "pc_session";
export const sessionAge = 7 * 86400;
export const token = () => randomBytes(32).toString("hex");
export const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex"), key = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function checkPassword(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !/^[0-9a-f]{128}$/.test(digest || "")) return false;
  return timingSafeEqual(await scrypt(password, salt, 64) as Buffer, Buffer.from(digest, "hex"));
}
export function appOrigin(request?: Request) {
  if (process.env.APP_ORIGIN) {
    const url = new URL(process.env.APP_ORIGIN);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("APP_ORIGIN must use HTTPS.");
    return url.origin;
  }
  if (process.env.NODE_ENV === "production") throw new Error("APP_ORIGIN is required.");
  return request ? new URL(request.url).origin : "http://localhost:3100";
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin"); if (!origin) return false;
  if (process.env.NODE_ENV !== "production" && !process.env.APP_ORIGIN) {
    try { const p = new URL(origin); return ["localhost", "127.0.0.1"].includes(p.hostname) && (p.host === request.headers.get("host") || p.origin === new URL(request.url).origin); } catch { return false; }
  }
  return origin === appOrigin(request);
}
export async function authLimit(action: string, email: string) {
  return await consumeLimit(`auth:${hashToken(`${action}:${email}`)}`, 8, 900000) && await consumeLimit("auth:global", 300, 900000);
}
