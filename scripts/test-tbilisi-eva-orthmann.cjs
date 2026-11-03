'use strict';
// Real RU/EN filtering, details and reversible local saves, with simulated DOM.
// Run after npm run build. No network, publication, booking or visual-browser claims.
const fs=require('node:fs'), assert=require('node:assert/strict'), cp=require('node:child_process'), vm=require('node:vm');
const BASE='1c430fa0b95d06d12d1c58f552d1055a9afb0e6d';
const ID='tbilisi-eva-orthmann-20261019', PLACE='yandex:48369759539';
const read=p=>JSON.parse(fs.readFileSync(p));
const oldBytes=p=>cp.execFileSync('git',['show',`${BASE}:${p}`],{maxBuffer:60e6});
const old=p=>JSON.parse(oldBytes(p));
const packet=read('data/tbilisi-eva-orthmann/verified-import.json'), source=packet.events[0];
const cities=read('public/city-picker.json').cities;
assert.equal(cities.length,22);
assert.deepEqual(cities,old('public/city-picker.json').cities);
let oldEvents=0,oldPlaces=0,unchangedFeeds=0;
for(const city of cities)for(const locale of ['', 'en/'])for(const kind of ['events','places']){
 const path=`public/${locale}${city.id==='tbilisi'?'':city.id+'/'}${kind}.json`;
 if(city.id!=='tbilisi'){
  assert(fs.readFileSync(path).equals(oldBytes(path)),`Other city feed byte-identical: ${path}`);unchangedFeeds++;continue;
 }
 const before=old(path),after=read(path),a=Array.isArray(before)?before:before[kind],b=Array.isArray(after)?after:after[kind];
 assert.equal(b.length,a.length+1,path+' exactly one appended row');
 assert.deepEqual(b.slice(0,a.length),a,path+' every old row and order unchanged');
 assert.equal(new Set(b.map(row=>row.id)).size,b.length,path+' no duplicate IDs');
 assert.equal(b.at(-1).id,kind==='events'?ID:PLACE);
 if(kind==='places'){oldPlaces+=a.length;continue;}
 oldEvents+=a.length;
 for(const key of Object.keys(before)){
  if(key==='events')continue;
  if(['sources','sourceRegistry'].includes(key)){
   assert.deepEqual(after[key].slice(0,-1),before[key],path+' old source entries unchanged');
   assert.equal(after[key].at(-1).count,1,path+' dedicated announcement count');
   assert.equal(after[key].at(-1).url,source.sourceUrl);
  }else assert.deepEqual(after[key],before[key],path+' no broad freshness claim: '+key);
 }
 assert.equal(after.sourceRegistry.at(-1).checkedAt,packet.checkedAt);
 assert.match(after.sourceRegistry.at(-1).publicNote,/частичное дополнение|partial addition/);
 const e=b.at(-1);
 for(const field of ['id','kind','cityId','originalTitle','originalTitleLanguage','category','eventFormat','notAConference','date','endDate','time','end','endTime','startAt','endAt','timezone','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','placeId','price','currency','min','ticketUrl','availabilityVerified','checkedAt','sourceRetrievedAt','sourceUrl','verification','status','yearEvidence','dateEvidence','languageEvidence','evidenceUrls','venueEvidenceUrls','researchBatch','provenance'])assert.deepEqual(e[field],source[field],path+' sourced fact retained: '+field);
 for(const field of ['title','venue','address','description','priceLabel','priceNote','admission','availabilityNote','timeNote']){
  const expected=source[field+(locale?'En':'')]+(field==='description'?' '+source['availabilityNote'+(locale?'En':'')]: '');
  assert.equal(e[field],expected,path+' exact reviewed bilingual text: '+field);
 }
 assert.equal(e.language,'EN');assert.equal(e.languageCode,source.language);
 assert.equal(e.sources[0].url,source.sourceUrl);
 assert.equal(e.sources[0].checkedAt,packet.checkedAt);
 assert.equal(e.priceEvidence.sourceUrl,source.sourceUrl);assert.equal(e.priceEvidence.phrase,'Attendance is free.');
 assert(!e.registrationRequired&&!e.accessType&&!e.soldOut,'No invented admission or availability');
 for(const pending of packet.pending)assert(!b.some(row=>row.id===pending.id||row.sourceUrl===pending.sourceUrl),'Pending admission is never imported');
 const p=read(`public/${locale}places.json`).at(-1);
 assert.equal(p.checkedAt,packet.checkedAt);assert.equal(p.coordinatePrecision,'venue_entrance');assert.equal(p.lat,41.712917);assert.equal(p.lng,44.748364);
 assert.deepEqual(p.venueEvidenceUrls,packet.places[0].venueEvidenceUrls);
}
for(const p of ['data/i18n/english-reviewed.json','data/i18n/english-memory.json']){
 const before=old(p),after=read(p);for(const [k,v] of Object.entries(before))assert.equal(after[k],v,'Existing translation retained: '+k);
}
const harness=fs.readFileSync('scripts/test-conference-filters.cjs','utf8').split('for(const root of roots){')[0];
const {fixture,roots}=new Function('require',harness+';return {fixture,roots};')(require);
for(const root of roots.filter(row=>row.city==='tbilisi')){
 const f=fixture(root,{sentinels:false});
 const setup="__now=Date.parse('2026-10-18T00:23:00+04:00');catalog=__feed;events=catalog.events.map(e=>({...e}));dates=['2026-10-18','2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24'];day=1;layer='events';view='explore';category='all';radius=0;freeOnly=false;time='all';language='all';searchTerm='';hideCinema=false;";
 f.ctx.__feed=old(`public/${root.locale}events.json`);f.run(setup);
 assert.equal(f.run('visible().length'),167,root.path+' published v152 baseline count');
 f.run("category='talk'");assert.equal(f.run('visible().length'),1);
 f.ctx.__feed=read(`public/${root.locale}events.json`);f.run(setup);
 assert.equal(f.run('visible().length'),168,root.path+' one announcement added');
 const ids=()=>f.json('visible().map(e=>e.id)');
 f.run("category='talk'");assert.equal(ids().length,2);assert(ids().includes(ID));
 f.run("category='workshop'");assert.deepEqual(ids(),['tkt:507968']);
 f.run("category='conference'");assert.equal(ids().length,0,'Lecture is not a conference');
 f.run("category='talk';freeOnly=true;language='EN'");assert(ids().includes(ID),'Free + English filter finds lecture');
 f.run("language='RU'");assert(!ids().includes(ID),'Does not invent Russian spoken language');
 f.run("language='EN';time='day'");assert(ids().includes(ID));
 f.run("time='evening'");assert(!ids().includes(ID),'16:00 is daytime');
 f.run("time='all';radius=.5;position=[41.7011268,44.7962925]");assert(!ids().includes(ID));assert.equal(f.run('radius'),.5,'No automatic radius widening');
 f.run("radius=0;category='all';freeOnly=false;language='all';__now=Date.parse('2026-10-19T17:59:59+04:00')");assert(ids().includes(ID));
 f.run("__now=Date.parse('2026-10-19T18:00:00+04:00')");assert(!ids().includes(ID),'Known end expires exactly at 18:00');
 f.run("__now=Date.parse('2026-10-18T00:23:00+04:00');openEvent('"+ID+"')");
 const details=f.nodes.get('#eventDetails').innerHTML;
 assert(details.includes('16:00–18:00'),'Real detail uses known end time');
 assert(details.includes(source.sourceUrl),'Real detail links to the official announcement');
 assert(details.includes(root.locale?source.availabilityNoteEn:source.availabilityNote),'Real detail exposes unchecked capacity');
 assert(details.includes('41.712917%2C44.748364'),'Real venue link uses S entrance');
 assert(details.includes(root.locale?source.venueEn:source.venue));
 assert(!/Book now|Забронировать|Register now|Зарегистрироваться/.test(details));
 const before=f.state();
 f.nodes.get('#detailSave').onclick();assert(f.run(`isSaved('${ID}')`));
 assert.equal(JSON.parse(f.storage.get('morrow-real-plans-v1')).filter(e=>e.id===ID).length,1);
 f.run(`openEvent('${ID}')`);f.nodes.get('#detailSave').onclick();assert(!f.run(`isSaved('${ID}')`));
 assert.deepEqual(JSON.parse(f.storage.get('morrow-real-plans-v1')),[],'Reversible test save returns plan to empty');
 assert.deepEqual(f.state(),before,'Save/remove does not change date, radius or category');
 f.ctx.__places=read(`public/${root.locale}places.json`);
 assert.equal(f.run(`NoreliDiscovery.connect(__places,events).links.get('${ID}')`),PLACE,'Exact S venue is connected');
}
const beforeCatalog=old('lib/place-catalog.json'),afterCatalog=read('lib/place-catalog.json');
for(const city of Object.keys(beforeCatalog)){
 if(city!=='tbilisi')assert.deepEqual(afterCatalog[city],beforeCatalog[city],'Other server place registry unchanged '+city);
 else {
  for(const [id,row] of Object.entries(beforeCatalog[city]))assert.deepEqual(afterCatalog[city][id],row,'Existing server place retained '+id);
  assert.deepEqual(Object.keys(afterCatalog[city]).filter(id=>!beforeCatalog[city][id]),[PLACE]);
 }
}
// Deployment assets must contain exactly the last verified source, not an earlier build.
for(const locale of ['', 'en/'])for(const kind of ['events','places']){
 const relative=`${locale}${kind}.json`;
 assert.deepEqual(read(`dist/client/${relative}`),read(`public/${relative}`),'Compiled feed equals final verified source: '+relative);
}
// Importer may be rerun after a full build without changing any compiled input.
const snapshots=['public/events.json','public/places.json','data/i18n/english-reviewed.json'].map(p=>[p,fs.readFileSync(p)]);
cp.execFileSync('python3',['scripts/import-tbilisi-eva-orthmann.py']);
for(const [p,bytes]of snapshots)assert(fs.readFileSync(p).equals(bytes),'Import byte-idempotent: '+p);
const allowed=new Set(['data/tbilisi-eva-orthmann/verified-import.json','scripts/import-tbilisi-eva-orthmann.py','scripts/test-tbilisi-eva-orthmann.cjs','scripts/test-tbilisi-workshop-filter.cjs','data/i18n/english-reviewed.json','data/i18n/english-build-sha256.json','public/events.json','public/places.json','public/en/events.json','public/en/places.json','lib/place-catalog.json','lib/place-catalog-packed.ts']);
const changed=cp.execFileSync('git',['diff','--name-only',BASE],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const untracked=cp.execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
for(const p of new Set([...changed,...untracked]))assert(allowed.has(p),'Unrelated change: '+p);
console.log(JSON.stringify({pass:true,base:BASE,addedEvent:ID,addedVenue:PLACE,sourceCheckedAt:packet.checkedAt,oldEventsPreserved:oldEvents,oldPlacesPreserved:oldPlaces,otherCityFeedsByteIdentical:unchangedFeeds,allCityOctober19:[167,168],talksOctober19:[1,2],workshopsOctober19:1,realFilterDetailAndSaveCode:true,mockedDOM:true,visualBrowserTest:false,pendingImported:0,changed},null,2));
