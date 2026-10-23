import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHmac} from 'node:crypto';
import {createAccount,updateAccount,accountById} from '../lib/store';
import {checkout,syncBilling,webhook} from '../lib/billing';
import {effectivePlan} from '../lib/plans';
test('billing uses canonical Stripe state, rejects duplicate subscriptions and deduplicates signed events',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'pc-billing-')),prior=process.cwd(),fetcher=globalThis.fetch;process.chdir(dir);process.env.PURECONSENT_STORAGE='local';process.env.STRIPE_SECRET_KEY='sk_test_mock';process.env.STRIPE_WEBHOOK_SECRET='whsec_test';process.env.STRIPE_PRICE_STARTER_MONTH='price_pro';process.env.APP_ORIGIN='http://localhost:3100';
 let status='active',reads=0;
 globalThis.fetch=(async(input:string|URL|Request)=>{const url=String(input);assert.ok(url.startsWith('https://api.stripe.com/v1/'));if(url.includes('/subscriptions?')){reads++;return Response.json({data:[{id:'sub_test',status,cancel_at_period_end:false,items:{data:[{price:{id:'price_pro'},current_period_end:Math.floor(Date.now()/1000)+86400}]}}]});}throw new Error(`Unexpected Stripe request: ${url}`);}) as typeof fetch;
 try{const a=await createAccount({email:'billing@example.test',name:'Billing test',workspace:'Billing',passwordHash:'unused'});await updateAccount(a.id,{stripeCustomerId:'cus_test'});assert.equal(effectivePlan((await syncBilling(a.id))!),'starter');await assert.rejects(()=>checkout(a,'starter',new Request('http://localhost:3100')),/existing subscription/);
 status='past_due';const raw=JSON.stringify({id:'evt_test',type:'customer.subscription.updated',data:{object:{customer:'cus_test',status:'active'}}});const t=Math.floor(Date.now()/1000),signature=`t=${t},v1=${createHmac('sha256','whsec_test').update(`${t}.${raw}`).digest('hex')}`;await webhook(raw,signature);assert.equal(effectivePlan((await accountById(a.id))!),'free');const count=reads;await webhook(raw,signature);assert.equal(reads,count);await assert.rejects(()=>webhook(raw+' ',signature),/signature/);
 }finally{globalThis.fetch=fetcher;process.chdir(prior);await rm(dir,{recursive:true,force:true});}
});
test('Checkout uses the exact EUR monthly or annual price and rejects misconfigured currency',async()=>{
 const prior=process.cwd(),dir=await mkdtemp(path.join(tmpdir(),'pc-offers-')),originalFetch=globalThis.fetch;process.chdir(dir);process.env.PURECONSENT_STORAGE='local';process.env.STRIPE_SECRET_KEY='sk_test_mock';process.env.APP_ORIGIN='http://localhost:3100';
 const offers:Record<string,{amount:number;interval:string}>={};for(const [plan,monthly,yearly] of [['starter',12,99],['business',29,249],['agency',69,599]] as const)for(const interval of ['month','year']){const id=`price_${plan}_${interval}`;process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`]=id;offers[id]={amount:(interval==='year'?yearly:monthly)*100,interval};}
 let currency='eur',lastPrice='';
 globalThis.fetch=(async(input:string|URL|Request,init?:RequestInit)=>{const url=String(input),body=new URLSearchParams(init?.body as string|undefined);if(url.includes('/prices/')){const id=url.split('/').pop()!;return Response.json({active:true,currency,unit_amount:offers[id].amount,recurring:{interval:offers[id].interval,interval_count:1}});}if(url.endsWith('/customers'))return Response.json({id:'cus_'+body.get('metadata[pureconsent_account]')});if(url.includes('/checkout/sessions?')||url.includes('/subscriptions?'))return Response.json({data:[]});if(url.endsWith('/checkout/sessions')){lastPrice=body.get('line_items[0][price]')!;assert.equal(body.get('mode'),'subscription');assert.equal(body.get('managed_payments[enabled]'),'false');return Response.json({url:'https://checkout.stripe.com/test'});}throw new Error(url);}) as typeof fetch;
 try{for(const plan of ['starter','business','agency'] as const)for(const interval of ['month','year'] as const){const a=await createAccount({email:`${plan}-${interval}@test.example`,name:'Test',workspace:'Test',passwordHash:'unused'});await checkout(a,plan,new Request('http://localhost:3100'),interval);assert.equal(lastPrice,`price_${plan}_${interval}`);}
 currency='usd';const a=await createAccount({email:'bad@test.example',name:'Test',workspace:'Test',passwordHash:'unused'});await assert.rejects(()=>checkout(a,'starter',new Request('http://localhost:3100'),'year'),/configuration/);
 }finally{globalThis.fetch=originalFetch;process.chdir(prior);await rm(dir,{recursive:true,force:true});}
});
