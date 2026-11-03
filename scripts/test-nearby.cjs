const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const city of ['', 'belgrade/','moscow/']){
 const code=fs.readFileSync(__dirname+'/../public/'+city+'app.js','utf8');
 const ctx={Date:class extends Date{static now(){return Date.parse('2026-10-04T00:00:00Z');}},searchTerm:'',layer:'events',position:[41.7044,44.7935],radius:1,day:0,dates:['2026-10-04'],view:'explore',category:'all',freeOnly:false,hideCinema:false,time:'all',language:'all',distanceSort:true,ascending:true};
 ctx.events=[{id:'far',lat:41.7444,lng:44.7935,date:'2026-10-04',time:'08:00'},{id:'near',lat:41.7054,lng:44.7935,date:'2026-10-04',time:'22:00'},{id:'middle',lat:41.7104,lng:44.7935,date:'2026-10-04',time:'18:00'},{id:'unknown',lat:null,lng:null,date:'2026-10-04',time:'06:00'}];ctx.saved=[];ctx.eventById=id=>ctx.events.find(e=>e.id===id);vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../public/discovery-model.js','utf8'),ctx);
 vm.runInContext(code.split('\n').filter(l=>l.startsWith('function distance(')||l.startsWith('function visible(')).join('\n'),ctx);
 assert.deepStrictEqual(Array.from(ctx.visible(),e=>e.id),['near','middle']);
 ctx.radius=0;assert.deepStrictEqual(Array.from(ctx.visible(),e=>e.id),['near','middle','far','unknown']);
 ctx.saved=[ctx.events[0],ctx.events[1]];ctx.view='plans';ctx.radius=.5;assert.deepStrictEqual(Array.from(ctx.visible(),e=>e.id),['far','near']);
 ctx.layer='city';ctx.view='explore';ctx.radius=1;ctx.placeCategory='all';ctx.places=ctx.events.map(e=>({...e,kind:'place',category:e.id==='near'?'bar':'market',date:undefined,time:undefined}));ctx.eventById=id=>ctx.places.find(e=>e.id===id);assert.deepStrictEqual(Array.from(ctx.visible(),e=>e.id),['near','middle']);ctx.day=6;assert.deepStrictEqual(Array.from(ctx.visible(),e=>e.id),['near','middle']);ctx.placeCategory='market';assert.deepStrictEqual(Array.from(ctx.visible(),e=>e.id),['middle']);ctx.view='plans';ctx.savedPlaces=[ctx.places[0]];assert.deepStrictEqual(Array.from(ctx.visible(),e=>e.id),['far']);
}
console.log('Nearby checks pass: radius, distance order, unknown coordinates and chronological saved plans in all three cities.');
