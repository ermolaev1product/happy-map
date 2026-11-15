// Single published fact authority. Locale files contain only generated display-text overlays.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const registry=JSON.parse(fs.readFileSync('public/city-picker.json'));
const recordFields=['title','description','venue','address','source','priceNote','accessNote','timeNote','coordinateNote','languageNote','openingNote','locationNote','publicNote'];
const documentFields=['city','coverage','description'];
const rows=(data,kind)=>Array.isArray(data)?data:data[kind];
const manifest={schemaVersion:1,authority:'https://happymap.app',catalogs:{}};
function descriptor(url){const source=fs.readFileSync('public'+url),normalized=JSON.stringify(JSON.parse(source));return {path:url,sha256:sha(normalized),bytes:Buffer.byteLength(normalized),sourceSha256:sha(source),sourceBytes:source.length};}
const output='public/catalog/v1/locales';fs.mkdirSync(output,{recursive:true});
let overlays=0;
for(const city of registry.cities){
 const folder=city.id==='tbilisi'?'':city.id+'/',entry={events:null,places:null,locales:{}};
 for(const kind of ['events','places']){
  const url='/'+folder+kind+'.json',canonical=JSON.parse(fs.readFileSync('public'+url)),records=rows(canonical,kind);
  if(!Array.isArray(records)||records.length>=(kind==='events'?20000:150000)||!records.every(r=>r&&typeof r.id==='string'&&typeof r.title==='string'&&(kind!=='events'||/^\d{4}-\d{2}-\d{2}$/.test(r.date)))||new Set(records.map(r=>r.id)).size!==records.length)throw Error('Invalid canonical inventory '+url);
  entry[kind]=descriptor(url);
  for(const locale of ['en','de']){
   const input='public/'+locale+url;if(!fs.existsSync(input))continue;
   const localized=JSON.parse(fs.readFileSync(input)),localizedRows=rows(localized,kind),byId=new Map(localizedRows.map(r=>[r.id,r]));
   if(byId.size!==records.length||records.some(r=>!byId.has(r.id)))throw Error('Locale inventory differs from canonical '+input+' missing='+JSON.stringify(records.filter(r=>!byId.has(r.id)).map(r=>r.id).slice(0,20))+' extra='+JSON.stringify([...byId.keys()].filter(id=>!records.some(r=>r.id===id)).slice(0,20)));
   const overlay={schemaVersion:1,cityId:city.id,kind,sourceSha256:entry[kind].sha256,document:{},records:{}};
   if(!Array.isArray(canonical)&&!Array.isArray(localized))for(const key of documentFields)if(typeof localized[key]==='string'&&localized[key]!==canonical[key])overlay.document[key]=localized[key];
   for(const record of records){const translated=byId.get(record.id),text={};for(const key of recordFields)if(typeof translated[key]==='string'&&translated[key]!==record[key])text[key]=translated[key];if(Object.keys(text).length)overlay.records[record.id]=text;}
   const target=`/catalog/v1/locales/${locale}/${city.id}/${kind}.json`;fs.mkdirSync(path.dirname('public'+target),{recursive:true});fs.writeFileSync('public'+target,JSON.stringify(overlay)+'\n');
   (entry.locales[locale]??={})[kind]=descriptor(target);overlays++;
  }
 }
 manifest.catalogs[city.id]=entry;
}
const contentRevision=sha(JSON.stringify(manifest));
let previous={};try{previous=JSON.parse(fs.readFileSync('public/catalog/v1/manifest.json'));}catch{}
const priorSequence=Number.isSafeInteger(previous.publicationSequence)&&previous.publicationSequence>0?previous.publicationSequence:0;
manifest.publicationSequence=previous.contentRevision===contentRevision&&priorSequence?priorSequence:priorSequence+1;
manifest.contentRevision=contentRevision;
manifest.revision=sha(JSON.stringify(manifest));fs.writeFileSync('public/catalog/v1/manifest.json',JSON.stringify(manifest)+'\n');
// Install the same client on every map. Existing clients delegate only their data loads.
const clientVersion=sha(fs.readFileSync('public/catalog-client.js')).slice(0,12);
const visit=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?visit(path.join(dir,e.name)):[path.join(dir,e.name)]);
let maps=0,apps=0,discoveries=0;
for(const file of visit('public')){
 if(file.endsWith('/app.js')){
  let s=fs.readFileSync(file,'utf8');if(!s.includes('async function loadCatalog(){'))continue;
  const start=s.indexOf('async function loadCatalog(){'),end=s.indexOf('\nconst renderOriginal',start);if(end<0)throw Error('Unrecognized catalog client '+file);
  s=s.slice(0,start)+`async function loadCatalog(){
 const result=await window.HappyMapCatalog.load(cityFolder?cityFolder.replace(/\\/$/,''):'tbilisi','events',document.documentElement.lang,{validate:validCatalog,legacyCachePrefix:nearKey});
 catalogOrigin=result.origin;
 return result.data;
}
`+s.slice(end);fs.writeFileSync(file,s);apps++;
 }else if(file.endsWith('/discovery.js')){
  let s=fs.readFileSync(file,'utf8');const start=s.indexOf('async function loadPlaces(){'),end=s.indexOf('\nconst initMapBeforeDiscovery',start);if(start<0||end<0)continue;
  s=s.slice(0,start)+`async function loadPlaces(){
 const result=await window.HappyMapCatalog.load(cityFolder?cityFolder.replace(/\\/$/,''):'tbilisi','places',document.documentElement.lang,{legacyCachePrefix:nearKey});
 return Array.isArray(result.data)?result.data:result.data.places;
}
`+s.slice(end);fs.writeFileSync(file,s);discoveries++;
 }else if(file.endsWith('.html')){
  let s=fs.readFileSync(file,'utf8');if(!/src="[^"]*\bdiscovery\.js(?:\?[^" ]*)?"/.test(s))continue;
  s=s.replace(/<script\b[^>]*src="(?:\/(?:en|de|sr|es|pt-br|fr-ca))?\/catalog-client\.js[^" ]*"[^>]*><\/script>/g,'');
  s=s.replace(/<script\b[^>]*src="(?:[^" ]*\/)?app\.js(?:\?[^" ]*)?"[^>]*>/,m=>`<script defer src="/catalog-client.js?v=${clientVersion}"></script>`+m);
  if(!s.includes('/catalog-client.js?v='))throw Error('Map has no client insertion point '+file);
  fs.writeFileSync(file,s);maps++;
 }
}
// Stamp all changed script dependencies after every client has been rewritten.
for(const file of visit('public').filter(file=>file.endsWith('.html'))){
 let html=fs.readFileSync(file,'utf8');if(!html.includes('/catalog-client.js?v='))continue;
 html=html.replace(/(<script\b[^>]*src=")([^"]+)("[^>]*>)/g,(all,before,url,after)=>{
  if(/^https?:/.test(url))return all;
  const pathname=new URL(url,'https://happymap.app/'+path.relative('public',file)).pathname;
  if(!['app.js','discovery.js','catalog-client.js','catalog-modes.js','freshness.js'].includes(path.basename(pathname)))return all;
  const target='public'+pathname;if(!fs.existsSync(target))throw Error('Missing shared catalog script '+target);
  return before+url.split('?')[0]+'?v='+sha(fs.readFileSync(target)).slice(0,12)+after;
 });fs.writeFileSync(file,html);
}
console.log(JSON.stringify({revision:manifest.revision,cities:registry.cities.length,overlays,maps,apps,discoveries,canonicalFactsChanged:false}));
