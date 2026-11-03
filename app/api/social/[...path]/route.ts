import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { handleSocial, type Catalog, type Principal } from '../../../../lib/social';
import catalog from '../../../../lib/place-catalog-packed';
export const dynamic='force-dynamic';
function publicKey(key:string){if(key.startsWith('sb_publishable_'))return true;try{return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon'}catch{return false}}
function config(){
 const e=env as Cloudflare.Env & {NORELI_AUTH_PROVIDER?:string;SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};
 if(e.NORELI_AUTH_PROVIDER==='chatgpt')return {provider:'chatgpt',ready:true};
 if(e.NORELI_AUTH_PROVIDER==='supabase'&&e.SUPABASE_URL?.startsWith('https://')&&e.SUPABASE_PUBLISHABLE_KEY&&publicKey(e.SUPABASE_PUBLISHABLE_KEY))return {provider:'supabase',ready:true,url:e.SUPABASE_URL,key:e.SUPABASE_PUBLISHABLE_KEY};
 return {provider:'pending',ready:false};
}
async function dispatch(req:Request){
 const c=config();
 if(req.method==='GET'&&new URL(req.url).pathname==='/api/social/config'){
  let providers={email:false,google:false},serviceAvailable=c.provider==='chatgpt';
  if(c.provider==='supabase')try{const r=await fetch(c.url+'/auth/v1/settings',{headers:{apikey:c.key!},signal:AbortSignal.timeout(8000)});if(r.ok){const settings=await r.json() as {external?:{email?:boolean;google?:boolean}};providers={email:settings.external?.email===true,google:settings.external?.google===true};serviceAvailable=true;}}catch{}
  return Response.json({...c,providers,serviceAvailable},{headers:{'Cache-Control':'no-store'}});
 }
 let principal:Principal|null=null;
 if(c.provider==='chatgpt'){const u=await getChatGPTUser();if(u)principal={subject:'chatgpt:'+u.userId};}
 if(c.provider==='supabase'){
  const token=req.headers.get('x-noreli-access-token');
  if(token&&token.length<8192){
   try{const r=await fetch(c.url+'/auth/v1/user',{headers:{apikey:c.key!,Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});if(r.ok){const u=await r.json() as {id?:string;is_anonymous?:boolean;email_confirmed_at?:string};if(u.id&&!u.is_anonymous&&u.email_confirmed_at)principal={subject:'supabase:'+u.id};}}catch{return Response.json({error:'Сервис входа временно недоступен'},{status:503,headers:{'Cache-Control':'no-store'}});}
 }
 }
 if(!env.DB)return Response.json({error:'Сервер ещё готовится. Попробуй позже.'},{status:503,headers:{'Cache-Control':'no-store'}});
 return handleSocial(req,env.DB,principal,catalog as Catalog);
}
export const GET=dispatch;export const POST=dispatch;export const DELETE=dispatch;
