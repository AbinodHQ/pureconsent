import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { AmbitenClient } from '@ambiten/core'
import {
  closeStore,
  createSite,
  getSite,
  listReceipts,
  listSites,
  saveReceipt,
  updateSite
} from '../lib/store'
import { siteInput } from '../lib/domain'
// Only an explicitly named disposable database may be used by this integration test.
if (!process.env.MONGODB_DB?.startsWith('pureconsent_test_'))
  throw new Error(
    'Set MONGODB_DB=pureconsent_test_<unique> and MONGODB_URI for a disposable test database.'
  )
process.env.PURECONSENT_STORAGE = 'ambiten'
const input = siteInput.parse({
  name: 'Integration test',
  origin: 'https://integration.example',
  privacyUrl: 'https://integration.example/privacy'
})
const cleanup = new AmbitenClient({
  uri: process.env.MONGODB_URI!,
  options: { dbName: process.env.MONGODB_DB }
})
try {
  const created = await createSite(input)
  assert.equal((await getSite(created.id))?.origin, input.origin)
  assert.equal((await listSites()).length, 1)
  await assert.rejects(() => createSite(input))
  const updated = await updateSite(created.id, { ...input, name: 'Updated' })
  assert.equal(updated?.version, 2)
  const receipt = {
    id: randomUUID(),
    consentId: randomUUID(),
    version: 2,
    language: 'en' as const,
    action: 'reject' as const,
    choices: { necessary: true as const, analytics: false, marketing: false },
    siteId: created.id,
    ownerId: 'abinod',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000),
    notice: {
      name: 'Updated',
      privacyUrl: input.privacyUrl,
      analytics: input.analytics,
      marketing: input.marketing,
      version: 2
    }
  }
  await saveReceipt(receipt)
  await saveReceipt(receipt)
  assert.equal(
    (await listReceipts(created.id)).length,
    1,
    'Retries are idempotent'
  )
  await saveReceipt({
    ...receipt,
    id: randomUUID(),
    expiresAt: new Date(Date.now() - 1000)
  })
  assert.equal(
    (await listReceipts(created.id)).length,
    1,
    'Expired records are hidden'
  )
  await cleanup.connect()
  const collection = await cleanup.collection('consent_receipts')
  const indexes = await collection.indexes()
  assert.ok(
    indexes.some(index => index.expireAfterSeconds === 0),
    'TTL index exists'
  )
  console.log(
    'PASS: Ambiten connection, site CRUD, duplicate protection, version increment, receipts, idempotency, expiry and TTL indexes.'
  )
} finally {
  await closeStore()
  await cleanup.connect()
  const db = await cleanup.db()
  await db.dropDatabase()
  await cleanup.close()
}
