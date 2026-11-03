const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
for(const city of ['', 'belgrade/', 'moscow/', 'palo-alto/', 'paris/', 'london/']){
 const code=fs.readFileSync('public/'+city+'app.js','utf8');
 const fn=code.slice(code.indexOf('function mapPlaces('),code.indexOf('function renderMap('));
 const near=[{id:'near'}],all=[...near,{id:'far'}];
 const ctx={radius:.5,view:'explore',layer:'places',visible:()=>ctx.radius?near:all};vm.createContext(ctx);vm.runInContext(fn,ctx);
 assert.deepEqual(ctx.mapPlaces(near),all);assert.equal(ctx.radius,.5);
 assert.deepEqual(ctx.mapPlaces([]),all);
 ctx.view='plans';assert.deepEqual(ctx.mapPlaces(near),near);
 ctx.view='explore';ctx.layer='events';assert.deepEqual(ctx.mapPlaces(near),all);assert.deepEqual(ctx.mapPlaces([]),all);
 ctx.layer='places';ctx.visible=()=>{throw Error('test')};assert.throws(()=>ctx.mapPlaces([]));assert.equal(ctx.radius,.5);
 const scope={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('public/'+city+'map-layout.js','utf8'),scope);const layout=scope.module.exports;
 const groups=layout([{x:100,y:100,focus:true,item:near[0]},{x:101,y:101,focus:false,item:all[1]}],500,500,15);
 assert.equal(groups.length,2);assert.equal(groups.filter(g=>g.focus).length,1);
}
console.log('All cities: nearby list stays filtered; map retains distant places; plans unchanged; events included; clusters keep inside/outside separate.');
