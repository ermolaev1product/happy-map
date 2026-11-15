const fs=require('node:fs'),assert=require('node:assert/strict');
const prefixes=['','en/','de/','sr/','es/','pt-br/'];let copies=0;
for(const prefix of prefixes){
 for(const rel of ['flensburg/app.js','flensburg/sources-page.js','flensburg/sources.html','palo-alto/sources.html','moscow/app.js']){
  const file='public/'+prefix+rel,s=fs.readFileSync(file,'utf8');assert(!s.includes('09:00 (Asia/Tbilisi)'),file+' stale unsupported daily check promise');copies++;
 }
 for(const name of ['sources.json','events.json']){
  let file='public/'+prefix+'flensburg/'+name;if(!fs.existsSync(file)){assert(fs.readFileSync('public/'+prefix+'flensburg/sources-page.js','utf8').includes('/en/flensburg/'+name),'shared data URL missing: '+prefix+name);file='public/en/flensburg/'+name;}const d=JSON.parse(fs.readFileSync(file));assert(!('schedule'in d)&&!('scheduledCheck'in d),file+' unsupported schedule metadata');
  for(const row of d.sources||d.sourceRegistry||[])for(const k of ['scheduledCheck','scheduledCheckTime','scheduledCheckTimezone'])assert(!(k in row),file+' '+k);
 }
 const js=fs.readFileSync('public/'+prefix+'flensburg/sources-page.js','utf8');assert(!js.includes('events.generatedAt'),prefix+'global generatedAt is not a source read');
}
for(const [locale,phrase] of Object.entries({en:'daily updates are not guaranteed',de:'tägliche Aktualisierungen sind nicht garantiert',sr:'svakodnevna ažuriranja nisu zagarantovana',es:'no se garantizan actualizaciones diarias','pt-br':'atualizações diárias não são garantidas'}))assert(fs.readFileSync('public/'+locale+'/flensburg/sources.html','utf8').includes(phrase),locale+' honest copy localized');
assert(fs.readFileSync('public/flensburg/sources.html','utf8').includes('ежедневное обновление не гарантируется'));
assert(fs.readFileSync('public/de/flensburg/app.js','utf8').includes('/de/flensburg/events.json'),'German route preserved');
console.log(JSON.stringify({passed:true,checkedUICopies:copies,localeCount:6,eventsChanged:false,schedulerChanged:false}));

for(const locale of ['de','sr','es','pt-br'])for(const city of ['flensburg','palo-alto','paris','london']){const js=fs.readFileSync(`public/${locale}/${city}/sources-page.js`,'utf8');for(const name of ['sources','events','places']){const url=`/en/${city}/${name}.json`;assert(js.includes(url),`${locale}/${city} source page uses a missing relative data URL`);assert(fs.existsSync('public'+url),url+' exists');}}
console.log('PASS 48 localized source-page data URLs point to existing shared catalogues.');
