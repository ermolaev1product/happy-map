const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const arg=n=>process.argv.includes(n)?process.argv[process.argv.indexOf(n)+1]:null;
const generator=arg('--generator')||'scripts/build-flensburg-german.cjs';
const manifestFile=arg('--manifest')||'data/i18n/flensburg-de-events-20261112.json';
const bundleFile=arg('--bundle')||'data/city-quality-20261112/bundle.json';
const enFile=arg('--english-dictionary')||'data/i18n/english-reviewed.json';
const source=fs.readFileSync(generator,'utf8'),block=source.match(/\/\/ BEGIN REVIEWED FLENSBURG EVENT TEXT([\s\S]*?)\/\/ END REVIEWED FLENSBURG EVENT TEXT/);
assert(block,'reviewed event translator markers');
const localize=vm.runInNewContext(block[1]+';reviewedEventText;');
const manifest=JSON.parse(fs.readFileSync(manifestFile)),bundle=JSON.parse(fs.readFileSync(bundleFile)),english=JSON.parse(fs.readFileSync(enFile));
bundle.items=bundle.items.filter(i=>i.city==='flensburg'&&i.action==='add');
const clone=x=>JSON.parse(JSON.stringify(x));const old={id:'old-flensburg-fixture',date:'2026-11-12',title:'Do not translate this old record',description:'Точный старый текст',sourceUrl:'https://example.invalid/keep?x=1#y',sources:[{name:'Old source',url:'https://example.invalid/keep'}]};
function toEnglish(value,key=''){
 const immutable=new Set(['id','venueId','slug','url','sourceUrl','sourceURL','website','email','sourceURLs','coordinateSource','evidenceURL','researchEvidenceUrl']);
 if(typeof value==='string')return immutable.has(key)||value.startsWith('https://')||value.startsWith('http://')?value:(english[value]||value);
 if(Array.isArray(value))return value.map(x=>toEnglish(x,key));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,toEnglish(v,k)]));return value;
}
const input={coverage:'Catalog metadata must not change',sourceRegistry:[{url:'https://example.invalid/registry'}],events:[old,...bundle.items.map(i=>toEnglish(i.event))]};
const before=JSON.stringify(input),after=JSON.parse(localize(before,manifest));
assert.equal(JSON.stringify(input),before,'input object unchanged');assert.equal(after.events.length,11);
assert.deepEqual(after.events[0],old,'old record remains byte-equivalent at JSON-object level');
const allowed=new Set(['title','description','admission','accessNote','priceNote','timeNote']);let fieldCount=0;
for(let i=1;i<after.events.length;i++){
 const actual=after.events[i],original=input.events[i],spec=manifest.records[actual.id];assert(spec);
 for(const k of Object.keys(original)){
  if(Object.hasOwn(spec.fields,k)){assert(allowed.has(k));assert.equal(actual[k],spec.fields[k].de);assert(!/[А-Яа-яЁё]/.test(actual[k]));fieldCount++;}
  else assert.deepEqual(actual[k],original[k],'protected '+actual.id+'.'+k);
 }
 assert.deepEqual(Object.keys(actual),Object.keys(original),'no new record fields');
}
assert.deepEqual({...after,events:[]},{...input,events:[]},'catalog metadata preserved');
assert.equal(localize(JSON.stringify(after),manifest),JSON.stringify(after),'idempotent, preserves bytes when already DE');
const empty=JSON.stringify({coverage:'unchanged',events:[old]},null,1);assert.equal(localize(empty,manifest),empty,'pre-import no-op is byte-identical');
const partial={events:[old,input.events[1]]};assert.equal(JSON.parse(localize(JSON.stringify(partial),manifest)).events.length,2,'partial import does not insert missing IDs');
for(const key of ['date','sourceUrl']){const x=clone(input);x.events[1][key]='changed';assert.throws(()=>localize(JSON.stringify(x),manifest),/identity changed/);}
const unknown=clone(input);unknown.events[1].description='Unreviewed change';assert.throws(()=>localize(JSON.stringify(unknown),manifest),/Unreviewed/);
const missing=clone(input);delete missing.events[1].priceNote;assert.throws(()=>localize(JSON.stringify(missing),manifest),/Unreviewed/);
const protectedField=clone(manifest),id=input.events[1].id;protectedField.records[id].fields.sourceUrl={from:[input.events[1].sourceUrl],de:'https://bad.invalid'};assert.throws(()=>localize(before,protectedField),/Protected/);
const duplicates=clone(input);duplicates.events.push(duplicates.events[1]);assert.throws(()=>localize(JSON.stringify(duplicates),manifest),/Duplicate/);
assert.equal(JSON.parse(localize(JSON.stringify({events:bundle.items.map(i=>i.event)}),manifest)).events.length,10,'reviewed RU source also supported');
console.log('PASS: 10 reviewed IDs, '+fieldCount+' display fields; EN/RU/DE values, old records and all facts preserved; stale guards and forbidden fields fail closed; partial/no-op/idempotent cases');
