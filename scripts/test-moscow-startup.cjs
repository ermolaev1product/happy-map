/* Source-derived startup fault tests. No browser, network, or production writes. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||process.cwd()),overlay=process.argv[3];
const read=file=>fs.readFileSync(overlay&&fs.existsSync(path.join(overlay,file))?path.join(overlay,file):path.join(root,file),'utf8');
const locales=process.env.TEST_LOCALES==='ru'?['']:['','en/'];
const instant=Date.parse('2026-10-14T12:00:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[instant]));}static now(){return instant;}}
function node(){return {innerHTML:'',textContent:'',hidden:false,dataset:{},style:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},querySelector:()=>node(),querySelectorAll:()=>[],addEventListener(){},closest:()=>node(),after(){},append(){},insertAdjacentHTML(){}};}
function point(x,y){return {x,y,multiplyBy(n){return point(x*n,y*n);},subtract(p){return point(x-p.x,y-p.y);}};}
function context(locale,failure){
 const nodes=new Map(),get=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);};
 const handlers={},layers=new Set(),resizeObservers=[];let tiles=0;
 const pane={appendChild(n){n.parentNode=this;},removeChild(n){n.parentNode=null;}};
 const map={_proxy:{},options:{zoomAnimation:true},on(name,fn,owner){if(typeof name==='object'){for(const [n,f] of Object.entries(name))this.on(n,f,fn);return this;}(handlers[name]??=[]).push([fn,owner]);return this;},once(){return this;},off(name,owner){for(const n of Object.keys(name||{}))handlers[n]=(handlers[n]||[]).filter(x=>x[1]!==owner);return this;},getPane:()=>pane,getContainer:()=>get('#map'),getCenter:()=>({lat:55.757,lng:37.615}),getZoom:()=>15,getSize:()=>point(900,600),containerPointToLayerPoint:()=>point(0,0),latLngToContainerPoint:()=>point(400,300),setView(){return this;},fitBounds(){for(const name of ['zoom','moveend','zoomend'])for(const [f,owner] of handlers[name]||[])f.call(owner,{});return this;},invalidateSize(){},hasLayer:l=>layers.has(l),removeLayer(layer){if(!layers.has(layer))return;layer.onRemove(this);layers.delete(layer);this.off(layer.getEvents(),layer);layer._map=null;},remove(){for(const layer of [...layers])this.removeLayer(layer);}};
 const L={map(){if(failure==='leaflet')throw Error('Injected Leaflet failure');return map;},latLng:()=>({toBounds:()=>[]}),setOptions:(o,opts)=>o.options={...o.options,...opts},extend:Object.assign,Util:{throttle:(f,t,o)=>f.bind(o)},DomUtil:{create:node,setPosition(){},setTransform(){},addClass(){},TRANSITION_END:'transitionend'},DomEvent:{on(){},off(){}},tileLayer:()=>({on(){return this;},addTo(){tiles++;return this;}}),control:()=>({addTo(){return this;}}),divIcon:o=>o,marker:()=>({addTo(){return this;},bindTooltip(){return this;},on(){return this;},remove(){}})};
 // Match Leaflet's documented lifecycle order: register handlers, then onAdd;
 // onRemove must complete before remove deregisters those handlers.
 L.Layer={extend(def){function Layer(opts){this.initialize(opts);}Layer.prototype={...def,addTo(m){this._map=m;layers.add(this);m.on(this.getEvents(),this);this.onAdd(m);return this;}};return Layer;}};
 const gl={transform:{width:900,height:600},_canvas:node(),jumpTo(){if(failure==='cleanup')throw Error('Injected camera startup failure');},on(){},resize(){},_update(){},remove(){if(failure==='cleanup')throw Error('Injected GL teardown failure');}};
 const ctx={console:{...console,warn(){}},Intl,Date:Clock,URL,URLSearchParams,Map,Set,AbortController,document:{querySelector:get,querySelectorAll:()=>[],body:node(),documentElement:{lang:locale?'en':'ru'},createElement:node},localStorage:{getItem:()=>null},location:{search:'',hash:'',pathname:'/'+locale+'moscow/',hostname:'happymap.app'},history:{},innerWidth:1200,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},navigator:{},ResizeObserver:class{constructor(f){resizeObservers.push(f);}observe(){}},L,maplibregl:{Map:class{constructor(){if(failure==='webgl')throw Error('Injected unavailable WebGL');return gl;}}}};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(read('public/'+locale+'discovery-model.js'),ctx);
 vm.runInContext(read('public/'+locale+'assets/maplibre/leaflet-maplibre-gl.js'),ctx);
 vm.runInContext(read('public/'+locale+'map-basemap.js'),ctx);
 ctx.HappyMapSearch.origin=()=>{if(failure==='origin')throw Error('Injected origin failure');return {marker:{remove(){}},circle:{remove(){}}};};
 vm.runInContext(read('public/'+locale+'moscow/map-layout.js'),ctx);
 vm.runInContext(read('public/'+locale+'moscow/app.js'),ctx);
 vm.runInContext(read('public/'+locale+'discovery.js').replace(/^start\(\)\.then\([^\n]+$/m,''),ctx);
 vm.runInContext(`loadCatalog=async()=>({startDate:'2026-10-14',endDate:'2026-10-20',generatedAt:'2026-10-14T12:00:00Z',events:[{id:'fixture',title:'Future show',date:'2026-10-14',time:'20:00',category:'music',price:0,venue:'Fixture venue',lat:55.757,lng:37.615}]});loadPlaces=async()=>[];`,ctx);
 return {ctx,nodes,layers,handlers,resizeObservers,get tiles(){return tiles;}};
}
(async()=>{
 let checks=0;
 for(const locale of locales)for(const failure of ['none','webgl','cleanup','leaflet','origin']){
  const t=context(locale,failure);await vm.runInContext('start()',t.ctx);
  assert.equal((t.nodes.get('#calendar')?.innerHTML.match(/data-day=/g)||[]).length,7,locale+failure+': calendar');
  assert(t.nodes.get('#eventList').innerHTML.includes('data-open="fixture"'),locale+failure+': event cards');
  assert(t.nodes.get('#categories').innerHTML.includes('data-category='));
  assert.notEqual(t.nodes.get('#sourcesButton').disabled,true);
  assert.equal(vm.runInContext('radius',t.ctx),.5);assert.equal(vm.runInContext('nearKey',t.ctx),'morrow-near-moscow-v1');
  for(const callback of t.resizeObservers)callback();
  if(['webgl','cleanup'].includes(failure)){assert.equal(t.layers.size,0);assert.equal(t.tiles,1);assert.equal((t.handlers.zoom||[]).length,0);assert(vm.runInContext('!!map',t.ctx));}
  if(failure==='leaflet'){assert.equal(vm.runInContext('map',t.ctx),null);assert.equal(t.nodes.get('#mapFallback').hidden,false);}
  console.log('PASS',locale+'moscow',failure,'calendar/cards/categories/radius and teardown');checks++;
 }
 console.log('PASS',checks,'Moscow startup scenarios');
})().catch(error=>{console.error(error);process.exitCode=1;});
