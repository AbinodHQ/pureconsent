import { entitledConfig } from '@/lib/entitlements';
import { translatePurposes } from '@/lib/translation';
import { NextRequest, NextResponse } from 'next/server';
import { resolveTxt } from 'node:dns/promises';
import { z } from 'zod';
import * as store from '@/lib/store';
import { cookieName, hashToken, token, hashPassword, checkPassword, sameOrigin, appOrigin, sessionAge, authLimit } from '@/lib/auth';
import { sendAction, sendInvitation, assertEmailConfigured } from '@/lib/email';
import { checkout, portal, syncBilling, webhook, requireClosedBilling } from '@/lib/billing';
import { siteInput, consentInput, publicSite, originAllowed, csv } from '@/lib/domain';
import { PLANS, effectivePlan } from '@/lib/plans';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(12).max(128);
const json = (body:unknown,status=200) => NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function body(r:Request) { const text = await r.text(); if(text.length>20000) throw new store.UserError('Request too large.',413); try{return JSON.parse(text);}catch{throw new store.UserError('Invalid JSON.');} }
async function handler(r:NextRequest,ctx:{params:Promise<{path:string[]}>}) {
  const p = (await ctx.params).path, route=p.join('/'), method=r.method;
  try {
    if(route==='billing/webhook' && method==='POST') { const raw=await r.text(); if(raw.length>1000000) return json({error:'Too large'},413); await webhook(raw,r.headers.get('stripe-signature')||''); return json({received:true}); }
    if(p[0]==='public') {
      const s=await store.publicSiteById(p[1]);
      if(!s || !s.verified || !await store.accountById(s.ownerId)) return json({error:'Website unavailable.'},404);
      if(!originAllowed(s,r.headers.get('origin'))) return json({error:'Origin not allowed.'},403);
      const cors={'Access-Control-Allow-Origin':s.origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store'};
      if(method==='OPTIONS') return new NextResponse(null,{status:204,headers:cors});
      if(p[2]==='config' && method==='GET') return NextResponse.json(entitledConfig(s,(await store.accountById(s.ownerId))!),{headers:cors});
      if(p[2]==='impression' && method==='POST'){const {id}=z.object({id:z.string().uuid()}).strict().parse(await body(r));await store.recordImpression(s.ownerId,s.id,id);return NextResponse.json({ok:true},{headers:cors});}
      if(p[2]==='consent' && method==='POST') {
        const input=consentInput.parse(await body(r));
        if(input.version!==s.version) return NextResponse.json({error:'Notice changed. Reload the page.'},{status:409,headers:cors});
        if(!await store.consumeLimit(`receipt:${s.id}:${input.consentId}`,60,60000)) return NextResponse.json({error:'Please retry shortly.'},{status:429,headers:cors});
        const a=(await store.accountById(s.ownerId))!;
        await store.saveReceipt({...input,siteId:s.id,ownerId:s.ownerId,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+Math.min(s.retentionDays,PLANS[effectivePlan(a)].retention)*86400000),notice:{name:s.name,privacyUrl:s.privacyUrl,analytics:entitledConfig(s,a).translations?.[input.language]?.analytics||s.analytics,marketing:entitledConfig(s,a).translations?.[input.language]?.marketing||s.marketing,version:s.version}});
        return NextResponse.json({ok:true},{status:201,headers:cors});
      }
      return json({error:'Not found.'},404);
    }
    if(!['GET','HEAD'].includes(method) && !sameOrigin(r)) return json({error:'Origin not allowed.'},403);
    const session=r.cookies.get(cookieName)?.value || '';
    if(p[0]==='auth' && method==='POST') {
      const action=p[1];
      if(action==='logout') {await store.removeSession(hashToken(session));const out=json({ok:true});out.cookies.set(cookieName,'',{maxAge:0,path:'/'});return out;}
      const input=await body(r);
      if(['verify','reset'].includes(action)) {
        const secret=z.string().regex(/^[a-f0-9]{64}$/).parse(input.token);
        if(!await authLimit(action,hashToken(secret))) return json({error:'Too many attempts.'},429);
        const password=action==='reset'?passwordSchema.parse(input.password):null;
        const item=await store.consumeToken(hashToken(secret),action as 'verify'|'reset');
        if(!item) throw new store.UserError('This link has expired or was already used. Request another email.');
        const a=await store.accountById(item.ownerId);if(!a) throw new store.UserError('Account not found.');
        await store.withLease(`auth:${a.id}`,async()=>{const current=(await store.accountById(a.id))!;await store.updateAccount(a.id,password?{passwordHash:await hashPassword(password),authVersion:current.authVersion+1}:{emailVerified:true});});
        return json({message:action==='verify'?'Email verified. You can now sign in.':'Password changed. Sign in with your new password.'});
      }
      const email=emailSchema.parse(input.email);
      if(!await authLimit(action,email)) return json({error:'Too many attempts. Try again in 15 minutes.'},429);
      let a=await store.accountByEmail(email);
      if(action==='signup') {
        const password=passwordSchema.parse(input.password), name=z.string().trim().min(2).max(80).parse(input.name), workspace=z.string().trim().min(2).max(80).parse(input.workspace);
        if(input.terms!==true) throw new store.UserError('Accept the terms to create your account.');
        assertEmailConfigured();
        a=await store.createAccount({email,name,workspace,passwordHash:await hashPassword(password)});
        try { return json({message:'Check your email to verify your account.',...await sendAction(a,'verify',r)},201); } catch(error) { if(error instanceof store.UserError && error.status===503) return json({message:'Your account was created, but the verification email could not be sent. Use Resend verification to request a new link.',emailDeliveryPending:true},201); throw error; }
      }
      if(action==='forgot' || action==='resend') return json({message:'If an eligible account exists, an email has been sent.',...(a && (action==='forgot'||!a.emailVerified)?await sendAction(a,action==='forgot'?'reset':'verify',r):{})});
      if(action==='login') {
        const password=z.string().max(128).parse(input.password);
        if(!a || !await checkPassword(password,a.passwordHash)) throw new store.UserError('Email or password is incorrect.',401);
        if(!a.emailVerified) throw new store.UserError('Verify your email before signing in. Use Resend verification if needed.',403);
        const value=token();await store.saveSession({tokenHash:hashToken(value),ownerId:a.id,authVersion:a.authVersion,expiresAt:new Date(Date.now()+sessionAge*1000)});
        const out=json({account:store.safeAccount(a)});out.cookies.set(cookieName,value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:sessionAge});return out;
      }
      return json({error:'Not found.'},404);
    }
    const a=await store.sessionAccount(hashToken(session));if(!a) return json({error:'Please sign in.'},401);
    if(route==='workspaces' && method==='GET') return json(await store.sharedWorkspaces(a.id));
    if(route==='invitations/accept' && method==='POST') return json(await store.acceptInvite(a,hashToken(z.string().regex(/^[a-f0-9]{64}$/).parse((await body(r)).token))));
    const workspaceId=r.headers.get('x-pc-workspace')||r.nextUrl.searchParams.get('workspace')||a.id;
    const access=await store.workspaceAccess(a,workspaceId), owner=access.owner, assigned=access.siteIds;
    const isClient=owner.id!==a.id;
    if(isClient && !['overview','sites','receipts'].includes(p[0])) throw new store.UserError('Only the workspace owner can manage billing, seats, and account settings.',403);
    if(isClient && ((route==='sites'&&method==='POST')||method==='DELETE')) throw new store.UserError('Only the owner can add or remove websites.',403);
    if(route==='overview' && method==='GET') return json({account:store.safeAccount(a),workspace:{id:owner.id,name:owner.workspace,role:isClient?'client':'owner',plan:effectivePlan(owner)},sites:(await store.listSites(owner.id)).filter(s=>!assigned||assigned.includes(s.id)),receipts:await store.assignedReceipts(owner.id,assigned),usage:await store.pageViewUsage(owner.id,assigned),storage:store.storageMode(),local:false});
    if(route==='members'&&method==='GET')return json((await store.memberships(a.id)).map(({tokenHash,...m})=>m));
    if(route==='members'&&method==='POST'){
      const input=z.object({email:emailSchema,siteIds:z.array(z.string().uuid()).min(1).max(15)}).parse(await body(r));
      if(!await store.consumeLimit('invites:'+a.id,10,3600000))throw new store.UserError('Please wait before inviting more clients.',429);
      const secret=token(),m=await store.createInvite(a,input.email,[...new Set(input.siteIds)],hashToken(secret));
      try{return json({ok:true,...await sendInvitation(input.email,a.workspace,appOrigin(r)+'/dashboard?invite='+secret)},201);}catch(e){await store.removeMember(a.id,m.id);throw e;}
    }
    if(p[0]==='members'&&p[1]&&method==='DELETE'){await store.removeMember(a.id,p[1]);return json({ok:true});}
    if(route==='sites' && method==='POST') return json(await store.createSite(a.id,siteInput.parse(await body(r))),201);
    if(p[0]==='sites' && p[1]) {
      const s=await store.getSite(p[1],owner.id);if(!s || (assigned&&!assigned.includes(s.id))) return json({error:'Website not found.'},404);
      if(p[2]==='translate'&&method==='POST'){
        if(!PLANS[effectivePlan(owner)].languages)throw new store.UserError('Translation requires Business Pro or Agency.',402);
        if(!await store.consumeLimit('translate:'+owner.id,20,3600000))throw new store.UserError('Translation limit reached. Retry later.',429);
        const input=z.object({analytics:z.string().min(5).max(500),marketing:z.string().min(5).max(500)}).parse(await body(r));return json(await translatePurposes(input));
      }
      if(p[2]==='verify' && method==='POST') {
        if(!await store.consumeLimit(`dns:${s.id}`,10,60000)) throw new store.UserError('Please wait before checking DNS again.',429);
        let records:string[][]=[];try{records=await resolveTxt(`_pureconsent.${new URL(s.origin).hostname}`);}catch{}
        if(!records.some(row=>row.join('')===`pureconsent=${s.verificationToken}`)) throw new store.UserError('TXT record not found yet. DNS changes can take time to propagate.');
        await store.verifySite(owner.id,s.id,s.verificationToken);return json({ok:true});
      }
      if(method==='PATCH') return json(await store.updateSite(owner.id,s.id,siteInput.parse(await body(r))));
      if(method==='DELETE') {await store.deleteSite(owner.id,s.id);return json({ok:true});}
    }
    if(route==='receipts' && method==='GET') {const rows=await store.assignedReceipts(owner.id,assigned,r.nextUrl.searchParams.get('siteId')||undefined);if(r.nextUrl.searchParams.get('format')==='audit'){if(!PLANS[effectivePlan(owner)].audit)throw new store.UserError('Audit exports require Business Pro or Agency.',402);return new NextResponse(JSON.stringify({schema:'pureconsent-audit-v1',exportedAt:new Date().toISOString(),note:'Latest 1,000 retained browser-submitted events. Integrity verification detects envelope alteration, not deletion or visitor identity.',records:rows},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename=consent-audit.json','Cache-Control':'no-store'}});}return r.nextUrl.searchParams.get('format')==='csv'?new NextResponse(csv(rows),{headers:{'Content-Type':'text/csv','Content-Disposition':'attachment; filename="pureconsent-receipts.csv"','Cache-Control':'no-store'}}):json(rows);}
    if(route==='account' && method==='PATCH') {const input=await body(r);return json(store.safeAccount((await store.updateAccount(a.id,{name:z.string().trim().min(2).max(80).parse(input.name),workspace:z.string().trim().min(2).max(80).parse(input.workspace)}))!));}
    if(route==='account/export' && method==='GET') return new NextResponse(JSON.stringify({account:store.safeAccount(a),sites:await store.listSites(a.id),receipts:await store.listReceipts(a.id),note:'Includes the latest 1,000 retained receipts.'},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="pureconsent-account.json"','Cache-Control':'no-store'}});
    if(route==='account' && method==='DELETE') {
      const input=await body(r);if(!await authLimit('delete',a.email)) throw new store.UserError('Please retry later.',429);
      if(!await checkPassword(z.string().max(128).parse(input.password),a.passwordHash)) throw new store.UserError('Password is incorrect.');
      await store.withLease(`billing:${a.id}`,async()=>{await requireClosedBilling((await store.accountById(a.id))!);await store.deleteAccount(a.id);});
      const out=json({ok:true});out.cookies.set(cookieName,'',{maxAge:0,path:'/'});return out;
    }
    if(route==='account/password' && method==='POST') {
      const input=await body(r);if(!await authLimit('password',a.email)) throw new store.UserError('Try again later.',429);
      if(!await checkPassword(z.string().max(128).parse(input.currentPassword),a.passwordHash)) throw new store.UserError('Current password is incorrect.');
      const next=passwordSchema.parse(input.password);await store.withLease(`auth:${a.id}`,async()=>{const current=(await store.accountById(a.id))!;await store.updateAccount(a.id,{passwordHash:await hashPassword(next),authVersion:current.authVersion+1});});return json({ok:true});
    }
    if(route==='billing/checkout' && method==='POST') {const input=z.object({plan:z.enum(['starter','business','agency']),interval:z.enum(['month','year']).default('month')}).parse(await body(r));return json(await checkout(a,input.plan,r,input.interval));}
    if(route==='billing/portal' && method==='POST') return json(await portal(a,r));
    if(route==='billing/sync' && method==='POST') {if(!await store.consumeLimit(`sync:${a.id}`,10,60000)) throw new store.UserError('Please retry later.',429);return json(store.safeAccount((await syncBilling(a.id))!));}
    return json({error:'Not found.'},404);
  } catch(error) {
    if(error instanceof z.ZodError) return json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},400);
    if(error instanceof store.UserError) return json({error:error.message},error.status);
    if((error as {code?:number}).code===11000) return json({error:'This entry already exists.'},409);
    console.error('PureConsent request failed:',error instanceof Error?error.message:'Unknown error');return json({error:'The service is temporarily unavailable. Please retry.'},503);
  }
}
export {handler as GET,handler as POST,handler as PATCH,handler as DELETE,handler as OPTIONS};
