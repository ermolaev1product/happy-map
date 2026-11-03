const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),postcss=require('postcss');
const cityPaths=['',...['belgrade','moscow','palo-alto','paris','london','flensburg','yerevan','vienna'].map(c=>c+'/')];
const roots=['','en/'].flatMap(locale=>cityPaths.map(city=>locale+city)).concat('de/flensburg/');
const ids=['eventsLayer','cityLayer'];
const modes=['events','city'];
function element(){
 const attributes={},classes=new Set();
 const target={attributes,classes,value:'all',textContent:'',children:[],dataset:{},hidden:false,style:{},
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){on??=!classes.has(x);on?classes.add(x):classes.delete(x);return on;}},
  setAttribute:(k,v)=>attributes[k]=String(v),getAttribute:k=>attributes[k]??null,
  querySelector:()=>element(),querySelectorAll:()=>[],replaceChildren(){},addEventListener(){},getBoundingClientRect:()=>({width:800,height:600}),
  append(){},after(){},before(){},insertAdjacentHTML(){},scrollIntoView(){},focus(){},click(){target.onclick?.();}};
 return new Proxy(target,{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
}
function context(root,query='',stored=false){
 const nodes=new Map(),lookup=s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s);};
 const locale=root.startsWith('de/')?'de':root.startsWith('en/')?'en':'ru';
 const storage=new Map(stored?[['morrow-real-plans-v1','[]']]:[]);
 const page='public/'+root+(root&&root!=='en/'?'index.html':'map.html'),html=fs.readFileSync(page,'utf8');
 const asset=name=>{const src=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]).find(src=>src.split('?')[0].endsWith('/'+name)||src.split('?')[0]===name);assert(src,name+' script');return 'public'+new URL(src,'https://happymap.app/'+root+(root&&root!=='en/'?'index.html':'map.html')).pathname;};
 const ctx=vm.createContext({console,Intl,Date,URL,URLSearchParams,Map,Set,AbortController,document:{querySelector:lookup,querySelectorAll:()=>[],createElement:element,body:element(),documentElement:{lang:locale},addEventListener(){}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},window:element(),location:{search:query,hash:'',pathname:'/'+root+'index.html'},history:element(),setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},navigator:{},ResizeObserver:class{observe(){}},fetch:()=>new Promise(()=>{})});
 vm.runInContext(fs.readFileSync(asset('discovery-model.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(asset('app.js'),'utf8'),ctx);
 assert.equal(vm.runInContext('layer',ctx),'events','real app initial state');
 if(stored)storage.set(vm.runInContext('nearKey',ctx),JSON.stringify({position:[41.7,44.8],radius:.5,radiusVersion:1,label:'Selected point'}));
 // Keep the real event bindings/state transitions and discovery rendering, while
 // omitting Leaflet and unrelated base-render work from this focused unit test.
 vm.runInContext('initMap=()=>{}; render=()=>{}; resetFilters=()=>render();',ctx);
 vm.runInContext(fs.readFileSync(asset('discovery.js'),'utf8'),ctx);
 vm.runInContext("catalog={generatedAt:'2026-10-15',endDate:'2099-01-01'};initMap();render();",ctx);
 return {ctx,nodes,storage};
}
function selected(f,expected){
 assert.equal(vm.runInContext('layer',f.ctx),expected);
 for(let i=0;i<ids.length;i++){
  const node=f.nodes.get('#'+ids[i]),on=modes[i]===expected;
  assert.equal(node.getAttribute('aria-pressed'),String(on),ids[i]+' pressed');
  assert.equal(node.classes.has('active'),on,ids[i]+' active class');
 }
}
for(const root of roots){
 for(const name of root?'index.html,map.html'.split(','):['map.html']){
  const path='public/'+root+name;if(!fs.existsSync(path))continue;
  const html=fs.readFileSync(path,'utf8');if(!html.includes('id="cityLayer"'))continue;
  const group=html.match(/<div class="layer-tabs"[^>]*>(.*?)<\/div>/s)?.[1];assert(group,path);
  const tags=[...group.matchAll(/<button\b[^>]*>/g)].map(m=>m[0]);
  assert.deepEqual(tags.map(t=>t.match(/id="([^"]+)"/)[1]),ids,path+' DOM and native keyboard order');
  assert(tags[0].includes('aria-pressed="true"'));assert(tags.slice(1).every(t=>t.includes('aria-pressed="false"')));
  assert(tags.every(t=>!t.includes('disabled')&&!t.includes('tabindex="-1"')),'native keyboard buttons stay available');
  assert.equal((tags.join('').match(/class="active"/g)||[]).length,1);
 }
 const f=context(root);selected(f,'events');
 for(const mode of ['city','events','city','city','events']){
  f.nodes.get('#'+ids[modes.indexOf(mode)]).onclick();selected(f,mode);
 }
 const persisted=context(root,'',true);selected(persisted,'events');assert.equal(persisted.storage.get('morrow-real-plans-v1'),'[]','stored plans untouched');
 const storageBefore=JSON.stringify([...persisted.storage]);persisted.nodes.get('#cityLayer').onclick();selected(persisted,'city');assert.equal(JSON.stringify([...persisted.storage]),storageBefore,'switching mode does not persist a new default');
 for(const mode of ['city','nearby','places'])selected(context(root,'?layer='+mode),'city');
 selected(context(root,'?place=legacy-place'),'city');
 selected(context(root,'?layer=invalid'),'events');
 const plans=context(root,'?layer=nearby');vm.runInContext("setView('plans')",plans.ctx);selected(plans,'events');
 assert(!plans.nodes.get('#cityLayer').hidden,'saved places stay available through the second control');
 plans.nodes.get('#cityLayer').onclick();selected(plans,'city');
 vm.runInContext("setView('explore')",plans.ctx);selected(plans,'events');assert(!plans.nodes.get('#cityLayer').hidden);
 console.log('PASS '+(root||'tbilisi/')+': initial Events, repeated switching, one selected mode, native keyboard order, reload default, explicit links and Plans return');
}
const css=fs.readFileSync('public/map-space.css','utf8'),sheet=postcss.parse(css);
const rule=s=>{const r=sheet.nodes.find(n=>n.selector===s);assert(r,s);return Object.fromEntries(r.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));};
const active=rule('.map-first .layer-tabs button[aria-pressed="true"]');
assert.equal(active['border-color'],'#8b7346');assert.equal(active.background,'#e5d2a8');
assert.equal(rule('.map-first .layer-tabs button[aria-pressed="true"]::after').height,'3px');
assert.equal(rule('.map-first .layer-tabs button:focus-visible').outline,'3px solid #67745f');
const grids=sheet.nodes.filter(n=>n.selector==='.map-first .layer-tabs');
assert.equal(grids.at(-1).nodes.find(n=>n.prop==='grid-template-columns').value,'repeat(2,minmax(0,1fr))');
assert.match(css,/min-height:52px/);assert.match(css,/min-height:48px/);assert.match(css,/prefers-reduced-motion/);
assert.equal(fs.readFileSync('public/en/map-space.css','utf8'),css);
assert.match(css,/\.map-first\.plan-view \.layer-tabs\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
function lum(hex){return hex.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
for(const [fg,bg] of [['49310f','e5d2a8'],['62675f','f0f1ef']])assert((lum(bg)+.05)/(lum(fg)+.05)>=4.5,fg+'/'+bg+' AA contrast');
assert((lum('f0f1ef')+.05)/(lum('67745f')+.05)>=3,'keyboard focus non-text contrast');
assert((lum('e5d2a8')+.05)/(lum('67745f')+.05)>=3,'keyboard focus contrasts with selected fill');
assert((lum('e5d2a8')+.05)/(lum('8b7346')+.05)>=3,'selected border contrasts with muted ochre fill');
console.log('PASS desktop/mobile CSS: warm selected accent; shared selected border and underline; visible keyboard focus; AA text contrast; matching locale styles. Browser rendering is a separate check.');

// Whole-city semantics use the real base selectors and actual venue/event connection.
for(const root of roots){
 const f=context(root),run=code=>vm.runInContext(code,f.ctx);
 run(`dates=['2099-10-15','2099-10-16'];if(typeof catalogDates!=='undefined')catalogDates=dates;day=0;radius=.5;position=[48.2,16.3];category='all';
 places=[{id:'near-place',kind:'place',title:'Near cafe',category:'cafe',lat:48.2001,lng:16.3001},{id:'far-place',kind:'place',title:'Far bar',category:'bar',lat:48.4,lng:16.5}];
 events=[{id:'near-event',title:'Near music',venue:'Near cafe',placeId:'near-place',category:'music',date:dates[0],time:'19:00',end:'22:00',price:0,language:'EN',accessType:'public',lat:48.2001,lng:16.3001},{id:'far-event',title:'Far music',venue:'Far bar',placeId:'far-place',category:'music',date:dates[0],time:'14:00',end:'17:00',price:12,language:'DE',accessType:'public',lat:48.4,lng:16.5},{id:'unmapped-event',title:'Unmapped talk',category:'talk',date:dates[0],time:'20:00',end:'22:00',price:0,language:'EN',accessType:'public'},{id:'tomorrow',title:'Tomorrow',venue:'Far bar',placeId:'far-place',category:'music',date:dates[1],time:'19:00',end:'22:00',price:0,language:'EN',accessType:'public',lat:48.4,lng:16.5}];
 venueIndex=NoreliDiscovery.connect(places,events);places=venueIndex.places;render();`);
 const ids=()=>Array.from(run('visible().map(e=>e.id)'));
 assert.deepEqual(ids(),['near-event'],'Events uses actual dated events in the radius');
 run("setLayer('city')");assert.deepEqual(new Set(ids()),new Set(['near-place','far-place','unmapped-event']),'Whole city includes far venues and unlinked real events');
 assert.equal(run('radius'),.5,'Whole city retains the user circle');
 assert.equal(run('events.length'),4,'places never fabricate events');
 assert.equal(run('programFor(places[1])[0].id'),'far-event');
 run('day=1;render()');assert.deepEqual(new Set(ids()),new Set(['near-place','far-place']),'places survive date changes');assert.equal(run('programFor(places[1])[0].id'),'tomorrow');
 run('withProgram=true;render()');assert.deepEqual(ids(),['far-place'],'programme toggle filters actual dated programmes');
 run("day=0;freeOnly=true;render()");assert.deepEqual(new Set(ids()),new Set(['near-place','unmapped-event']),'free filter respects actual programme price');
 run("freeOnly=false;time='day';render()");assert.deepEqual(ids(),['far-place'],'daytime filter');
 run("time='all';language='DE';render()");assert.deepEqual(ids(),['far-place'],'language filter');
 run("language='all';withProgram=false;category='bar';render()");assert.deepEqual(ids(),['far-place'],'bar directory stays available');
 run("setLayer('events')");assert.equal(run('category'),'all','venue-only category is cleared for Events');assert(ids().every(id=>id.includes('event')));
 run("saved=[events[0]];savedPlaces=[places[1]];setView('plans');setLayer('city')");assert.deepEqual(ids(),['far-place'],'saved places remain reachable');
 run("setLayer('events')");assert.deepEqual(ids(),['near-event'],'saved events remain reachable');
 run("setView('explore');setLayer('places')");assert.equal(run('layer'),'city','legacy API mode alias');
 console.log('PASS '+(root||'tbilisi/')+': citywide venues, real programmes, unlinked events, date/free/time/language/category, radius retention and both saved collections');
}
