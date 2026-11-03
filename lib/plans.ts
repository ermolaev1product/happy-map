// Private saved events. Identity comes exclusively from the verified auth adapter.
export async function plans(req:Request,db:D1Database,owner:string,city:string){
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, X-Noreli-Access-Token'}});
 if(!["tbilisi","belgrade","moscow","palo-alto","paris","london","yerevan","flensburg","vienna","saint-petersburg","new-york","dubai","prague","batumi","berlin","limassol","antalya","tel-aviv","almaty","istanbul","barcelona","madrid","minsk","baku","tashkent","astana","bishkek","riga","oslo","buenos-aires","brasilia","tallinn","warsaw","lisbon","chisinau","vilnius","copenhagen","dublin","stockholm","helsinki","amsterdam","bratislava","sofia","rome","budapest","brussels","athens","bucharest","podgorica","zagreb","ljubljana","skopje","sarajevo","ankara","nicosia","abu-dhabi","tirana","valletta","doha","manama","tokyo","seoul","bangkok","singapore","washington","kuala-lumpur","ottawa","hanoi","mexico-city","new-delhi","lima","bogota","montevideo","santiago","quito","asuncion","guatemala-city","panama-city","san-salvador","santo-domingo","port-of-spain","rabat","bridgetown","dakar","tunis","accra","algiers","reykjavik","luxembourg","cape-town","bern","hamburg","munich","toronto","montreal","chicago","philadelphia","los-angeles","cologne","san-diego"].includes(city))return json({error:'Unknown city'},400);
 if(req.method==='GET'){
  const rows=await db.prepare('SELECT payload FROM private_plans WHERE owner=? AND city=? ORDER BY updated_at').bind(owner,city).all<{payload:string}>();
  return json({events:rows.results.map(r=>JSON.parse(r.payload))});
 }
 const raw=await req.text();if(raw.length>65536)return json({error:'Plan is too large'},413);
 let b;try{b=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
 if(req.method==='DELETE'){
  if(typeof b?.id!=='string')return json({error:'Missing event'},400);
  await db.prepare('DELETE FROM private_plans WHERE owner=? AND city=? AND event_id=?').bind(owner,city,b.id).run();return json({ok:true});
 }
 if(req.method!=='POST'||!Array.isArray(b?.events)||b.events.length>50)return json({error:'Invalid plan'},400);
 const clean=[];
 for(const e of b.events){
  if(!e||typeof e.id!=='string'||!e.id||e.id.length>250||typeof e.title!=='string'||e.title.length>300||typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date))return json({error:'Invalid event'},400);
  const value:Record<string,unknown>={id:e.id,title:e.title,date:e.date};
  for(const k of ['time','venue','address','category','currency'])if(typeof e[k]==='string')value[k]=e[k].slice(0,300);
  for(const k of ['lat','lng','price'])if(typeof e[k]==='number'&&Number.isFinite(e[k]))value[k]=e[k];
  clean.push(value);
 }
 if(clean.length)await db.batch(clean.map(e=>db.prepare('INSERT INTO private_plans(owner,city,event_id,payload,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(owner,city,event_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(owner,city,e.id,JSON.stringify(e),Date.now())));
 return json({ok:true});
}
