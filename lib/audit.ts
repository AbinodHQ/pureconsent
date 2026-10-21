import { createCipheriv, createDecipheriv, randomBytes, hkdfSync, createHash } from 'node:crypto';
import type { Receipt } from './domain';
export type EncryptedReceipt = Pick<Receipt,'id'|'siteId'|'ownerId'|'createdAt'|'expiresAt'> & { encrypted: { version: 1; keyId: string; iv: string; tag: string; ciphertext: string } };
function key(keyId:string,ownerId:string) {
  const keys=JSON.parse(process.env.AUDIT_KEYS_JSON || '{}') as Record<string,string>;
  let master:Buffer;
  if(keys[keyId] && /^[a-f0-9]{64}$/i.test(keys[keyId])) master=Buffer.from(keys[keyId],'hex');
  else if(process.env.NODE_ENV!=='production' && keyId==='development') master=createHash('sha256').update(`development-only:${process.cwd()}`).digest();
  else throw new Error('Audit encryption key is missing or invalid.');
  return Buffer.from(hkdfSync('sha256',master,Buffer.from(ownerId),Buffer.from('pureconsent-audit-v1'),32));
}
function aad(row:Pick<Receipt,'id'|'siteId'|'ownerId'|'createdAt'|'expiresAt'>) {return Buffer.from(JSON.stringify([1,row.id,row.siteId,row.ownerId,row.createdAt,new Date(row.expiresAt).toISOString()]));}
export function sealReceipt(row:Receipt):EncryptedReceipt {
  const keyId=process.env.AUDIT_ACTIVE_KEY_ID || (process.env.NODE_ENV==='production'?'':'development');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(keyId,row.ownerId),iv);
  const metadata={id:row.id,siteId:row.siteId,ownerId:row.ownerId,createdAt:row.createdAt,expiresAt:row.expiresAt};
  cipher.setAAD(aad(metadata));const ciphertext=Buffer.concat([cipher.update(JSON.stringify(row),'utf8'),cipher.final()]);
  return {...metadata,encrypted:{version:1,keyId,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}};
}
export function openReceipt(row:EncryptedReceipt|Receipt):Receipt & {integrity:'verified'|'legacy'} {
  if(!('encrypted' in row)) return {...row,integrity:'legacy'};
  if(row.encrypted.version!==1)throw new Error('Unsupported audit envelope.');
  const e=row.encrypted,decipher=createDecipheriv('aes-256-gcm',key(e.keyId,row.ownerId),Buffer.from(e.iv,'base64'));
  decipher.setAAD(aad(row));decipher.setAuthTag(Buffer.from(e.tag,'base64'));
  const receipt=JSON.parse(Buffer.concat([decipher.update(Buffer.from(e.ciphertext,'base64')),decipher.final()]).toString('utf8')) as Receipt;
  return {...receipt,integrity:'verified'};
}
