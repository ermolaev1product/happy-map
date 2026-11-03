// v144 -> independent Whole city directory: immutable baseline inventories and reviewed additions.
const fs=require('node:fs'),cp=require('node:child_process'),vm=require('node:vm'),assert=require('node:assert/strict');
const BASE='6219b22849c6298d3ea899f38b75a5ff6b86170a',before=p=>JSON.parse(cp.execFileSync('git',['show',BASE+':'+p],{maxBuffer:80e6})),read=p=>JSON.parse(fs.readFileSync(p));
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++},ok=(a,m)=>{assert.ok(a,m);checks++};
const cities=read('public/city-picker.json').cities,ai='biletebi:ai-in-action:2026-10-17';
for(const c of cities)for(const locale of ['','en/']){
 const root='public/'+locale+c.path.replace(/(?:index|map)\.html$/,'');
 for(const type of ['events','places']){
  const file=root+type+'.json';if(!fs.existsSync(file))continue;
  const b=before(file),a=read(file),br=b[type]||b,ar=a[type]||a;
  if(c.id==='yerevan'&&type==='places'){
   eq(br.length,1889);eq(ar.length,2055);const by=new Map(ar.map(x=>[x.id,x]));eq(by.size,ar.length);
   for(const row of br)eq(by.get(row.id),row,'existing Yerevan place unchanged '+row.id);
   const old=new Set(br.map(x=>x.id)),added=ar.filter(x=>!old.has(x.id));eq(added.length,166);
   for(const p of added){ok(p.title&&Number.isFinite(p.lat)&&Number.isFinite(p.lng));eq(p.boundaryVerified,true);eq(p.boundarySource,'https://www.openstreetmap.org/relation/364087');eq(p.license,'ODbL-1.0');eq(p.operatingStatusVerified,false);eq(p.openingHoursVerified,false);eq(p.sourceSnapshot,'2026-10-15T20:21:00Z');ok(p.sourceUrl.startsWith('https://www.openstreetmap.org/'));ok(p.coordinateSource===p.sourceUrl);}
  }else if(c.id==='tbilisi'&&type==='events'){
   eq(br.length,ar.length);const clean=x=>{const y=structuredClone(x);for(const e of y.events)if(e.id===ai)for(const k of ['soldOut','availabilityVerified','availabilityNote','availabilityCheckedAt','availabilitySourceUrl','description','descriptionEn'])delete e[k];return y;};eq(clean(a),clean(b));const e=ar.find(x=>x.id===ai);eq(e.soldOut,true);eq(e.availabilityVerified,true);eq(e.availabilitySourceUrl,'https://biletebi.ge/en/education/ai-in-action');ok(e.description.includes('Biletebi'));
  }else eq(a,b,'unchanged city inventory '+file);
 }
}
const m={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('public/discovery-model.js','utf8'),m);
for(const locale of ['','en/']){const p=read('public/'+locale+'yerevan/places.json').places,e=read('public/'+locale+'yerevan/events.json').events;const connected=m.module.exports.connect(p,e);eq(connected.places.length,2065);eq(connected.places.filter(x=>x.category==='bar').length,152);}
for(const file of cp.execFileSync('git',['ls-tree','-r','--name-only',BASE,'public','android'],{encoding:'utf8'}).trim().split('\n').filter(x=>/location-control\.js$|language-switch\.js$|\/downloads\/|^android\//.test(x)))eq(fs.readFileSync(file),cp.execFileSync('git',['show',BASE+':'+file],{maxBuffer:80e6}),'GPS/URL/APK source unchanged '+file);
console.log(JSON.stringify({pass:true,checks,baseline:BASE,stored:2055,connected:2065,added:166,bars:152,otherCityData:'unchanged except source-verified AI In Action sold-out warning',physicalDevices:false}));
