const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let checks=0;
for(const route of ['','en/'])for(const language of ['ru','en','de'])for(const radius of [.5,0]){
 const elements=[],handlers=[];
 const shape=(point,options)=>{const el={style:{},addEventListener:(...a)=>handlers.push(a)};elements.push(el);return {point:[...point],options,el,addTo(){return this},bindTooltip(text,o){this.tooltip={text,o};return this},getElement(){return el},on(...args){handlers.push(args);return this}}};
 const ctx={window:{},document:{documentElement:{lang:language},addEventListener:(...args)=>handlers.push(args)},L:{circle:shape,marker:shape,divIcon:x=>x}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/'+route+'map-basemap.js','utf8'),ctx);
 let changed=0;const map={dragging:{disable(){throw Error('Must never disable map pan')},enable(){},enabled(){return true}}};
 const out=ctx.window.HappyMapSearch.origin(map,[41.7,44.8],radius,()=>changed++);
 assert.equal(out.marker.options.draggable,false);assert.equal(out.marker.options.interactive,false);assert.equal(out.marker.options.keyboard,false);assert.equal(out.marker.el.style.pointerEvents,'none');assert.equal(out.marker.tooltip.o.interactive,false);
 if(radius){assert.equal(out.circle.options.interactive,false);assert.equal(out.circle.el.style.pointerEvents,'none');assert.equal(out.circle.options.radius,500)}else assert.equal(out.circle,null);
 assert.equal(handlers.length,0,'No pointer, touch, mouse, keyboard or drag handlers intercept pan/zoom');assert.equal(changed,0);assert.deepEqual(out.marker.point,[41.7,44.8]);assert.ok(!/Drag|Перетащ/.test(out.marker.options.title));checks+=11;
}
console.log(`${checks} geographic-origin gesture invariants passed across RU/EN/DE and radius/whole-city modes`);
