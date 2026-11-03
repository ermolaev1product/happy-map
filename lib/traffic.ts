export const zone='America/Los_Angeles';
export const dayAt=(now:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
async function pseudonym(s:string,key:string){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');}
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Authorization'};
const json=(v:unknown,status=200)=>Response.json(v,{status,headers});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const cities=["tbilisi","belgrade","moscow","palo-alto","paris","london","yerevan","flensburg","vienna","saint-petersburg","new-york","dubai","prague","batumi","berlin","limassol","antalya","tel-aviv","almaty","istanbul","barcelona","madrid","minsk","baku","tashkent","astana","bishkek","riga","oslo","buenos-aires","brasilia","tallinn","warsaw","lisbon","chisinau","vilnius","copenhagen","dublin","stockholm","helsinki","amsterdam","bratislava","sofia","rome","budapest","brussels","athens","bucharest","podgorica","zagreb","ljubljana","skopje","sarajevo","ankara","nicosia","abu-dhabi","tirana","valletta","doha","manama","tokyo","seoul","bangkok","singapore","washington","kuala-lumpur","ottawa","hanoi","mexico-city","new-delhi","lima","bogota","montevideo","santiago","quito","asuncion","guatemala-city","panama-city","san-salvador","santo-domingo","port-of-spain","rabat","bridgetown","dakar","tunis","accra","algiers","reykjavik","luxembourg","cape-town","bern","hamburg","munich","toronto","montreal","chicago","philadelphia","los-angeles","cologne","san-diego"];
const paths=new Set([
 ...['cities.html','about.html','guide.html','android.html','sources.html','source-priorities.html','sources-audit.html','tbilisi-bars.html'].map(p=>'/'+p),
 ...cities.flatMap(c=>['','map.html','android.html','sources.html','nearby.html'].map(p=>'/'+c+'/'+p))
]);
const sources=new Set(['friend','telegram','whatsapp','instagram','facebook','google','direct','other']);
export async function handleTraffic(req:Request,db:D1Database,config:{adminHash?:string;salt?:string},now=Date.now()){
 if(!config.adminHash||!config.salt)return json({error:'Статистика ещё не настроена'},503);
 const route=new URL(req.url).pathname.split('/').pop();
 const day=dayAt(now),cutoff=dayAt(now-90*86400000);
 if(req.method==='GET'&&route==='report'){
  const key=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(key.length>200||await sha(key)!==config.adminHash)return json({error:'Неверный пароль'},401);
  const start=dayAt(now-29*86400000);
  const daily=await db.prepare('SELECT day,COUNT(DISTINCT visitor) AS visitors,COUNT(*) AS views FROM traffic_events WHERE day>=? GROUP BY day ORDER BY day').bind(start).all();
  const source=await db.prepare('SELECT source,COUNT(DISTINCT visitor) AS visitors,COUNT(*) AS views FROM traffic_events WHERE day>=? GROUP BY source ORDER BY views DESC').bind(start).all();
  const byCity=await db.prepare(`SELECT CASE ${cities.map(c=>`WHEN path LIKE '/${c}/%' THEN '${c}'`).join(' ')} ELSE 'site' END AS city,COUNT(DISTINCT visitor) AS visitors,COUNT(*) AS views FROM traffic_events WHERE day>=? GROUP BY city ORDER BY views DESC`).bind(start).all();
  return json({today:day,timezone:zone,daily:daily.results,sources:source.results,cities:byCity.results,windowDays:30,retentionDays:90,visitorDefinition:'one browser per California day',cityDefinition:'city page viewed, not visitor location',sessionsMeasured:false});
 }
 if(req.method!=='POST'||route!=='view')return json({error:'Not found'},404);
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Forbidden'},403);
 if(req.headers.get('dnt')==='1'||req.headers.get('sec-gpc')==='1'||/bot|crawler|spider|preview|facebookexternalhit|headless|lighthouse|playwright|selenium|curl|wget|python-requests/i.test(req.headers.get('user-agent')||''))return new Response(null,{status:204,headers});
 if(!req.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
 if(Number(req.headers.get('content-length')||0)>1024)return json({error:'Too large'},413);
 const raw=await req.text();if(raw.length>1024)return json({error:'Too large'},413);
 let b;try{b=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
 if(!b||!uuid.test(b.id)||!uuid.test(b.visitor)||!paths.has(b.path)||!sources.has(b.source))return json({error:'Invalid event'},400);
 const bucket=Math.floor(now/60000);
 const ip=req.headers.get('cf-connecting-ip');
 const rateKey=await pseudonym(day+':rate:'+(ip||b.visitor),config.salt);
 const limit=await db.prepare('INSERT INTO traffic_limits(key,bucket,hits) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET bucket=excluded.bucket,hits=CASE WHEN traffic_limits.bucket=excluded.bucket THEN traffic_limits.hits+1 ELSE 1 END RETURNING hits').bind(rateKey,bucket).first<{hits:number}>();
 if((limit?.hits||0)>120)return json({error:'Too many requests'},429);
 const visitor=await pseudonym(day+':visitor:'+b.visitor,config.salt);
 await db.batch([
  db.prepare('INSERT OR IGNORE INTO traffic_events(id,day,visitor,path,source) VALUES(?,?,?,?,?)').bind(b.id,day,visitor,b.path,b.source),
  db.prepare('DELETE FROM traffic_events WHERE day<?').bind(cutoff),
  db.prepare('DELETE FROM traffic_limits WHERE bucket<?').bind(bucket-2)
 ]);
 return new Response(null,{status:204,headers});
}
