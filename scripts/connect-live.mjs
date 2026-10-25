import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Explicit opt-in: this provisions a catalogue and webhook, never a payment.
if (!process.argv.includes('--provision')) throw new Error('Pass --provision to configure live billing.')
const file = resolve(process.argv.find(a => a.startsWith('--env='))?.slice(6) || '.env.live.local')
let source = await readFile(file, 'utf8')
const env = Object.fromEntries(source.split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]))
if (!/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || '')) throw new Error('Live Stripe key required.')
async function api(path, body, idempotency) {
 const r = await fetch(`https://api.stripe.com/v1/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},body:body?new URLSearchParams(body):undefined,signal:AbortSignal.timeout(20000)})
 const data = await r.json()
 if(!r.ok) throw new Error(`${path.split('?')[0]}: ${data.error?.message || r.status}`)
 return data
}
async function save(key,value) {
 env[key]=value
 source=source.replace(new RegExp(`^${key}=.*\\r?\\n?`,'m'),'').trimEnd()+`\n${key}=${value}\n`
 await writeFile(file,source)
}
const catalogue=[]
for(const [plan,name,monthly,annual] of [['starter','Starter',1200,9900],['business','Business Pro',2900,24900],['agency','Agency / Studio',6900,59900]]) {
 const product = await api('products',{id:`pureconsent_${plan}_v1`,name:`PureConsent ${name}`,'metadata[pureconsent]':'live-v1'},`pc-live-product-${plan}-v1`).catch(async error=> {
  if(!error.message.includes('already exists')) throw error
  return api(`products/pureconsent_${plan}_v1`)
 })
 if(!product.livemode || !product.active) throw new Error('Invalid live product')
 const prices=[]
 for(const [interval,amount] of [['month',monthly],['year',annual]]) {
  const lookup=`pureconsent_${plan}_${interval}_eur_v1`
  const matches=await api(`prices?lookup_keys[]=${lookup}&limit=100`)
  const price=matches.data[0] || await api('prices',{product:product.id,currency:'eur',unit_amount:String(amount),'recurring[interval]':interval,lookup_key:lookup,'metadata[pureconsent]':'live-v1'},`pc-live-price-${plan}-${interval}-v1`)
  if(!price.livemode || !price.active || price.product!==product.id || price.currency!=='eur' || price.unit_amount!==amount || price.recurring?.interval!==interval || price.recurring.interval_count!==1) throw new Error('Live price mismatch')
  await save(`STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`,price.id)
  prices.push(price.id)
 }
 catalogue.push({product:product.id,prices})
}
const configs=await api('billing_portal/configurations?limit=100')
const existing=configs.data.find(c=>c.metadata?.pureconsent==='live-v1')
const settings={name:'PureConsent Live','metadata[pureconsent]':'live-v1','business_profile[headline]':'Manage your PureConsent subscription','features[invoice_history][enabled]':'true','features[payment_method_update][enabled]':'true','features[customer_update][enabled]':'true','features[customer_update][allowed_updates][0]':'email','features[customer_update][allowed_updates][1]':'address','features[customer_update][allowed_updates][2]':'tax_id','features[subscription_cancel][enabled]':'true','features[subscription_cancel][mode]':'at_period_end','features[subscription_update][enabled]':'true','features[subscription_update][default_allowed_updates][0]':'price','features[subscription_update][proration_behavior]':'create_prorations'}
catalogue.forEach((p,i)=>{settings[`features[subscription_update][products][${i}][product]`]=p.product;p.prices.forEach((price,j)=>settings[`features[subscription_update][products][${i}][prices][${j}]`]=price)})
const portal=await api(`billing_portal/configurations${existing?`/${existing.id}`:''}`,settings,'pc-live-portal-v1')
await save('STRIPE_PORTAL_CONFIGURATION_ID',portal.id)
const url='https://pureconsent.de/api/billing/webhook'
const hooks=await api('webhook_endpoints?limit=100')
let hook=hooks.data.find(h=>h.url===url && h.metadata?.pureconsent==='live-v1')
if(!hook) {
 const body={url,'metadata[pureconsent]':'live-v1',description:'PureConsent live subscription updates'}
 for(const [i,event] of ['checkout.session.completed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed'].entries())body[`enabled_events[${i}]`]=event
 hook=await api('webhook_endpoints',body,'pc-live-webhook-v1')
 await save('STRIPE_WEBHOOK_SECRET',hook.secret)
}
if(!env.STRIPE_WEBHOOK_SECRET || !hook.livemode || hook.status!=='enabled')throw new Error('Live webhook needs signing secret or activation')
console.log(JSON.stringify({live:true,prices:catalogue,portal:portal.id,webhook:hook.id}))
