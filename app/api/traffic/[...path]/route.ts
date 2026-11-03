import {env} from 'cloudflare:workers';
import {handleTraffic} from '../../../../lib/traffic';
export const dynamic='force-dynamic';
async function dispatch(req:Request){
 const e=env as Cloudflare.Env & {HAPPYMAP_STATS_ADMIN_HASH?:string;HAPPYMAP_STATS_SALT?:string};
 if(!e.DB)return Response.json({error:'Статистика временно недоступна'},{status:503,headers:{'Cache-Control':'no-store'}});
 try{return await handleTraffic(req,e.DB,{adminHash:e.HAPPYMAP_STATS_ADMIN_HASH,salt:e.HAPPYMAP_STATS_SALT});}
 catch{return Response.json({error:'Статистика временно недоступна'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
export const GET=dispatch;export const POST=dispatch;
