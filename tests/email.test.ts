import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sendAction, sendInvitation, assertEmailConfigured } from '../lib/email'
import { createAccount, consumeToken } from '../lib/store'
import { hashToken } from '../lib/auth'
test('Resend delivers single-use verification and recovery links without exposing them in API results',async()=>{
 const cwd=process.cwd(),dir=await mkdtemp(join(tmpdir(),'pc-email-')),prior={...process.env},fetchBefore=globalThis.fetch
 const messages:Array<{subject:string;text:string;html:string;from:string}>=[]
 try {
  process.chdir(dir);process.env.PURECONSENT_STORAGE='local';process.env.APP_ORIGIN='https://pureconsent.de';process.env.RESEND_API_KEY='test-only';process.env.EMAIL_FROM='PureConsent <noreply@pureconsent.de>'
  globalThis.fetch=async(_url,init)=>{messages.push(JSON.parse(init!.body as string));return Response.json({id:'email-test'})}
  const account=await createAccount({name:'Email test',workspace:'Test',email:'mail@example.test',passwordHash:'unused'})
  for(const kind of ['verify','reset'] as const){
   assert.deepEqual(await sendAction(account,kind,new Request('https://pureconsent.de')), {})
   const message=messages.at(-1)!,match=message.text.match(/https:\/\/pureconsent\.de\/auth\/\w+\?token=([a-f0-9]{64})/)
   assert.ok(match);assert.equal(message.from,process.env.EMAIL_FROM);assert.match(message.html,/PureConsent/)
   assert.ok(await consumeToken(hashToken(match[1]),kind));assert.equal(await consumeToken(hashToken(match[1]),kind),null)
  }
  await sendInvitation(account.email,'<unsafe workspace>','https://pureconsent.de/dashboard?invite=test')
  assert.match(messages.at(-1)!.html,/&lt;unsafe workspace&gt;/)
  globalThis.fetch=async()=>Response.json({error:'rejected'},{status:403})
  await assert.rejects(()=>sendAction(account,'verify',new Request('https://pureconsent.de')),/Email could not be sent/)
  delete process.env.RESEND_API_KEY;Object.assign(process.env,{NODE_ENV:'production'});assert.throws(()=>assertEmailConfigured(),/not configured/)
 }finally{globalThis.fetch=fetchBefore;process.chdir(cwd);for(const k of Object.keys(process.env))if(!(k in prior))delete process.env[k];Object.assign(process.env,prior);await rm(dir,{recursive:true,force:true})}
})
