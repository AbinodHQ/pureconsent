import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = process.cwd()
const envPath = resolve(root, '.env.local')
let previous = await readFile(envPath, 'utf8').catch(() => '')
const env = Object.fromEntries(previous.split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]))
const secret = env.STRIPE_SECRET_KEY
if (!secret?.startsWith('sk_test_')) throw new Error('Sandbox key required in .env.local')
async function api(path, body) {
 const response = await fetch(`https://api.stripe.com/v1/${path}`, {method:body?'POST':'GET',headers:{Authorization:`Bearer ${secret}`,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:body?new URLSearchParams(body):undefined})
 const data = await response.json()
 if (!response.ok) throw new Error(`${path}: ${data.error?.message || response.status}`)
 return data
}
const account = await api('account')
if(account.id !== 'acct_1UShjRIGVLNZKarI')throw new Error('Unexpected Stripe account')
const offers=[['STARTER',1200,9900],['BUSINESS',2900,24900],['AGENCY',6900,59900]]
const products=[]
for(const [plan,monthly,yearly] of offers){
 const prices=[];let product
 for(const [interval,amount] of [['MONTH',monthly],['YEAR',yearly]]){
  const id=env[`STRIPE_PRICE_${plan}_${interval}`];if(!id)throw new Error('Missing price ID')
  const p=await api(`prices/${id}`)
  if(p.livemode||!p.active||p.currency!=='eur'||p.unit_amount!==amount||p.recurring?.interval!==interval.toLowerCase()||p.recurring?.interval_count!==1)throw new Error(`Incorrect ${plan} ${interval} price`)
  if(product&&product!==p.product)throw new Error('Offers must use the same product')
  product=p.product;prices.push(p.id)
 }
 products.push({product,prices})
}
const existing=await api('billing_portal/configurations?limit=100')
let config=existing.data.find(c=>c.metadata?.pureconsent==='sandbox-v1')
const settings={name:'PureConsent Sandbox','metadata[pureconsent]':'sandbox-v1','business_profile[headline]':'Manage your PureConsent subscription','features[invoice_history][enabled]':'true','features[payment_method_update][enabled]':'true','features[customer_update][enabled]':'true','features[customer_update][allowed_updates][0]':'email','features[customer_update][allowed_updates][1]':'address','features[customer_update][allowed_updates][2]':'tax_id','features[subscription_cancel][enabled]':'true','features[subscription_cancel][mode]':'at_period_end','features[subscription_update][enabled]':'true','features[subscription_update][default_allowed_updates][0]':'price','features[subscription_update][proration_behavior]':'create_prorations'}
products.forEach((p,i)=>{settings[`features[subscription_update][products][${i}][product]`]=p.product;p.prices.forEach((price,j)=>settings[`features[subscription_update][products][${i}][prices][${j}]`]=price)})
config=await api(`billing_portal/configurations${config?`/${config.id}`:''}`,settings)
previous=previous.replace(/^STRIPE_PORTAL_CONFIGURATION_ID=.*\r?\n?/m,'')
await writeFile(envPath,`${previous.trimEnd()}\nSTRIPE_PORTAL_CONFIGURATION_ID=${config.id}\n`)
console.log(JSON.stringify({account:account.id,pricesVerified:6,portal:config.id,live:false}))
