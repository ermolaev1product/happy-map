// Read-only integration review. Run from Happy Map repository root.
// Uses real app, discovery, location-control and catalog-modes code with synthetic DOM/Leaflet/GPS.
// Does not claim physical device or visual-browser coverage.
const fs=require('node:fs'),assert=require('node:assert/strict');
let base=fs.readFileSync('scripts/test-catalog-modes.cjs','utf8').split('let checks=0;')[0];
const required=["fixture(root,query='')",'navigator:{},',"run('initMap=()=>{};fitMap=()=>{};');","run(fs.readFileSync(asset('discovery.js'),'utf8'));","run(fs.readFileSync('public/catalog-modes.js','utf8'));",'run("catalog={generatedAt:'];
for(const s of required)assert.ok(base.includes(s),'Fixture changed; review harness adaptation: '+s);
const mockMap=String.raw`
 globalThis.__mapCalls=[];globalThis.__shapes=[];
 globalThis.__shape=function(point,opts){const out={point,opts,removed:false,addTo(){__shapes.push(out);return out},bindTooltip(){return out},on(){return out},remove(){out.removed=true}};return out};
 globalThis.__mockMap={handlers:{},setView(p,z){__mapCalls.push(['setView',p,z]);this.handlers.moveend?.();return this},fitBounds(p,o){__mapCalls.push(['fitBounds',p,o]);this.handlers.moveend?.();return this},on(k,f){this.handlers[k]=f;return this},once(k,f){this.handlers[k]=f;return this},getSize(){return{x:390,y:500}},getZoom(){return 15},setZoom(){return this},latLngToContainerPoint(p){return{x:150,y:200}},invalidateSize(){},getCenter(){return{lat:40.1811,lng:44.5136}}};
 globalThis.L={map:()=>__mockMap,marker:__shape,circle:__shape,circleMarker:__shape,divIcon:x=>x,latLng:p=>({toBounds:()=>[p,p]})};
 globalThis.HappyMapBasemap={addTo(){}};
 globalThis.HappyMapSearch={origin:(m,p,r,fn)=>({marker:__shape(p,{origin:true}).addTo(m),circle:r?__shape(p,{radius:r}).addTo(m):null})};
`;
base=base.replace("fixture(root,query='')","fixture(root,query='',options={})")
 .replace('navigator:{},',"navigator:{geolocation:{getCurrentPosition:(s,e,o)=>{lookup('#GPS').request={s,e,o}}}},")
 .replace("run('initMap=()=>{};fitMap=()=>{};');",'run('+JSON.stringify(mockMap)+');run(fs.readFileSync(asset(\'map-layout.js\'),\'utf8\'));')
 .replace("run(fs.readFileSync(asset('discovery.js'),'utf8'));","run(fs.readFileSync('public/location-control.js','utf8'));run(fs.readFileSync(asset('discovery.js'),'utf8'));")
 .replace("run(fs.readFileSync('public/catalog-modes.js','utf8'));","if(!options.late)run(fs.readFileSync('public/catalog-modes.js','utf8'));")
 .replace('run("catalog={generatedAt:',"if(options.early)options.early({run,nodes,ctx});run(\"catalog={generatedAt:")
 .replace('return {ctx,run,nodes,storage,html};',"if(options.late)run(fs.readFileSync('public/catalog-modes.js','utf8'));return {ctx,run,nodes,storage,html};");
const {fixture,roots}=new Function('require',base+';return {fixture,roots};')(require);
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++},ok=(a,m)=>{assert.ok(a,m);checks++};
function success(h,p){h.nodes.get('#GPS').request.s({coords:{latitude:p[0],longitude:p[1],accuracy:8},timestamp:Date.now()});}
for(const root of roots){
 let own;
 const h=fixture(root,'',{early(x){const initial=Array.from(x.run('position'));own=[initial[0]+.001,initial[1]+.001];success(x,own);ok(!x.run('map'),'early GPS precedes map');}});
 eq(Array.from(h.run('position')),own,'early GPS survives full init');eq(h.run('radius'),.5);
 ok(h.run("__shapes.some(s=>s.opts?.fillColor==='#17764d'&&!s.removed)"),'device dot drawn on ready map');
 h.run("category='music';time='evening';language='EN';freeOnly=true;searchTerm='events';setLayer('city')");
 eq(h.run('radius'),0);eq(Array.from(h.run('position')),own);h.run("category='bar';searchTerm='pub';setView('plans');setView('explore')");
 eq(h.run('layer'),'events');eq(h.run('radius'),.5);eq(h.run('category'),'music');eq(h.run('searchTerm'),'events');eq(h.run('time'),'evening');eq(h.nodes.get('#timeFilter').value,'evening','restored time control');eq(h.nodes.get('#languageFilter').value,'EN','restored language control');eq(h.nodes.get('#eventSearch').value,'events','restored search control');ok(h.run('__shapes.some(s=>s.opts?.radius===.5&&!s.removed)'), 'restored 500m origin circle');
 h.run("setLayer('city');category='all';searchTerm='';places=[{id:'p',kind:'place',title:'Bar',category:'bar',lat:position[0],lng:position[1]}];render()");
 eq(h.run('markers.length'),1);const mapLabel=h.nodes.get('#mapLabel').textContent;h.run("__mockMap.handlers.moveend()");eq(h.nodes.get('#mapLabel').textContent,mapLabel,'render vs moveend label stable');
 h.run('locate()');const manual=[own[0]+.001,own[1]+.001];success(h,manual);eq(Array.from(h.run('position')),manual,'explicit GPS works in city');eq(h.run('radius'),0,'directory stays citywide after explicit GPS');
 eq(h.run('layer'),'city');ok(h.run("__shapes.some(s=>s.opts?.fillColor==='#17764d'&&!s.removed)"),'manual GPS dot survives directory render');
 h.run("setLayer('events')");eq(h.run('radius'),.5);eq(Array.from(h.run('position')),manual);
 for(const late of [false,true]){
  const city=fixture(root,'?layer=city&category=bar',{late});eq(city.run('category'),'bar','city category on '+(late?'late':'normal')+' load');eq(city.run('layer'),'city');eq(city.run('radius'),0);
  success(city,[own[0]+.001,own[1]+.001]);eq(city.run('layer'),'city');eq(city.run('category'),'bar');eq(city.run('radius'),0);
  for(const q of ['?category=conference','?layer=conferences']){const f=fixture(root,q,{late});eq(f.run('category'),'conference','conference deep link');eq(f.run('layer'),'events');}
 }
 console.log('PASS combined state, GPS, map callbacks, late loading: '+root.path);
}
console.log(JSON.stringify({pass:true,routes:roots.length,checks,realAppAndLocationControl:true,mockedDOMLeafletGPS:true,physicalDeviceTest:false}));
