import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,POST,PATCH,DELETE} from '../app/api/[...path]/route';
import * as store from '../lib/store';
import {hashToken} from '../lib/auth';
import {siteInput} from '../lib/domain';
import {PLANS,offerForPrice} from '../lib/plans';
import {sealReceipt,openReceipt} from '../lib/audit';
test('EUR plan matrix and yearly offer mapping',()=>{
 assert.deepEqual(Object.values(PLANS).map(p=>[p.price,p.annual,p.views,p.sites,p.seats]),[[0,0,1000,1,0],[12,99,25000,1,0],[29,249,100000,3,0],[69,599,500000,15,5]]);
 process.env.STRIPE_PRICE_AGENCY_YEAR='price_agency_year';assert.deepEqual(offerForPrice('price_agency_year'),{plan:'agency',interval:'year'});assert.equal(offerForPrice('unknown'),null);
});
test('audit envelopes authenticate metadata and ciphertext and support key rotation',()=>{
 process.env.AUDIT_KEYS_JSON=JSON.stringify({first:'11'.repeat(32),second:'22'.repeat(32)});process.env.AUDIT_ACTIVE_KEY_ID='first';
 const receipt={id:randomUUID(),consentId:randomUUID(),siteId:randomUUID(),ownerId:randomUUID(),version:1,language:'en' as const,action:'reject' as const,choices:{necessary:true as const,analytics:false,marketing:false},createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+100000),notice:{name:'Private customer',privacyUrl:'https://example.test/privacy',analytics:'Provider A',marketing:'Provider B',version:1}};
 const sealed=sealReceipt(receipt);assert.equal(JSON.stringify(sealed).includes('Private customer'),false);assert.equal(openReceipt(sealed).integrity,'verified');assert.equal(openReceipt(sealed).consentId,receipt.consentId);
 assert.throws(()=>openReceipt({...sealed,ownerId:'other-tenant'}));assert.throws(()=>openReceipt({...sealed,expiresAt:new Date(Date.now()+200000)}));assert.throws(()=>openReceipt({...sealed,encrypted:{...sealed.encrypted,ciphertext:Buffer.from('corrupted').toString('base64')}}));
 process.env.AUDIT_ACTIVE_KEY_ID='second';assert.equal(sealReceipt(receipt).encrypted.keyId,'second');assert.equal(openReceipt(sealed).integrity,'verified');delete process.env.AUDIT_KEYS_JSON;delete process.env.AUDIT_ACTIVE_KEY_ID;
});
test('feature gates, idempotent page views, encrypted storage and five scoped client seats',async()=>{
 const prior=process.cwd(),dir=await mkdtemp(path.join(tmpdir(),'pc-features-'));process.chdir(dir);process.env.PURECONSENT_STORAGE='local';process.env.APP_ORIGIN='http://localhost:3100';delete process.env.RESEND_API_KEY;
 const handlers={GET,POST,PATCH,DELETE};
 async function account(email:string,plan:'free'|'agency'='free'){const a=await store.createAccount({email,name:'Test user',workspace:'Test workspace',passwordHash:'unused'});await store.updateAccount(a.id,{emailVerified:true,plan,subscriptionStatus:'active',paidThrough:Date.now()+86400000});const secret=randomUUID();await store.saveSession({tokenHash:hashToken(secret),ownerId:a.id,authVersion:1,expiresAt:new Date(Date.now()+60000)});return {id:a.id,cookie:`pc_session=${secret}`};}
 async function call(method:keyof typeof handlers,endpoint:string,body?:unknown,cookie='',workspace='',origin='http://localhost:3100'){return handlers[method](new NextRequest(`http://localhost:3100/api/${endpoint}`,{method,headers:{origin,cookie,'Content-Type':'application/json',...(workspace?{'x-pc-workspace':workspace}:{})},body:body===undefined?undefined:JSON.stringify(body)}),{params:Promise.resolve({path:endpoint.split('?')[0].split('/')})});}
 try{
 const free=await account('free@test.example'),agency=await account('agency@test.example','agency'),client=await account('client@test.example');
 const input=siteInput.parse({name:'Website',origin:'http://localhost:4500',privacyUrl:'http://localhost:4500/privacy'});
 assert.equal((await call('POST','sites',{...input,hideBranding:true},free.cookie)).status,402);
 assert.equal((await call('POST','sites',{...input,language:'fr'},free.cookie)).status,402);
 assert.equal((await call('POST','sites',{...input,textColor:'#FFFFFF'},agency.cookie)).status,400);
 const a=await(await call('POST','sites',{...input,hideBranding:true,language:'fr',translations:{fr:{analytics:'Analyse traduite',marketing:'Publicité traduite'}}},agency.cookie)).json();
 const b=await(await call('POST','sites',{...input,origin:'http://localhost:4501'},agency.cookie)).json();
 assert.equal((await(await call('GET',`public/${a.id}/config`,undefined,'','',input.origin)).json()).hideBranding,true);
 const view=randomUUID();for(let i=0;i<2;i++)assert.equal((await call('POST',`public/${a.id}/impression`,{id:view},'','',input.origin)).status,200);
 assert.equal((await store.pageViewUsage(agency.id)).count,1);
 const receipt={id:randomUUID(),consentId:randomUUID(),version:1,language:'fr',action:'reject',choices:{necessary:true,analytics:false,marketing:false}};
 assert.equal((await call('POST',`public/${a.id}/consent`,receipt,'','',input.origin)).status,201);
 const disk=JSON.parse(await readFile(path.join(dir,'.data/saas-v2.json'),'utf8'));assert.ok(disk.receipts[0].encrypted);assert.equal('choices' in disk.receipts[0],false);
 const invitation=await(await call('POST','members',{email:'client@test.example',siteIds:[a.id]},agency.cookie)).json();const invitationToken=new URL(invitation.developmentUrl).searchParams.get('invite');
 assert.equal((await call('POST','invitations/accept',{token:invitationToken},free.cookie)).status,403);
 assert.equal((await call('POST','invitations/accept',{token:invitationToken},client.cookie)).status,200);
 assert.equal((await call('POST','invitations/accept',{token:invitationToken},client.cookie)).status,403);
 const overview=await(await call('GET','overview',undefined,client.cookie,agency.id)).json();assert.deepEqual(overview.sites.map((s:{id:string})=>s.id),[a.id]);assert.equal(overview.workspace.role,'client');
 assert.equal((await call('PATCH',`sites/${b.id}`,input,client.cookie,agency.id)).status,404);
 assert.equal((await call('POST','sites',input,client.cookie,agency.id)).status,403);
 assert.equal((await call('POST','billing/portal',{},client.cookie,agency.id)).status,403);
 assert.equal((await call('GET',`receipts?siteId=${b.id}`,undefined,client.cookie,agency.id)).status,403);
 const audit=await(await call('GET','receipts?format=audit',undefined,client.cookie,agency.id)).json();assert.equal(audit.records[0].integrity,'verified');assert.equal(audit.records[0].notice.analytics,'Analyse traduite');
 for(let i=0;i<4;i++)assert.equal((await call('POST','members',{email:`seat${i}@test.example`,siteIds:[a.id]},agency.cookie)).status,201);
 assert.equal((await call('POST','members',{email:'overflow@test.example',siteIds:[a.id]},agency.cookie)).status,402);
 await store.updateAccount(agency.id,{subscriptionStatus:'canceled'});assert.equal((await call('GET','overview',undefined,client.cookie,agency.id)).status,403);
 const downgraded=await(await call('GET',`public/${a.id}/config`,undefined,'','',input.origin)).json();assert.equal(downgraded.hideBranding,false);assert.equal(downgraded.language,'en');
 const members=await store.memberships(agency.id);await store.removeMember(agency.id,members[0].id);await store.updateAccount(agency.id,{subscriptionStatus:'active'});assert.equal((await call('GET','overview',undefined,client.cookie,agency.id)).status,403);
 }finally{process.chdir(prior);await rm(dir,{recursive:true,force:true});}
});
