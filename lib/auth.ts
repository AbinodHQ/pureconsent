import {
  randomBytes,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual
} from 'node:crypto'
import { promisify } from 'node:util'
import { consumeLimit } from './store'
const scrypt = promisify(scryptCallback)
export const cookieName = 'pc_session'
export const sessionAge = 7 * 86400
export const token = () => randomBytes(32).toString('hex')
export const hashToken = (value: string) =>
  createHash('sha256').update(value).digest('hex')
export async function hashPassword (password: string) {
  const salt = randomBytes(16).toString('hex'),
    key = (await scrypt(password, salt, 64)) as Buffer
  return `${salt}:${key.toString('hex')}`
}
export async function checkPassword (password: string, stored: string) {
  const [salt, digest] = stored.split(':')
  if (!salt || !/^[0-9a-f]{128}$/.test(digest || '')) return false
  return timingSafeEqual(
    (await scrypt(password, salt, 64)) as Buffer,
    Buffer.from(digest, 'hex')
  )
}
export function appOrigin (request?: Request) {
  if (process.env.APP_ORIGIN) {
    const url = new URL(process.env.APP_ORIGIN)
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
      throw new Error('APP_ORIGIN must use HTTPS.')
    return url.origin
  }
  if (process.env.NODE_ENV === 'production')
    throw new Error('APP_ORIGIN is required.')
  return request ? new URL(request.url).origin : 'http://localhost:3100'
}
export function sameOrigin(request: Request) {
  const origin=request.headers.get('origin')
  if(!origin)return false
  try {
    const expected=new URL(appOrigin(request)),actual=new URL(origin),target=new URL(request.url)
    if(actual.origin===expected.origin)return true
    const loopback=(host:string)=>['localhost','127.0.0.1','[::1]'].includes(host)
    return process.env.NODE_ENV!=='production' && loopback(actual.hostname) && loopback(expected.hostname) && loopback(target.hostname) && actual.protocol===expected.protocol && actual.port===expected.port && actual.port===target.port
  } catch {return false}
}
export async function authLimit (action: string, email: string) {
  return (
    (await consumeLimit(
      `auth:${hashToken(`${action}:${email}`)}`,
      8,
      900000
    )) && (await consumeLimit('auth:global', 300, 900000))
  )
}
