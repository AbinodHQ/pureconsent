import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
process.loadEnvFile('.env.local')
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Sandbox key required')
const target = process.env.STRIPE_FORWARD_TO || 'http://localhost:3100/api/billing/webhook'
const parsed = new URL(target)
if (!['127.0.0.1','localhost'].includes(parsed.hostname)) throw new Error('Local forwarding only')
const args=['--yes','@stripe/cli','listen','--events','checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed','--forward-to',target]
const child=spawn(process.platform==='win32'?'npx.cmd':'npx',args,{shell:process.platform==='win32',windowsHide:true,env:{...process.env,STRIPE_API_KEY:process.env.STRIPE_SECRET_KEY},stdio:['ignore','pipe','pipe']})
let pending=''
function output(chunk){pending+=chunk.toString();const lines=pending.split('\n');pending=lines.pop()||'';for(const line of lines){const secret=line.match(/whsec_[A-Za-z0-9]+/)?.[0];if(secret){const env=readFileSync('.env.local','utf8').replace(/^STRIPE_WEBHOOK_SECRET=.*\r?\n?/m,'');writeFileSync('.env.local',env.trimEnd()+`\nSTRIPE_WEBHOOK_SECRET=${secret}\n`)}console.log(line.replace(/(?:whsec_|sk_test_)[A-Za-z0-9]+/g,'[redacted]'))}}
child.stdout.on('data',output);child.stderr.on('data',output)
child.on('exit',code=>process.exit(code||0))
process.on('SIGINT',()=>child.kill('SIGINT'))
