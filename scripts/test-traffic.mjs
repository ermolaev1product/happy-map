import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';import assert from 'node:assert/strict';import {build} from 'esbuild';
await build({entryPoints:['lib/traffic.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/traffic-test.mjs'});
const {handleTraffic,sha,dayAt}=await import('../.sites-runtime/traffic-test.mjs');const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
class P{constructor(s,a=[]){this.s=s;this.a=a}bind(...a){return new P(this.s,a)}async first(){return sql.prepare(this.s).get(...this.a)||null}async all(){return {results:sql.prepare(this.s).all(...this.a)}}async run(){return sql.prepare(this.s).run(...this.a)}}
const db={prepare:s=>new P(s),async batch(ss){sql.exec('BEGIN');try{const r=[];for(const s of ss)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
const cfg={adminHash:await sha('test-password'),salt:'test-only-salt'};let now=Date.parse('2026-10-11T06:50:00Z');assert.equal(dayAt(now),'2026-10-10');
async function view(b,headers={}){return handleTraffic(new Request('https://happymap.test/api/traffic/view',{method:'POST',headers:{origin:'https://happymap.test','content-type':'application/json',...headers},body:JSON.stringify(b)}),db,cfg,now)}
const a=crypto.randomUUID(),b=crypto.randomUUID(),e={id:crypto.randomUUID(),visitor:a,path:'/palo-alto/',source:'friend'};
assert.equal((await view(e)).status,204);await view(e);await view({...e,id:crypto.randomUUID(),path:'/palo-alto/map.html'});await view({...e,id:crypto.randomUUID(),visitor:b});
async function report(key='test-password'){return handleTraffic(new Request('https://happymap.test/api/traffic/report',{headers:{Authorization:'Bearer '+key}}),db,cfg,now)}
assert.equal((await report('wrong')).status,401);let r=await(await report()).json();assert.equal(r.daily[0].visitors,2);assert.equal(r.daily[0].views,3);
assert.equal((await view({...e,id:crypto.randomUUID()},{origin:'https://evil.test'})).status,403);
assert.equal((await view({...e,path:'/secret'})).status,400);
await view({...e,id:crypto.randomUUID()},{'user-agent':'TelegramBot'});await view({...e,id:crypto.randomUUID()},{dnt:'1'});assert.equal((await(await report()).json()).daily[0].views,3);
now=Date.parse('2026-10-11T07:01:00Z');await view({...e,id:crypto.randomUUID()});r=await(await report()).json();assert.equal(r.daily.length,2);assert.equal(r.daily[1].visitors,1);assert.equal(r.daily[1].day,'2026-10-11');
const rows=sql.prepare('SELECT * FROM traffic_events').all();assert(!JSON.stringify(rows).includes(a));assert(!JSON.stringify(rows).includes(b));
for(let i=0;i<121;i++)await view({...e,id:crypto.randomUUID()},{'cf-connecting-ip':'192.0.2.1'});assert.equal((await view({...e,id:crypto.randomUUID()},{'cf-connecting-ip':'192.0.2.1'})).status,429);
now+=91*86400000;await view({...e,id:crypto.randomUUID()});assert.equal(sql.prepare('SELECT COUNT(*) n FROM traffic_events').get().n,1);
console.log('PASS: auth, duplicate retries, unique visitors, views, source, California midnight, bot/DNT exclusions, origin checks, rate limit, pseudonyms, retention.');
// Whole-site extension: keep server-side confidentiality and daily-browser semantics.
const anonymous=await handleTraffic(new Request('https://happymap.test/api/traffic/report'),db,cfg,now);
assert.equal(anonymous.status,401);assert.deepEqual(Object.keys(await anonymous.json()),['error']);
assert.equal((await report('wrong')).headers.get('cache-control'),'private, no-store');
assert.equal((await handleTraffic(new Request('https://happymap.test/api/traffic/report'),db,{},now)).status,503);
const sameBrowser=crypto.randomUUID();
for(const path of ['/tbilisi/map.html','/belgrade/','/moscow/','/palo-alto/','/paris/','/london/','/flensburg/','/android.html','/cities.html'])assert.equal((await view({...e,id:crypto.randomUUID(),visitor:sameBrowser,path})).status,204);
r=await(await report()).json();const today=r.daily.find(x=>x.day===dayAt(now));assert.equal(today.visitors,2);assert.equal(today.views,10);
assert.deepEqual(new Set(r.cities.map(x=>x.city)),new Set(['tbilisi','belgrade','moscow','palo-alto','paris','london','flensburg','site']));
assert.equal(r.cities.find(x=>x.city==='site').visitors,1);assert.equal(r.sessionsMeasured,false);
assert(!JSON.stringify(r).includes(sameBrowser));assert(!JSON.stringify(r).includes('visitor":'));assert(!JSON.stringify(r).includes('192.0.2.1'));
for(const path of ['/stats.html','/friends.html','/api/social/me','/traffic-privacy.html','/paris/?email=private','/secret','/en/paris/'])assert.equal((await view({...e,id:crypto.randomUUID(),path})).status,400);
const before=sql.prepare('SELECT COUNT(*) n FROM traffic_events').get().n;
for(const agent of ['TelegramBot','HeadlessChrome','Lighthouse','Playwright','curl/8.0','python-requests'])await view({...e,id:crypto.randomUUID()},{'user-agent':agent});
await view({...e,id:crypto.randomUUID()},{'sec-gpc':'1'});assert.equal(sql.prepare('SELECT COUNT(*) n FROM traffic_events').get().n,before);
console.log('PASS: all seven cities, shared site pages, daily cross-city deduplication, aggregate-only report, anonymous denial, private-path exclusion, bots/GPC.');
