import {UserError} from './store';
export async function translatePurposes(text:{analytics:string;marketing:string}){
 if(!process.env.DEEPL_API_KEY)throw new UserError('Translation service is not configured. You can enter translations manually.',503);
 const origin=process.env.DEEPL_API_KEY.endsWith(':fx')?'https://api-free.deepl.com':'https://api.deepl.com';
 const entries=await Promise.all(['en','de','fr'].map(async language=>{
  const r=await fetch(`${origin}/v2/translate`,{method:'POST',headers:{Authorization:`DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({text:[text.analytics,text.marketing],target_lang:language==='en'?'EN-GB':language.toUpperCase()}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new UserError('Translation service could not complete the request.',502);
  const data=await r.json();if(!Array.isArray(data.translations)||data.translations.length!==2)throw new UserError('Invalid translation response.',502);
  return [language,{analytics:String(data.translations[0].text),marketing:String(data.translations[1].text)}];
 }));return Object.fromEntries(entries);
}
