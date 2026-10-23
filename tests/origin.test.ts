import test from 'node:test'
import assert from 'node:assert/strict'
import {sameOrigin} from '../lib/auth'
test('local loopback aliases work without allowing foreign origins or weakening production CSRF checks',()=>{
 const env={...process.env}
 try {
  process.env.APP_ORIGIN='http://localhost:3100';Object.assign(process.env,{NODE_ENV:'development'})
  const check=(origin:string,url='http://127.0.0.1:3100/api/auth/login')=>sameOrigin(new Request(url,{headers:{origin}}))
  assert.equal(check('http://127.0.0.1:3100'),true)
  assert.equal(check('http://localhost:3100'),true)
  assert.equal(check('http://localhost:9999'),false)
  assert.equal(check('https://evil.test'),false)
  assert.equal(check('http://127.0.0.1:3100','https://evil.test/api/auth/login'),false)
  Object.assign(process.env,{NODE_ENV:'production'});process.env.APP_ORIGIN='https://pureconsent.de'
  assert.equal(check('http://127.0.0.1:3100'),false)
  assert.equal(check('https://pureconsent.de','https://pureconsent.de/api/auth/login'),true)
 }finally{for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env)}
})
