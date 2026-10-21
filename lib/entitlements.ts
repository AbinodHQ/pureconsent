import { PLANS, effectivePlan } from './plans';
import type { Account } from './store';
import { UserError } from './store';
import { publicSite, type Site, type SiteInput } from './domain';
function luminance(hex:string){const channels=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;}
export function validateFeatures(a:Account,input:SiteInput){const p=PLANS[effectivePlan(a)];
 if(!p.styling && (input.hideBranding || input.fontFamily!=='Arial, sans-serif' || input.background.toUpperCase()!=='#FFFFFF' || input.textColor.toUpperCase()!=='#0B0F19' || input.accent.toUpperCase()!=='#4F46E5'))throw new UserError('Custom colors, fonts, and branding removal require Starter or above.',402);
 if(!p.languages && (input.language==='fr'||Object.keys(input.translations).length))throw new UserError('French and translated provider descriptions require Business Pro or Agency.',402);
 const l=[luminance(input.background),luminance(input.textColor)].sort((a,b)=>b-a);if((l[0]+.05)/(l[1]+.05)<4.5)throw new UserError('Choose text and background colors with at least 4.5:1 contrast.');
}
export function entitledConfig(site:Site,a:Account){const p=PLANS[effectivePlan(a)],config=publicSite(site);return {...config,allowedLanguages:p.languages?['en','de','fr']:['en','de'],...(!p.styling?{hideBranding:false,fontFamily:'Arial, sans-serif',background:'#FFFFFF',textColor:'#0B0F19',accent:'#4F46E5'}:{}),...(!p.languages?{translations:{},language:site.language==='fr'?'en':site.language}:{})};}
