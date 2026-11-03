const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const adapter=fs.readFileSync('public/assets/maplibre/leaflet-maplibre-gl.js','utf8');
const camera=adapter.slice(adapter.indexOf('        _transformGL: function (gl) {')+42,adapter.indexOf('        // update the map constantly'));
// Exercise the adapter against a MapLibre 5-style immutable transform snapshot.
const body=adapter.match(/_transformGL: function \(gl\) \{([\s\S]*?)\n        \},/)[1];
let actual;
const gl={get transform(){return Object.freeze({center:{lat:0,lng:0},zoom:0});},jumpTo:v=>actual=v};
const leaflet={getCenter:()=>({lat:44.823,lng:20.451}),getZoom:()=>14};
new Function('gl',body).call({_map:leaflet},gl);
assert.deepEqual(actual,{center:[20.451,44.823],zoom:13});
let marker,circle,callback,keyboard;
const listeners={}, area={style:{},addEventListener:(k,f)=>listeners[k]=f,removeEventListener:k=>delete listeners[k]};
const docEvents={};
let pan=true;
const map={dragging:{enabled:()=>pan,disable:()=>pan=false,enable:()=>pan=true},
 on(){},off(){},latLngToContainerPoint:p=>({x:p.lng,y:p.lat}),
 containerPointToLatLng:p=>({lng:p[0],lat:p[1]})};
const ctx={window:{},document:{documentElement:{lang:'en'},addEventListener:(k,f)=>docEvents[k]=f,removeEventListener:k=>delete docEvents[k]},L:{
 divIcon:o=>o,
 circle:(p,o)=>circle={point:p,options:o,on(){return this;},getElement:()=>area,addTo(){return this;},setLatLng(p){this.point=p;}},
 marker:(p,o)=>marker={point:{lat:p[0],lng:p[1]},options:o,events:{},addTo(){return this;},bindTooltip(){return this;},on(k,f){this.events[k]=f;return this;},getLatLng(){return this.point;},setLatLng(p){this.point=p;},getElement(){return {addEventListener:(k,f)=>keyboard=f};}}
}};
vm.runInNewContext(fs.readFileSync('public/map-basemap.js','utf8'),ctx);
ctx.window.HappyMapSearch.origin(map,[44.8,20.4],3,p=>callback=p);
assert.equal(circle.options.interactive,true);assert.equal(marker.options.draggable,true);assert.equal(marker.options.autoPan,false);
marker.point={lat:44.823,lng:20.451};marker.events.drag();assert.deepEqual(circle.point,marker.point);
assert.equal(callback,undefined);marker.events.dragend();assert.deepEqual(Array.from(callback),[44.823,20.451]);
console.log('Map camera and independent search drag checks pass.');

const event=(x,y)=>({pointerId:1,button:0,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
listeners.pointerdown(event(100,100));assert.equal(pan,false);
docEvents.pointermove(event(110,120));
assert.ok(Math.abs(marker.point.lat-64.823)<1e-9);assert.equal(marker.point.lng,30.451);
docEvents.pointerup(event(110,120));assert.equal(pan,true);
assert.ok(Math.abs(callback[0]-64.823)<1e-9);assert.equal(callback[1],30.451);
listeners.pointerdown(event(100,100));docEvents.pointermove(event(150,150));
docEvents.pointercancel(event(150,150));assert.equal(pan,true);
assert.ok(Math.abs(marker.point.lat-64.823)<1e-9);assert.equal(marker.point.lng,30.451);
assert.equal(docEvents.pointermove,undefined);
console.log('Area dragging preserves grab offset, commits on release and cancels safely.');
