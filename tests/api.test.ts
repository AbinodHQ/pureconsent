import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,POST,PATCH,DELETE,OPTIONS} from '../app/api/[...path]/route';
import {accountByEmail,updateAccount} from '../lib/store';
test('customer lifecycle, tenant isolation, atomic plan quotas, consent and password recovery',async()=>{
 const prior=process.cwd(),dir=await mkdtemp(path.join(tmpdir(),'pureconsent-saas-'));process.chdir(dir);process.env.PURECONSENT_STORAGE='local';process.env.APP_ORIGIN='http://localhost:3100';delete process.env.RESEND_API_KEY;delete process.env.STRIPE_SECRET_KEY;
 const handlers={GET,POST,PATCH,DELETE,OPTIONS};
 async function call(method:keyof typeof handlers,endpoint:string,input?:unknown,cookie='',origin='http://localhost:3100') {return handlers[method](new NextRequest(`http://localhost:3100/api/${endpoint}`,{method,headers:{origin,'content-type':'application/json',cookie},body:input===undefined?undefined:JSON.stringify(input)}),{params:Promise.resolve({path:endpoint.split('?')[0].split('/')})});}
 async function signup(email:string){let r=await call('POST','auth/signup',{email,name:'Test customer',workspace:'Test workspace',password:'long test password',terms:true});assert.equal(r.status,201);const data=await r.json();const token=new URL(data.developmentUrl).searchParams.get('token');assert.equal((await call('POST','auth/login',{email,password:'long test password'})).status,403);assert.equal((await call('POST','auth/verify',{token})).status,200);assert.equal((await call('POST','auth/verify',{token})).status,400);r=await call('POST','auth/login',{email,password:'long test password'});assert.equal(r.status,200);return r.headers.get('set-cookie')!.split(';')[0];}
 try{
 assert.equal((await call('GET','overview')).status,401);
 const alice=await signup('alice@example.test'),bob=await signup('bob@example.test');
 const input={name:'Test site',origin:'http://localhost:4000',privacyUrl:'http://localhost:4000/privacy'};
 assert.equal((await call('POST','sites',input,alice,'https://evil.test')).status,403);
 const results=await Promise.all([call('POST','sites',input,alice),call('POST','sites',{...input,origin:'http://localhost:4001'},alice)]);assert.equal(results.filter(r=>r.status===201).length,1);assert.equal(results.filter(r=>r.status===402).length,1);
 const site=await results.find(r=>r.status===201)!.json();
 assert.equal((await call('PATCH',`sites/${site.id}`,input,bob)).status,404);
 const overview=await (await call('GET','overview',undefined,bob)).json();assert.equal(overview.sites.length,0);assert.equal('passwordHash' in overview.account,false);
 let r=await call('GET',`public/${site.id}/config`,undefined,'',site.origin);assert.equal(r.status,200);assert.equal('verificationToken' in await r.json(),false);
 assert.equal((await call('GET',`public/${site.id}/config`,undefined,'','https://evil.test')).status,403);
 const receipt={id:randomUUID(),consentId:randomUUID(),version:1,language:'en',action:'reject',choices:{necessary:true,analytics:false,marketing:false}};
 for(let i=0;i<2;i++)assert.equal((await call('POST',`public/${site.id}/consent`,receipt,'',site.origin)).status,201);
 assert.equal((await (await call('GET','receipts',undefined,alice)).json()).length,1);assert.equal((await (await call('GET','receipts',undefined,bob)).json()).length,0);
 assert.equal((await call('POST',`public/${site.id}/consent`,{...receipt,version:2},'',site.origin)).status,409);
 assert.equal((await call('POST','billing/checkout',{plan:'starter'},alice)).status,503);
 const customer=(await accountByEmail('alice@example.test'))!;await updateAccount(customer.id,{plan:'business',subscriptionStatus:'active',paidThrough:Date.now()+100000});
 assert.equal((await call('POST','sites',{...input,origin:'https://public.example.test'},alice)).status,201);
 const second=(await (await call('GET','overview',undefined,alice)).json()).sites.find((s:{origin:string})=>s.origin.startsWith('https'));
 assert.equal((await call('GET',`public/${second.id}/config`,undefined,'',second.origin)).status,404);
 const reset=await (await call('POST','auth/forgot',{email:'alice@example.test'})).json();const resetToken=new URL(reset.developmentUrl).searchParams.get('token');assert.equal((await call('POST','auth/reset',{token:resetToken,password:'new long password'})).status,200);assert.equal((await call('GET','overview',undefined,alice)).status,401);assert.equal((await call('POST','auth/reset',{token:resetToken,password:'new long password'})).status,400);
 assert.equal((await call('DELETE','account',{password:'long test password'},bob)).status,200);assert.equal((await call('GET','overview',undefined,bob)).status,401);
 const loggedIn=await call('POST','auth/login',{email:'alice@example.test',password:'new long password'});const freshCookie=loggedIn.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await call('POST','auth/logout',undefined,freshCookie)).status,200);assert.equal((await call('GET','overview',undefined,freshCookie)).status,401);
 }finally{process.chdir(prior);await rm(dir,{recursive:true,force:true});}
});
