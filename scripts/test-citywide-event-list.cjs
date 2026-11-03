// Real localized app and catalogue logic; mocked DOM, no physical-device claim.
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=fs.readFileSync('scripts/test-catalog-modes.cjs','utf8').split('let checks=0;')[0];
const {fixture,roots}=new Function('require',base+';return {fixture,roots};')(require);
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
for(const root of roots){
 const f=fixture(root),r=f.run;
 r(`position=[40,44];layer='events';view='explore';category='all';freeOnly=false;time=language='all';searchTerm='';day=0;radius=.5;distanceSort=true;limit=18;
 events=Array.from({length:39},(_,i)=>({id:'e'+i,title:'Event '+i,category:i===2?'talk':'music',date:'2099-10-16',time:'21:00',price:i===3?10:0,language:i===4?'RU':'EN',lat:40+i*.01,lng:44})).reverse();events.find(e=>e.id==='e38').lat=null;
 events.push({id:'cancelled',title:'Cancelled',cancelled:true,date:'2099-10-16',category:'music',lat:40,lng:44});render();`);
 eq(r('visible().length'),39,root.path+' citywide list');eq(r('radius'),.5,'radius preserved');
 eq(Array.from(r('visible().map(e=>e.id)')),Array.from({length:39},(_,i)=>'e'+i),'nearest first; unknown last');
 eq(r('visible().filter(e=>distance(e)<=radius).length'),1,'separate nearby count');
 eq((f.nodes.get('#eventList').innerHTML.match(/<article /g)||[]).length,39,'ordinary selection fully rendered');
 eq(r('mapPlaces(visible()).length'),39,'map/list selection parity');
 r("category='music';freeOnly=true;language='EN';time='evening';render()");eq(r('visible().length'),36,'category, price, language and time retained');
 r("time='day';render()");eq(r('visible().length'),0,'time filter retained');
 r("category='all';freeOnly=false;time=language='all';searchTerm='event 12';render()");eq(r('visible().length'),1,'search retained');
 r("searchTerm='';day=1;render()");eq(r('visible().length'),0,'date retained');
 r("day=0;events=Array.from({length:120},(_,i)=>({id:'large'+i,title:'Large '+i,category:'music',date:'2099-10-16',time:'21:00',lat:40+i*.01,lng:44}));limit=18;render()");
 eq(r('visible().length'),120);eq((f.nodes.get('#eventList').innerHTML.match(/<article /g)||[]).length,100,'large list retains incremental loading');
 eq(f.nodes.get('#eventList').innerHTML.includes('id="showMore"'),true,'continuation remains available');
 r("setLayer('city');places=[{id:'far',kind:'place',title:'Far',category:'bar',lat:41,lng:44},{id:'near',kind:'place',title:'Near',category:'bar',lat:40,lng:44}];render()");
 eq(Array.from(r('visible().map(e=>e.id)')),['near','far'],'directory remains citywide nearest first');
 console.log('PASS citywide list '+root.path);
}
console.log(JSON.stringify({pass:true,routes:roots.length,checks,physicalDeviceTest:false}));
