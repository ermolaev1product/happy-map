/* Same published catalog for web and Android. Offline data is a labelled replica, never another authority. */
(()=>{
 'use strict';
 const API='/catalog/v1/manifest.json',android=location.hostname==='appassets.androidplatform.net';
 const MAX_BYTES=32*1024*1024,MAX_MANIFEST=1024*1024,DB='happymap-published-catalog-v1',STORE='documents';
 const displayFields=new Set(['title','description','venue','address','source','priceNote','accessNote','timeNote','coordinateNote','languageNote','openingNote','locationNote','publicNote']);
 const documentFields=new Set(['city','coverage','description']);
 let database,manifestPending=null,manifestGeneration=0,lastManifest=null;
 const generations=new Map(),statuses=new Map();
 const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const clone=data=>JSON.parse(JSON.stringify(data));
 function openDatabase(){
  if(database)return database;
  database=new Promise(resolve=>{try{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'key'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);}catch{resolve(null);}});return database;
 }
 async function cached(key){const db=await openDatabase();if(!db)return null;return new Promise(resolve=>{try{const request=db.transaction(STORE).objectStore(STORE).get(key);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>resolve(null);}catch{resolve(null);}});}
 async function persist(record,stillCurrent){const db=await openDatabase();if(!db||!stillCurrent())return false;return new Promise(resolve=>{try{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=()=>resolve(true);tx.onabort=tx.onerror=()=>resolve(false);}catch{resolve(false);}});}
 function pathFor(path,live){return android&&live?'/live'+path:path;}
 async function requestText(path,live,max=MAX_BYTES){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{const response=await fetch(pathFor(path,live),{cache:'no-store',redirect:'error',signal:controller.signal});if(!response.ok)throw Error('Catalog unavailable');const type=response.headers?.get('content-type');if(type&&!/application\/json/i.test(type))throw Error('Not JSON');const text=await response.text();if(new TextEncoder().encode(text).length>max)throw Error('Catalog too large');return text;}finally{clearTimeout(timer);}
 }
 function validPath(path){return /^\/(?:[a-z]+(?:-[a-z]+)*\/)?(?:events|places)\.json$/.test(path)||/^\/catalog\/v1\/locales\/(?:en|de)\/[a-z]+(?:-[a-z]+)*\/(?:events|places)\.json$/.test(path);}
 function validDescriptor(d){return d&&validPath(d.path)&&/^[a-f0-9]{64}$/.test(d.sha256)&&Number.isInteger(d.bytes)&&d.bytes>0&&d.bytes<=MAX_BYTES;}
 async function parseManifest(text){
  const m=JSON.parse(text);if(m.schemaVersion!==1||m.authority!=='https://happymap.app'||!m.catalogs||!Number.isSafeInteger(m.publicationSequence)||m.publicationSequence<1||!/^[a-f0-9]{64}$/.test(m.contentRevision)||!/^[a-f0-9]{64}$/.test(m.revision))throw Error('Invalid catalog manifest');
  const body={...m};delete body.revision;if(await digest(JSON.stringify(body))!==m.revision)throw Error('Manifest revision mismatch');
  if(await digest(JSON.stringify({schemaVersion:m.schemaVersion,authority:m.authority,catalogs:m.catalogs}))!==m.contentRevision)throw Error('Manifest content mismatch');
  for(const [city,e]of Object.entries(m.catalogs)){
   if(!/^[a-z]+(?:-[a-z]+)*$/.test(city)||!validDescriptor(e.events)||!validDescriptor(e.places))throw Error('Invalid city descriptor');
   const folder=city==='tbilisi'?'':city+'/';for(const kind of ['events','places'])if(e[kind].path!=='/'+folder+kind+'.json')throw Error('Cross-city catalog route');
   for(const [locale,entries]of Object.entries(e.locales||{}))for(const [kind,d]of Object.entries(entries))if(!['en','de'].includes(locale)||!['events','places'].includes(kind)||!validDescriptor(d)||d.path!==`/catalog/v1/locales/${locale}/${city}/${kind}.json`)throw Error('Invalid localization route');
  }
  return m;
 }
 async function getManifest(force=false){
  if(force){lastManifest=null;manifestPending=null;}
  if(lastManifest&&Date.now()-lastManifest.checkedAt<1000)return lastManifest;
  if(manifestPending)return manifestPending;
  const generation=++manifestGeneration;
  const pending=(async()=>{
   try{const text=await requestText(API,true,MAX_MANIFEST),data=await parseManifest(text);await persist({key:API,text,revision:data.revision},()=>generation===manifestGeneration);return {data,origin:'website',checkedAt:Date.now()};}catch(error){
    const candidates=[];const previous=await cached(API);if(previous)try{candidates.push({data:await parseManifest(previous.text),origin:'cache',checkedAt:Date.now()});}catch{}
    if(android)try{const text=await requestText(API,false,MAX_MANIFEST);candidates.push({data:await parseManifest(text),origin:'bundled',checkedAt:Date.now()});}catch{}
    candidates.sort((a,b)=>b.data.publicationSequence-a.data.publicationSequence);if(candidates.length)return candidates[0];
    throw error;
   }
  })();
  manifestPending=pending;
  try{const result=await pending;if(generation===manifestGeneration)lastManifest=result;return result;}finally{if(manifestPending===pending)manifestPending=null;}
 }
 async function resource(d,origin,validate,stillCurrent){
  const key=d.path+'@'+d.sha256;
  const valid=async text=>{try{const normalized=JSON.stringify(JSON.parse(text));return new TextEncoder().encode(normalized).length===d.bytes&&await digest(normalized)===d.sha256;}catch{return false;}};
  const previous=await cached(key);if(previous?.sha256===d.sha256&&await valid(previous.text)){const data=JSON.parse(previous.text);validate(data);return {data,persisted:true};}
  if(origin==='website'){
   const text=await requestText(d.path,true);if(!await valid(text)){const error=Error('Catalog hash differs from manifest');error.code='HASH_MISMATCH';throw error;}
   const data=JSON.parse(text);validate(data);
   const persisted=await persist({key,text,sha256:d.sha256},stillCurrent);return {data,persisted};
  }
  if(android){const text=await requestText(d.path,false);if(await valid(text)){const data=JSON.parse(text);validate(data);return {data,persisted:false};}}
  throw Error('No verified catalog for this publication');
 }

 function validateData(data,kind){const rows=Array.isArray(data)?data:data?.[kind];if(!Array.isArray(rows)||rows.length>=(kind==='events'?20000:150000)||!rows.every(r=>r&&typeof r.id==='string'&&typeof r.title==='string'&&(kind!=='events'||/^\d{4}-\d{2}-\d{2}$/.test(r.date)))||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Invalid catalog records');return rows;}
 function localize(canonical,overlay,city,kind,hash){
  if(overlay.schemaVersion!==1||overlay.cityId!==city||overlay.kind!==kind||overlay.sourceSha256!==hash||!overlay.records)throw Error('Invalid text projection');
  const output=clone(canonical),rows=validateData(output,kind),byId=new Map(rows.map(r=>[r.id,r]));
  for(const [id,text]of Object.entries(overlay.records)){
   if(!byId.has(id))throw Error('Unknown localized record');const record=byId.get(id);
   // Reuse a nonempty translation only for an exact canonical admission/note alias.
   const admissionAlias=typeof record.admission==='string'&&record.admission.trim()?['priceNote','accessNote'].find(key=>record.admission===record[key]&&typeof text[key]==='string'&&text[key].trim()):null;
   for(const [key,value]of Object.entries(text)){if(!displayFields.has(key)||typeof value!=='string')throw Error('Localization changed machine facts');record[key]=value;}
   if(admissionAlias)record.admission=text[admissionAlias];
  }
  for(const [key,value]of Object.entries(overlay.document||{})){if(!documentFields.has(key)||typeof value!=='string'||Array.isArray(output))throw Error('Invalid document translation');output[key]=value;}return output;
 }
 function displayLocale(value){const lang=String(value||'en').toLowerCase(),base=lang.split('-')[0];return ({pt:'pt-br',fr:'fr-ca'})[base]||base;}
 // Deterministic presentation only. No locale overlay can supply a price.
 const priceStatusCopy={
  ru:['Цена уточняется','Цена пока не проверена','Бесплатно','заявлено'],
  en:['Price not listed','Price not verified yet','Free','advertised'],
  de:['Preis nicht angegeben','Preis noch nicht geprüft','Kostenlos','angegeben'],
  sr:['Cena nije navedena','Cena još nije proverena','Besplatno','navedeno'],
  es:['Precio no indicado','Precio aún no verificado','Gratis','anunciado'],
  'pt-br':['Preço não informado','Preço ainda não verificado','Grátis','anunciado'],
  'fr-ca':['Prix non indiqué','Prix pas encore vérifié','Gratuit','annoncé']
 };
 function presentPriceStatuses(data,kind,language){
  if(kind!=='events')return data;
  const lang=displayLocale(language),copy=priceStatusCopy[lang]||priceStatusCopy.en;
  const indexes=new Map(priceStatusCopy.ru.slice(0,3).map((label,index)=>[label,index]));
  const suffix=' (заявлено)';
  const label=text=>indexes.has(text)?copy[indexes.get(text)]:typeof text==='string'&&text.endsWith(suffix)?text.slice(0,-suffix.length)+' ('+copy[3]+')':text;
  const rows=Array.isArray(data)?data:data.events;
  if(!rows.some(row=>label(row.priceLabel)!==row.priceLabel))return data;
  const output=clone(data);for(const row of Array.isArray(output)?output:output.events)if(typeof row.priceLabel==='string')row.priceLabel=label(row.priceLabel);return output;
 }
 async function load(city,kind,locale,options={}){
  if(!['events','places'].includes(kind)||!/^[a-z]+(?:-[a-z]+)*$/.test(city))throw Error('Unknown catalog');
  const language=String(locale||'en').toLowerCase(),selectionKey='selection:'+city+':'+kind+':'+language;
  const generation=(generations.get(selectionKey)||0)+1;generations.set(selectionKey,generation);
  const stillCurrent=()=>generations.get(selectionKey)===generation;
  const validate=data=>{validateData(data,kind);if(options.validate&&!options.validate(data))throw Error('Client rejected catalog');};
  async function selection(manifest,origin,allowRetry){
   const entry=manifest.catalogs[city];if(!entry)throw Error('City is not published');
   const doc=await resource(entry[kind],origin,validate,stillCurrent);let data=doc.data;
   const projection=language==='ru'?null:(language.startsWith('de')&&entry.locales?.de?.[kind]?entry.locales.de[kind]:entry.locales?.en?.[kind]);
   if(projection)try{const translated=await resource(projection,origin,value=>localize(doc.data,value,city,kind,entry[kind].sha256),stillCurrent);data=localize(doc.data,translated.data,city,kind,entry[kind].sha256);}catch(error){if(error.code==='HASH_MISMATCH'&&allowRetry)throw error;/* Text is optional. Never discard canonical events for a missing translation. */}
   if(!stillCurrent()){const error=Error('Superseded catalog request');error.name='AbortError';throw error;}
   data=presentPriceStatuses(data,kind,language);
   validate(data);
   if(doc.persisted){
    const selectionPersisted=await persist({key:selectionKey,manifest,revision:manifest.revision},stillCurrent);
    if(!stillCurrent()){const error=Error('Superseded catalog request');error.name='AbortError';throw error;}
    // Only remove this disposable legacy catalog after the verified IndexedDB copy commits.
    // Saved plans, saved places, selected city and language preferences are not touched.
    if(selectionPersisted&&options.legacyCachePrefix)try{localStorage.removeItem(options.legacyCachePrefix+(kind==='events'?'-catalog':'-places-catalog'));}catch{}
   }
   const result={data,origin,revision:manifest.revision,sha256:entry[kind].sha256,city,kind};statuses.set(city+':'+kind,{origin,revision:manifest.revision,city,kind});return result;
  }
  let failure;
  for(let attempt=0;attempt<2;attempt++)try{const manifest=await getManifest(attempt>0);return await selection(manifest.data,manifest.origin,attempt===0);}catch(error){failure=error;if(error.code!=='HASH_MISMATCH'||attempt>0)break;}
  if(!stillCurrent())throw failure;
  // The latest manifest can arrive before its city data. Retain a fully validated prior selection.
  const fallbacks=[],previous=await cached(selectionKey);if(previous?.manifest)try{fallbacks.push({manifest:await parseManifest(JSON.stringify(previous.manifest)),origin:'cache'});}catch{}
  if(android)try{const text=await requestText(API,false,MAX_MANIFEST);fallbacks.push({manifest:await parseManifest(text),origin:'bundled'});}catch{}
  fallbacks.sort((a,b)=>b.manifest.publicationSequence-a.manifest.publicationSequence);
  for(const candidate of fallbacks)try{return await selection(candidate.manifest,candidate.origin,false);}catch{}
  throw failure;
 }

 const sourceCopy={ru:{website:'Единая опубликованная база',cache:'Сохранённая копия. Обновление не подтверждено.',bundled:'Копия из установленной версии. Обновление не получено.'},en:{website:'Shared published catalog',cache:'Saved copy. The latest update could not be confirmed.',bundled:'Copy included with this app. No update received.'},de:{website:'Gemeinsamer veröffentlichter Katalog',cache:'Gespeicherte Kopie. Das aktuelle Update ist nicht bestätigt.',bundled:'Kopie aus dieser App-Version. Kein Update empfangen.'},sr:{website:'Zajednički objavljeni katalog',cache:'Sačuvana kopija. Najnovije ažuriranje nije potvrđeno.',bundled:'Kopija iz ove verzije aplikacije. Ažuriranje nije primljeno.'},es:{website:'Catálogo publicado compartido',cache:'Copia guardada. No se pudo confirmar la última actualización.',bundled:'Copia incluida en esta versión. No se recibió una actualización.'},'pt-br':{website:'Catálogo publicado compartilhado',cache:'Cópia salva. Não foi possível confirmar a atualização mais recente.',bundled:'Cópia incluída nesta versão. Nenhuma atualização recebida.'}};
 window.HappyMapCatalog=Object.freeze({load,refresh:()=>{lastManifest=null;},status:(city,kind)=>statuses.get(city+':'+kind),describe:(status,locale)=>{const lang=displayLocale(locale);return (sourceCopy[lang]||sourceCopy.en)[status.origin];},schemaVersion:1});
})();
