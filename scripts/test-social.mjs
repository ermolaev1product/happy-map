import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['lib/social.ts'],bundle:true,format:'esm',platform:'node',outfile:'.sites-runtime/social-test.mjs'});
const {handleSocial}=await import('../.sites-runtime/social-test.mjs');
const sqlite=new DatabaseSync(':memory:');
for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+f,'utf8'));
class Prepared{
 constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Prepared(this.sql,args)}
 async first(){return sqlite.prepare(this.sql).get(...this.args)||null}
 async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}
 async run(){const r=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes)}}}
}
const db={prepare:sql=>new Prepared(sql),async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const now=Date.parse('2026-10-08T09:00:00Z');
const catalog={belgrade:{bar:{id:'bar',title:'Bar',address:'Public venue',city:'belgrade',lat:44.8,lng:20.4},club:{id:'club',title:'Club',address:'Public venue 2',city:'belgrade',lat:44.81,lng:20.41}}};
const names=['alice','bob','outsider'];
async function api(who,path,method='GET',data,options={}){
 const req=new Request('https://noreli.test/api/social/'+path,{method,headers:{origin:options.origin||'https://noreli.test','x-noreli-request':'1','content-type':'application/json'},body:method==='GET'?undefined:JSON.stringify(data||{})});
 const r=await handleSocial(req,db,who?{subject:who}:null,catalog,options.now||now);return {status:r.status,data:await r.json()};
}
assert.equal((await api(null,'feed')).status,401);
assert.equal((await api('alice','presence','POST',{})).status,409);
for(const name of names)assert.equal((await api(name,'profile','POST',{name})).status,200);
const a=(await api('alice','me')).data.profile,b=(await api('bob','me')).data.profile;
let token=(await api('alice','invite','POST')).data.token;
assert(!JSON.stringify((await api('alice','feed')).data).includes('subject'));
assert.equal((await api('bob','redeem','POST',{token})).status,200);
let checked=(await api('alice','presence','POST',{city:'belgrade',placeId:'bar',kind:'here',visibility:'friends'})).data;
assert.equal((await api('bob','feed')).data.statuses.length,0,'pending cannot see presence');
assert.equal((await api('outsider','feed')).data.statuses.length,0,'stranger cannot see presence');
assert.equal((await api('bob','friend','POST',{id:a.id,action:'accept'})).status,404,'requester cannot self-accept');
assert.equal((await api('alice','friend','POST',{id:b.id,action:'accept'})).status,200);
assert.equal((await api('bob','feed')).data.statuses.length,1,'accepted friend can see presence');
assert.equal((await api('outsider','redeem','POST',{token})).status,400,'single-use invite');
await api('bob','presence','DELETE',{id:checked.id});assert.equal((await api('alice','feed')).data.statuses.length,1,'cannot delete someone else presence');
await api('alice','presence','POST',{city:'belgrade',placeId:'club',kind:'going',visibility:'private',startsAt:new Date(now+3600000).toISOString()});
assert.equal((await api('bob','feed')).data.statuses.length,1,'private plan remains hidden');
assert.equal((await api('alice','feed')).data.statuses.length,2);
assert.equal((await api('bob','feed','GET',null,{now:now+7200001})).data.statuses.length,0,'here expires after 2h');
assert.equal((await api('alice','presence','POST',{city:'belgrade',placeId:'club',kind:'here',visibility:'friends'},{origin:'https://evil.test'})).status,403,'CSRF');
assert.equal((await api('alice','presence','POST',{city:'belgrade',placeId:'unknown',kind:'here',visibility:'friends'})).status,400,'no invented places');
assert.equal((await api('alice','presence','POST',{city:'__proto__',placeId:'constructor',kind:'here',visibility:'friends'})).status,400,'no inherited catalog entries');
await api('alice','presence','POST',{city:'belgrade',placeId:'club',kind:'here',visibility:'friends'});
assert.equal((await api('alice','feed')).data.statuses.filter(s=>s.kind==='here').length,1,'only one current location');
await api('alice','friend','POST',{id:b.id,action:'block'});
assert.equal((await api('bob','feed')).data.statuses.length,0,'block immediately revokes access');
await api('alice','unblock','POST',{id:b.id});assert.equal((await api('bob','feed')).data.statuses.length,0,'unblock does not restore friendship');
token=(await api('alice','invite','POST')).data.token;await api('alice','invite','DELETE');assert.equal((await api('bob','redeem','POST',{token})).status,400,'revoked invite');
await api('alice','profile','DELETE');assert.equal((await api('alice','me')).data.profile,null);assert.equal((await api('bob','feed')).data.statuses.length,0);
console.log('PASS: identity required, mutual friendship, stranger/pending privacy, private plans, expiry, single-use/revoked invitations, owner-only deletion, CSRF, trusted places, current-location replacement, blocking, account deletion.');
// Private plans are usable without a social display name and cannot cross accounts.
const event={id:'screening',title:'Test screening',date:'2026-10-15',time:'21:00',category:'film'};
assert.equal((await api(null,'plans?city=tbilisi')).status,401);
assert.equal((await api('planner','plans?city=tbilisi','POST',{events:[event]})).status,200);
assert.equal((await api('planner','plans?city=tbilisi')).data.events.length,1);
assert.equal((await api('outsider','plans?city=tbilisi')).data.events.length,0);
await api('outsider','plans?city=tbilisi','DELETE',{id:event.id});
assert.equal((await api('planner','plans?city=tbilisi')).data.events.length,1);
assert.equal((await api('planner','plans?city=moscow')).data.events.length,0);
assert.equal((await api('planner','plans?city=tbilisi','POST',{events:[event]},{origin:'https://evil.test'})).status,403);
assert.equal((await api('planner','plans?city=tbilisi','POST',{events:[{...event,id:null}]})).status,400);
await api('planner','plans?city=tbilisi','DELETE',{id:event.id});
assert.equal((await api('planner','plans?city=tbilisi')).data.events.length,0);
console.log('Private plans: authentication, owner isolation, city isolation, CSRF, validation and removal passed.');
