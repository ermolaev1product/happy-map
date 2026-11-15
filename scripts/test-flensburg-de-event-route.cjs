const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const arg=(n,f)=>process.argv.includes(n)?process.argv[process.argv.indexOf(n)+1]:f;
const root=path.resolve(arg('--root',process.cwd())),requireAtRoot=createRequire(path.join(root,'package.json')),{parse}=requireAtRoot('acorn');
const finalMode=process.argv.includes('--final'),localizerFile=arg('--localizer','scripts/localize-city-ui.mjs');
const read=p=>fs.readFileSync(path.isAbsolute(p)?p:path.join(root,p),'utf8');
function generate(code,locale='de',city='all'){
 const outputs=new Map(),out='/virtual-flensburg-route-test';
 const absolute=p=>path.isAbsolute(String(p))?String(p):path.join(root,String(p));
 const io={...fs,readFileSync(p,encoding){
  if(String(p)==='data/i18n/market-locales.json'){
   const r=JSON.parse(read(String(p)));r.cities=r.cities.filter(c=>['flensburg','berlin'].includes(c.id));const s=JSON.stringify(r);return encoding?s:Buffer.from(s);
  }
  return fs.readFileSync(absolute(p),encoding);
 },existsSync:p=>fs.existsSync(absolute(p)),readdirSync:(p,o)=>fs.readdirSync(absolute(p),o),mkdirSync(){},writeFileSync(p,s){assert(String(p).startsWith(out+'/'),'No source writes');outputs.set(String(p).slice(out.length+1),String(s));}};
 const dictionary=locale==='de'?'data/i18n/de-ui.json':'data/i18n/es-ui.json';
 const ctx={fs:io,path,parse,URL,Buffer,process:{argv:['node','localizer','--locale',locale,'--city',city,'--dictionary',dictionary,'--output',out]},console:{log(){}}};
 // Run the complete actual generator, including its final rewrite/write loop, in a no-write filesystem shim.
 vm.runInNewContext(code.replace(/^import .*;\s*$/mg,''),ctx,{filename:'actual-localize-city-ui.mjs',timeout:30000});
 return outputs;
}
function catalogPaths(code){
 const found=[];function walk(n){if(!n||typeof n!=='object')return;
  if(n.type==='CallExpression'&&['readCatalog','fetch'].includes(n.callee?.name)&&n.arguments[0]?.type==='Literal'&&typeof n.arguments[0].value==='string'&&n.arguments[0].value.endsWith('.json'))found.push(n.arguments[0].value);
  for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);
 }walk(parse(code,{ecmaVersion:'latest',sourceType:'module'}));return found;
}
function loaderSource(code){
 const ast=parse(code,{ecmaVersion:'latest',sourceType:'module'}),functions=new Set(['validCatalog','readCatalog','loadCatalog']),variables=new Set(['isAndroid','cityFolder']);
 const keep=ast.body.filter(n=>n.type==='FunctionDeclaration'&&functions.has(n.id?.name)||n.type==='VariableDeclaration'&&n.declarations.some(d=>variables.has(d.id?.name)));
 assert.equal(keep.filter(n=>n.type==='FunctionDeclaration').length,3,'actual loader functions found');return keep.map(n=>code.slice(n.start,n.end)).join('\n');
}
async function verifyRuntime(app,freshness,label){
 const requests=[],handlers={},intervals=[];let revision=0,offline=false;
 const fixture=()=>({startDate:'2026-11-12',endDate:'2026-11-18',generatedAt:'2026-11-12T14:00:00Z',events:[{id:'de-reviewed-fixture',date:'2026-11-14',title:'Deutscher Veranstaltungstext '+(++revision),category:'talk',sourceUrl:'https://example.org/event'}]});
 const ctx={console,Date,Promise,URL,AbortController,setTimeout:()=>1,clearTimeout(){},setInterval:f=>intervals.push(f),location:{hostname:'happymap.app'},document:{hidden:false,documentElement:{lang:'de'},addEventListener:(n,f)=>handlers[n]=f},window:{addEventListener:(n,f)=>handlers[n]=f},localStorage:{getItem(){throw Error('Web loader must not read native cache');},setItem(){throw Error('Web loader must not write native cache');}},safeUrl:s=>/^https:/.test(s),catalogOrigin:'',nearKey:'happy-map-near-flensburg-v1',catalog:null,events:[],places:[],dates:['2026-11-12','2026-11-13','2026-11-14'],day:0,render(){},$:()=>null,today:()=> '2026-11-12',loadPlaces:async()=>[],NoreliDiscovery:{connect:places=>({places})},fetch:async(url)=>{requests.push(url);assert.equal(url,'/de/flensburg/events.json',label+' event route');if(offline)throw Error('offline');return{ok:true,json:async()=>fixture()};}};
 vm.createContext(ctx);vm.runInContext(loaderSource(app),ctx);
 ctx.catalog=await vm.runInContext('loadCatalog()',ctx);ctx.events=ctx.catalog.events;assert.equal(ctx.events[0].title,'Deutscher Veranstaltungstext 1');
 vm.runInContext(freshness,ctx,{filename:'generated-de-freshness.js'});await ctx.window.happyMapRefresh();assert.equal(ctx.events[0].title,'Deutscher Veranstaltungstext 2','forced refresh retains DE source');
 for(const event of ['pageshow','online','visibilitychange']){const before=requests.length;handlers[event]();for(let i=0;i<20;i++)await Promise.resolve();assert.equal(requests.length,before+1,event+' uses same loader');assert(ctx.events[0].title.startsWith('Deutscher Veranstaltungstext '));}
 const kept=ctx.events[0].title;offline=true;await ctx.window.happyMapRefresh();assert.equal(ctx.events[0].title,kept,'offline refresh keeps last German data');
 assert.equal(intervals.length,1,'normal periodic refresh still installed');assert(requests.every(p=>p==='/de/flensburg/events.json'));
 return {requests:requests.length,lastTitle:kept};
}
(async()=>{
 let app,freshness;
 if(finalMode){
  app=read('public/de/flensburg/app.js');freshness=read('public/de/freshness.js');
  assert(read('public/de/flensburg/map.html').includes('/de/freshness.js'),'actual German map loads German shared freshness asset');
  assert(catalogPaths(read('public/de/flensburg/discovery.js')).includes('/en/flensburg/places.json'),'places route unchanged');
  assert(catalogPaths(read('public/de/berlin/app.js')).includes('/en/berlin/events.json'),'other German city unchanged');
  assert(catalogPaths(read('public/es/flensburg/app.js')).includes('/en/flensburg/events.json'),'other locale unchanged');
 }else{
  const patched=read(localizerFile),baseline=read('scripts/localize-city-ui.mjs'),newOutput=generate(patched),oldOutput=generate(baseline);
  const key='de/flensburg/app.js';assert(newOutput.has(key));
  for(const [p,old]of oldOutput){if(p===key)assert.equal(newOutput.get(p).replaceAll('/de/flensburg/events.json','/en/flensburg/events.json'),old,'only event URL may differ');else assert.equal(newOutput.get(p),old,'unchanged output '+p);}
  app=newOutput.get(key);freshness=newOutput.get('de/freshness.js');assert(catalogPaths(app).includes('/de/flensburg/events.json'));assert(!catalogPaths(app).includes('/en/flensburg/events.json'));
  assert(catalogPaths(newOutput.get('de/flensburg/discovery.js')).includes('/en/flensburg/places.json'));assert(catalogPaths(newOutput.get('de/berlin/app.js')).includes('/en/berlin/events.json'));
  const solo=generate(patched,'de','flensburg');assert(catalogPaths(solo.get(key)).includes('/de/flensburg/events.json'),'single-city mode');
  const spanish=generate(patched,'es');assert(catalogPaths(spanish.get('es/flensburg/app.js')).includes('/en/flensburg/events.json'),'Spanish unchanged');
  assert(newOutput.get('de/flensburg/map.html').includes('/de/freshness.js'),'generated map selects actual shared asset');
 }
 assert(catalogPaths(app).includes('/de/flensburg/events.json'),'final loader selects DE event JSON');
 const runtime=await verifyRuntime(app,freshness,finalMode?'final files':'actual generator output');
 console.log(JSON.stringify({passed:true,mode:finalMode?'actual post-build files':'actual generator with in-memory output',scope:'German Flensburg website only',initialAndRefreshRoute:'/de/flensburg/events.json',unchanged:'other tested city/locale, places/sources and shared freshness code',runtime},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
