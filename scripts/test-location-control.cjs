const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let checks=0;const ok=(x,m)=>{assert.ok(x,m);checks++},eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
function harness({locale='en',store=new Map(),city='tbilisi',hash='',search='?category=music',secure=true,api=true,session=new Map(),prepare=null,startupCode=null}={}){
 const nodes=new Map(),listeners={},requests=[],timers=[],mapCalls=[],shapes=[],replacements=[];let now=Date.parse('2026-10-16T13:00:00Z');
 class El{constructor(){this.children=[];this.textContent='';this.classList={add(){},remove(){},toggle(){}};}setAttribute(k,v){this[k]=v;}append(...c){this.children.push(...c);for(const e of c)if(e.id)nodes.set('#'+e.id,e);}after(e){nodes.set('#'+e.id,e);}close(){}scrollIntoView(){}}
 const node=s=>{if(!nodes.has(s))nodes.set(s,new El());return nodes.get(s)};
 const shape=(p,o)=>{const x={p,o,removed:false,addTo(){shapes.push(x);return x},bindTooltip(t){x.tooltip=t;return x},remove(){x.removed=true}};return x};
 const ctx={console,Date:class extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now}},URL,URLSearchParams,Number,Math,JSON,window:{isSecureContext:secure,addEventListener:(k,v)=>listeners[k]=v},document:{documentElement:{lang:locale},visibilityState:'visible',querySelector:node,getElementById:k=>nodes.get('#'+k)||null,createElement:()=>new El(),addEventListener:(k,v)=>listeners[k]=v},navigator:api?{geolocation:{getCurrentPosition:(s,e,o)=>requests.push({s,e,o})}}:{},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},location:{hash,pathname:'/map',href:'https://happymap.app/map',search,replace:u=>ctx.redirect=u},history:{state:{keep:'existing-router-state'},replaceState:(a,b,u)=>{ctx.replaced=u;ctx.history.state=a;replacements.push({state:a,url:u});const next=new URL(u,ctx.location.href);Object.assign(ctx.location,{pathname:next.pathname,search:next.search,hash:next.hash,href:next.href});}},setTimeout:(f,ms)=>(timers.push({f,ms}),timers.length),clearTimeout(){},position:[1,2],positionLabel:'OLD',radius:.5,nearKey:'morrow-near-'+city+'-v1',distanceSort:true,view:'explore',limit:18,originMarker:null,originCircle:null,map:{setView:(...x)=>mapCalls.push(x),getCenter:()=>({lat:3,lng:4}),once:(name,fn)=>ctx.mapClick=fn},L:{circle:shape,circleMarker:shape},HappyMapSearch:{origin:(map,p,r,changed)=>(ctx.drag=changed,{marker:shape(p,{search:true}),circle:r?shape(p,{radius:r*1000,search:true}):null})},start(){return Promise.resolve();},initMap(){},render(){},persistNear(){},restoreNear(){},drawOrigin(){},choosePoint(){},locate(){},nearOptions(){},$:node,esc:x=>String(x),showDialog:html=>ctx.dialog=html,toast:s=>ctx.toastMessage=s};
 if(prepare)prepare(ctx);vm.createContext(ctx);if(startupCode)vm.runInContext(startupCode,ctx);vm.runInContext(fs.readFileSync('public/'+(locale==='ru'?'':'en/')+'location-control.js','utf8'),ctx);
 const state=()=>({point:Array.from(ctx.position),label:ctx.positionLabel,status:node('#locationStatus').textContent,button:node('#locateMe').textContent});
 return{ctx,store,session,requests,timers,shapes,listeners,mapCalls,replacements,state,advance:ms=>now+=ms,success:(i=0,p=[10,20],accuracy=12,ts=now)=>requests[i].s({coords:{latitude:p[0],longitude:p[1],accuracy},timestamp:ts}),node};
}
for(const locale of ['ru','en','de']){
 let h=harness({locale});h.ctx.restoreNear();h.ctx.render();eq(h.requests.length,0,'no location request before app initialization');ok(/not determined|не определена|nicht bestimmt/.test(h.state().status));h.node('#locateMe').onclick();eq(h.requests.length,1);h.ctx.locate();eq(h.requests.length,1,'double click does not duplicate request');eq(h.requests[0].o.maximumAge,0);eq(h.requests[0].o.enableHighAccuracy,true);h.success();eq(h.state().point,[10,20]);ok(h.state().label.includes('±12'));ok(h.shapes.some(s=>s.o?.fillColor==='#17764d'),'separate device marker');ok(!h.state().status.includes('not determined'));
 const saved=JSON.parse(h.store.get(h.ctx.nearKey));eq(saved.source,'device-snapshot');ok(saved.observedAt>0);const reload=harness({locale,store:h.store});reload.ctx.restoreNear();reload.ctx.render();ok(/not your current|не текущая|nicht dein aktueller/.test(reload.state().status),'reload does not claim live location');eq(reload.requests.length,0);
 h.ctx.choosePoint([30,40]);eq(h.state().point,[30,40]);ok(/Selected|Выбранная|Ausgewählter/.test(h.state().label));h.advance(300001);h.listeners.pageshow();ok(h.shapes.filter(s=>s.o?.fillColor==='#17764d').every(s=>s.removed),'expired device dot removed');
 for(const code of [1,2,3]){h=harness({locale});h.ctx.restoreNear();h.ctx.render();h.ctx.locate();h.requests[0].e({code});eq(h.state().point,[1,2]);ok(/denied|разрешения|verweigert|unavailable|недоступна|nicht verfügbar|timed out|истекло|Zeitüberschreitung/.test(h.state().status));ok(!h.shapes.some(s=>s.o?.fillColor==='#17764d'&&!s.removed));}
 h=harness({locale});h.ctx.locate();h.ctx.choosePoint([4,5]);h.success();eq(h.state().point,[4,5],'late GPS must not override newer manual choice');
 h=harness({locale});h.ctx.locate();h.node('#locateMe').onclick();h.success();eq(h.state().point,[1,2],'cancel ignores delayed success');
 for(const opts of [{api:false},{secure:false}]){h=harness({locale,...opts});h.ctx.locate();eq(h.requests.length,0);ok(/unavailable|недоступна|nicht verfügbar/.test(h.state().status));}
 h=harness({locale});h.ctx.locate();h.success(0,[10,20],5,0);eq(h.state().point,[1,2],'stale API fix rejected');
 h=harness({locale});h.ctx.locate();h.success(0,[91,20]);eq(h.state().point,[1,2],'invalid coordinates rejected');
 h=harness({locale,hash:'#near=30,40&event=keep'});h.ctx.restoreNear();h.ctx.render();eq(h.state().point,[30,40]);ok(/from a link|из ссылки|aus einem Link/.test(h.state().status));eq(h.ctx.replaced,'/map?category=music#event=keep');eq(h.requests.length,0);h.ctx.position=[1,2];h.ctx.initMap();eq(h.state().point,[30,40],'shared point survives startup fallback even if storage is unavailable');
 h=harness({locale,hash:'#near=,'});h.ctx.restoreNear();eq(h.state().point,[1,2],'blank coordinates not Null Island');
 const sharedStore=new Map([['morrow-near-tbilisi-v1',JSON.stringify({position:[40,44],label:'Моя геопозиция'})]]);h=harness({locale,store:sharedStore});h.ctx.restoreNear();h.ctx.render();ok(/Saved|Сохранённая|Gespeicherter/.test(h.state().label));const other=harness({locale,city:'yerevan',store:sharedStore});other.ctx.restoreNear();eq(other.state().point,[1,2],'city storage isolated');
}

for(const locale of ['ru','en','de']){
 let h=harness({locale,search:'?location=auto'});h.ctx.restoreNear();h.ctx.initMap();eq(h.requests.length,1,'ordinary entry automatically requests own-device position');h.ctx.initMap();eq(h.requests.length,1,'no duplicated automatic request');h.success(0,[40.77,-73.93],8);ok(h.ctx.redirect.endsWith('new-york/index.html'),'automatic city routing');ok(!h.ctx.redirect.includes('40.77'),'coordinates never in URL');const transfer=JSON.parse(h.session.get('happymap-device-transfer-v1'));eq(transfer.city,'new-york');
 let next=harness({locale,city:'new-york',search:'?location=auto',session:h.session});next.ctx.restoreNear();next.ctx.initMap();eq(next.requests.length,0,'same-origin recent transfer avoids repeated permission request');eq(next.state().point,[40.77,-73.93]);eq(next.session.size,0,'transfer consumed once');
 h=harness({locale,city:'new-york',search:'?location=city'});h.ctx.restoreNear();h.ctx.initMap();eq(h.requests.length,1,'shared city link requests own location');h.success(0,[41.70,44.79]);eq(h.ctx.redirect,undefined,'shared city does not silently change city');eq(h.state().point,[1,2],'shared city preserves search centre when device elsewhere');ok(/chosen search|область поиска|Suchgebiet/.test(h.state().status));
 for(const search of ['?location=manual','?event=session-1','?place=venue-1','?view=plans']){h=harness({locale,search});h.ctx.restoreNear();h.ctx.initMap();eq(h.requests.length,search.includes('plans')?0:1,'explicit map intent still obtains separate device location');if(h.requests.length){h.success(0,[40.77,-73.93]);eq(h.ctx.redirect,undefined);eq(h.state().point,[1,2]);}}
 h=harness({locale,search:'?location=auto'});h.ctx.restoreNear();h.ctx.initMap();h.requests[0].e({code:1});ok(h.ctx.originMarker&&h.ctx.originCircle,'denied startup keeps the search centre and radius, not a device pin');
 h=harness({locale,search:'?location=auto'});h.ctx.restoreNear();h.ctx.initMap();h.success(0,[0,0]);eq(h.ctx.redirect,undefined);ok(/supported|поддерживаемого|unterstützte/.test(h.state().status),'unsupported location is honest');
 h=harness({locale,search:'?location=auto'});h.ctx.restoreNear();h.ctx.initMap();h.success(0,[41.70,44.79],20000);eq(h.ctx.redirect,undefined);ok(/approximate|приблизительная|ungenau/.test(h.state().status),'coarse fix does not guess city');
}

// Regression: GPS errors must not hide a still-active geographic filter.
for(const locale of ['ru','en','de'])for(const saved of [false,true]){
 const store=new Map(saved?[['morrow-near-tbilisi-v1',JSON.stringify({position:[41.7,44.8],radius:.5,radiusVersion:1})]]:[]);
 for(const code of [1,2,3]){
  const h=harness({locale,store:new Map(store),search:''});h.ctx.restoreNear();h.ctx.initMap();
  const point=h.state().point;ok(h.ctx.originCircle,'pending GPS keeps circle');eq(h.ctx.originCircle.o.radius,500);
  h.requests[0].e({code});eq(h.state().point,point);eq(h.ctx.radius,.5);ok(h.ctx.originCircle&&!h.ctx.originCircle.removed,'error keeps circle');
  ok(!h.shapes.some(s=>s.o?.fillColor==='#17764d'&&!s.removed),'no false device dot');
  h.listeners.pageshow();ok(h.ctx.originCircle&&!h.ctx.originCircle.removed,'tab return keeps circle');
  h.ctx.choosePoint([41.71,44.81]);eq(Array.from(h.ctx.originCircle.p),[41.71,44.81]);
  h.ctx.nearOptions();h.node('#useWholeCity').onclick();eq(h.ctx.radius,0);eq(h.ctx.originCircle,null,'whole-city mode clears circle');
 }
}

const cities=JSON.parse(fs.readFileSync('public/city-picker.json')).cities;
for(const c of cities){const code=fs.readFileSync('public/'+(c.id==='tbilisi'?'':c.id+'/')+'app.js','utf8'),point=JSON.parse(code.match(/position=(\[[^\]]+\])/)[1]);const h=harness({locale:'en',search:'?location=auto'});h.ctx.restoreNear();h.ctx.initMap();h.success(0,point);if(c.id==='tbilisi')eq(h.state().point,point);else if(JSON.parse(fs.readFileSync('public/en/location-control.js','utf8').match(/const cities=(\[.*\]);/)[1]).some(x=>x.id===c.id))ok(h.ctx.redirect?.endsWith(c.path),'correct own-device city '+c.id);else ok(/supported/.test(h.state().status),'existing unsupported auto-location city remains explicit '+c.id);}
for(const query of ['?location=city','?date=2026-10-17','?category=music','?layer=city','?radius=all']){const h=harness({locale:'en',search:query});h.ctx.restoreNear();h.ctx.initMap();h.success(0,[40.77,-73.93]);eq(h.ctx.redirect,undefined,'explicit city/filter link not redirected');}
for(const f of ['public/index.html','public/app-start.html','public/en/index.html','public/en/app-start.html']){const source=fs.readFileSync(f,'utf8');ok(!source.includes("entry.set('location','auto')"),'generic entry has no technical flag '+f);ok(!source.includes("||'cities.html'"),'generic entry no longer defaults to saved city picker '+f);}
for(const c of cities)for(const locale of ['','en/']){
 const f='public/'+locale+(c.id==='tbilisi'?'map.html':c.id+'/index.html'),s=fs.readFileSync(f,'utf8');ok(s.indexOf('location-control.js')>s.indexOf('app.js'),'location extension after app '+f);ok(s.indexOf('location-control.js')<s.indexOf('discovery.js'),'extension before startup '+f);
}
for(const city of ['tbilisi','palo-alto','new-york']){const h=harness({city,search:''});h.ctx.restoreNear();h.ctx.initMap();eq(h.requests.length,1,'direct city entry automatically locates '+city);h.success(0,[40.1811,44.5136]);ok(h.ctx.redirect.includes('yerevan/index.html'),'direct city entry follows own device '+city);}

// Clean ordinary URLs without losing automatic location or intentional deep links.
for(const locale of ['ru','en','de']){
 for(const query of ['', '?location=auto']){
  const h=harness({locale,search:query});h.ctx.restoreNear();h.ctx.initMap();eq(h.requests.length,1,'clean and legacy URLs auto-locate');eq(h.ctx.location.search,'','technical query removed');
  if(query){eq(h.ctx.replaced,'/map');eq(h.ctx.history.state.keep,'existing-router-state','cleanup preserves router state');}
 }
 for(const [query,expected] of [
  ['?location=auto&lang=en&event=session-1','?lang=en&event=session-1'],
  ['?location=auto&date=2026-10-17&category=music','?date=2026-10-17&category=music'],
  ['?location=city&lang=ru','?location=city&lang=ru'],
  ['?location=auto&location=city','?location=city'],
  ['?location=manual&location=auto','?location=manual'],
  ['?location=manual&place=venue-1','?location=manual&place=venue-1']
 ]){
  const h=harness({locale,search:query,hash:'#event=session-2'});eq(h.ctx.location.search,expected,'meaningful query preserved');eq(h.ctx.location.hash,'#event=session-2','unrelated hash preserved');h.ctx.restoreNear();h.ctx.initMap();eq(h.requests.length,1);h.success(0,[40.77,-73.93]);eq(h.ctx.redirect,undefined,'deep-link intent survives cleanup');
 }
 const near=harness({locale,search:'?location=auto&event=keep',hash:'#near=30,40&detail=keep'});near.ctx.restoreNear();eq(near.ctx.replaced,'/map?event=keep#detail=keep','near consumption does not reintroduce auto flag');eq(near.state().point,[30,40]);eq(near.ctx.history.state.keep,'existing-router-state','near cleanup preserves router state');
}
for(const f of ['public/index.html','public/app-start.html','public/en/index.html','public/en/app-start.html']){
 const script=fs.readFileSync(f,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 for(const [search,hash,expected] of [
  ['','','map.html'],['?location=auto','','map.html'],['?location=auto&location=city','','map.html?location=city'],['?lang=en','#keep','map.html?lang=en#keep'],
  ['?location=auto&event=session-1','#detail','map.html?event=session-1#detail'],
  ['?location=city&category=music','','map.html?location=city&category=music'],
  ['?location=manual','#near=40,44','map.html?location=manual#near=40,44']
 ]){let dest;vm.runInNewContext(script,{URLSearchParams,localStorage:{getItem:()=>null},location:{search,hash,replace:u=>dest=u}});eq(dest,expected,'entry preserves meaningful intent '+f);}
}
const source=fs.readFileSync('public/location-control.js','utf8');ok(!/fetch\(|sendBeacon|navigator.share|watchPosition/.test(source),'no analytics/transmission or continuous tracking');
console.log('PASS location control: '+checks+' assertions; RU/EN/DE states; 40 route load-order checks; automatic startup/city routing, permission, errors, stale storage, city switch, shared links, cancel/race/expiry. Mocked browser API, not physical devices.');

module.exports={harness};
