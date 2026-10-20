import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Collection } from 'mongodb'
import { OWNER, type Site, type SiteInput, type Receipt } from './domain'

type Data = { sites: Site[]; receipts: Receipt[] }
type Database = {
  sites: Collection<Site>
  receipts: Collection<Receipt>
  close: () => Promise<void>
}
const state = globalThis as typeof globalThis & {
  pcDatabase?: Promise<Database>
  pcQueue?: Promise<unknown>
}
export function storageMode () {
  const mode = process.env.PURECONSENT_STORAGE || 'local'
  if (!['local', 'ambiten'].includes(mode))
    throw new Error('Unknown storage adapter.')
  if (process.env.NODE_ENV === 'production' && mode !== 'ambiten') {
    throw new Error('Production requires PURECONSENT_STORAGE=ambiten.')
  }
  return mode
}
async function database (): Promise<Database> {
  if (!state.pcDatabase) {
    state.pcDatabase = (async () => {
      const { AmbitenClient } = await import('@ambiten/core')
      if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.')
      const client = new AmbitenClient({
        uri: process.env.MONGODB_URI,
        options: { dbName: process.env.MONGODB_DB || 'pureconsent' }
      })
      await client.connect()
      const sites = await client.collection<Site>('sites')
      const receipts = await client.collection<Receipt>('consent_receipts')
      await Promise.all([
        sites.createIndex({ id: 1 }, { unique: true }),
        sites.createIndex({ ownerId: 1, origin: 1 }, { unique: true }),
        receipts.createIndex({ id: 1 }, { unique: true }),
        receipts.createIndex({ ownerId: 1, siteId: 1, createdAt: -1 }),
        receipts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      ])
      return { sites, receipts, close: () => client.close() }
    })().catch(error => {
      state.pcDatabase = undefined
      throw error
    })
  }
  return state.pcDatabase
}
export async function closeStore () {
  if (state.pcDatabase) await (await state.pcDatabase).close()
  state.pcDatabase = undefined
}
// Explicit development adapter. Serializes reads/writes in one process and uses atomic rename.
async function local<T> (fn: (data: Data) => T, write = false): Promise<T> {
  const work = async () => {
    const file = path.join(process.cwd(), '.data', 'pureconsent.json')
    let data: Data
    try {
      data = JSON.parse(await readFile(file, 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      data = { sites: [], receipts: [] }
    }
    data.receipts = data.receipts.filter(
      r => new Date(r.expiresAt).getTime() > Date.now()
    )
    const result = fn(data)
    if (write) {
      await mkdir(path.dirname(file), { recursive: true })
      const temp = `${file}.${randomUUID()}.tmp`
      await writeFile(temp, JSON.stringify(data, null, 2))
      await rename(temp, file)
    }
    return result
  }
  const job = (state.pcQueue || Promise.resolve()).then(work)
  state.pcQueue = job.catch(() => undefined)
  return job
}
export async function listSites () {
  if (storageMode() === 'local')
    return local(data => data.sites.filter(s => s.ownerId === OWNER))
  return (await database()).sites
    .find({ ownerId: OWNER }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .toArray()
}
export async function getSite (id: string) {
  if (storageMode() === 'local')
    return local(
      data => data.sites.find(s => s.id === id && s.ownerId === OWNER) || null
    )
  return (await database()).sites.findOne(
    { id, ownerId: OWNER },
    { projection: { _id: 0 } }
  )
}
export async function createSite (input: SiteInput) {
  const now = new Date().toISOString()
  const site: Site = {
    ...input,
    id: randomUUID(),
    ownerId: OWNER,
    version: 1,
    createdAt: now,
    updatedAt: now
  }
  if (storageMode() === 'local')
    return local(data => {
      if (
        data.sites.some(s => s.ownerId === OWNER && s.origin === input.origin)
      )
        throw new Error('This origin is already registered.')
      data.sites.unshift(site)
      return site
    }, true)
  await (await database()).sites.insertOne({ ...site })
  return site
}
export async function updateSite (id: string, input: SiteInput) {
  const updatedAt = new Date().toISOString()
  if (storageMode() === 'local')
    return local(data => {
      const site = data.sites.find(s => s.id === id && s.ownerId === OWNER)
      if (!site) return null
      if (
        data.sites.some(
          s => s.id !== id && s.ownerId === OWNER && s.origin === input.origin
        )
      )
        throw new Error('This origin is already registered.')
      Object.assign(site, input, { version: site.version + 1, updatedAt })
      return site
    }, true)
  return (await database()).sites.findOneAndUpdate(
    { id, ownerId: OWNER },
    { $set: { ...input, updatedAt }, $inc: { version: 1 } },
    { returnDocument: 'after', projection: { _id: 0 } }
  )
}
export async function listReceipts (siteId?: string) {
  if (storageMode() === 'local')
    return local(data =>
      data.receipts
        .filter(r => r.ownerId === OWNER && (!siteId || r.siteId === siteId))
        .reverse()
        .slice(0, 1000)
    )
  return (await database()).receipts
    .find(
      {
        ownerId: OWNER,
        ...(siteId ? { siteId } : {}),
        expiresAt: { $gt: new Date() }
      },
      { projection: { _id: 0 } }
    )
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray()
}
export async function saveReceipt (receipt: Receipt) {
  if (storageMode() === 'local')
    return local(data => {
      if (!data.receipts.some(r => r.id === receipt.id))
        data.receipts.push(receipt)
    }, true)
  await (
    await database()
  ).receipts.updateOne(
    { id: receipt.id },
    { $setOnInsert: receipt },
    { upsert: true }
  )
}
