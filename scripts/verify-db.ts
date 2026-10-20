import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { AmbitenClient } from '@ambiten/core'
import {
  createAccount,
  updateAccount, saveSession, sessionAccount, saveToken, consumeToken, monthlyUsage,
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
  const a = await createAccount({email:'db@example.test',name:'DB test',workspace:'Test',passwordHash:'unused'})
  const b = await createAccount({email:'other@example.test',name:'Other test',workspace:'Other',passwordHash:'unused'})
  await assert.rejects(()=>createAccount({email:a.email,name:'Duplicate',workspace:'Test',passwordHash:'unused'}))
  const concurrent = await Promise.allSettled([createSite(b.id,input),createSite(b.id,{...input,origin:'https://second.example'})])
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1,'Unique slots enforce plan quotas under concurrency')
  await updateAccount(a.id,{emailVerified:true})
  await saveSession({tokenHash:'test-hash',ownerId:a.id,authVersion:1,expiresAt:new Date(Date.now()+60000)})
  assert.equal((await sessionAccount('test-hash'))?.id,a.id)
  await updateAccount(a.id,{authVersion:2})
  assert.equal(await sessionAccount('test-hash'),null)
  await saveToken({tokenHash:'test-action',ownerId:a.id,kind:'verify',expiresAt:new Date(Date.now()+60000)})
  const tokens = await Promise.all([consumeToken('test-action','verify'),consumeToken('test-action','verify')])
  assert.equal(tokens.filter(Boolean).length,1,'Action token consumption is atomic')
  await Promise.all(Array.from({length:8},()=>monthlyUsage(a.id,true)))
  assert.equal((await monthlyUsage(a.id)).count,8)
  const created = await createSite(a.id, input)
  assert.equal(await getSite(created.id,b.id),null,'Tenant isolation')
  assert.equal((await getSite(created.id, a.id))?.origin, input.origin)
  assert.equal((await listSites(a.id)).length, 1)
  await assert.rejects(() => createSite(a.id, input))
  const updated = await updateSite(a.id, created.id, { ...input, name: 'Updated' })
  assert.equal(updated?.version, 2)
  const receipt = {
    id: randomUUID(),
    consentId: randomUUID(),
    version: 2,
    language: 'en' as const,
    action: 'reject' as const,
    choices: { necessary: true as const, analytics: false, marketing: false },
    siteId: created.id,
    ownerId: a.id,
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
    (await listReceipts(a.id, created.id)).length,
    1,
    'Retries are idempotent'
  )
  await saveReceipt({
    ...receipt,
    id: randomUUID(),
    expiresAt: new Date(Date.now() - 1000)
  })
  assert.equal(
    (await listReceipts(a.id, created.id)).length,
    1,
    'Expired records are hidden'
  )
  await cleanup.connect()
  const collection = await cleanup.collection('receipts_v2')
  const indexes = await collection.indexes()
  assert.ok(
    indexes.some(index => index.expireAfterSeconds === 0),
    'TTL index exists'
  )
  console.log(
    'PASS: Ambiten accounts, tenant isolation, concurrent quotas, session revocation, atomic tokens, usage, site CRUD, receipts, expiry and TTL indexes.'
  )
} finally {
  await closeStore()
  await cleanup.connect()
  const db = await cleanup.db()
  await db.dropDatabase()
  await cleanup.close()
}
