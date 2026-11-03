'use strict';
// Actual source filtering with mocked DOM only. No browser, fetch or file writes.
const fs=require('node:fs'),assert=require('node:assert/strict');
const harness=fs.readFileSync('scripts/test-conference-filters.cjs','utf8').split('for(const root of roots){')[0];
const {fixture,roots}=new Function('require',harness+';return {fixture,roots};')(require);
const target='tkt:507968';
for(const root of roots.filter(r=>r.city==='tbilisi')){
 const f=fixture(root,{sentinels:false});
 f.ctx.__feed=JSON.parse(fs.readFileSync('public/'+root.locale+'events.json'));
 f.run("__now=Date.parse('2026-10-18T00:23:00+04:00');catalog=__feed;events=catalog.events.map(e=>({...e}));dates=['2026-10-18','2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24'];day=1;layer='events';view='explore';category='all';radius=0;freeOnly=false;time='all';language='all';searchTerm='';hideCinema=false;");
 const ids=()=>f.json('visible().map(e=>e.id)');
 assert.equal(ids().length,168,root.path+' all-city count includes the verified Eva Orthmann lecture');
 f.run("category='workshop'");assert.deepEqual(ids(),[target],root.path+' practices reveals source-backed class');
 f.run("category='theatre'");assert.equal(ids().length,1,root.path+' theatrical listing retained');assert(!ids().includes(target));
 f.run("category='conference'");assert.equal(ids().length,0,root.path+' no title-based conference invention');
 f.run("category='workshop';radius=.5;position=[41.7011268,44.7962925]");assert.equal(ids().length,0,root.path+' respect Opera500m rather than widening');
 assert.equal(f.run('radius'),.5);assert.equal(f.run('day'),1);
 f.run("radius=0;time='day'");assert.equal(ids().length,0,root.path+' 18:00 not a daytime class');
 f.run("time='evening'");assert.deepEqual(ids(),[target],root.path+' 18:00 evening class');
 f.run("time='all';__now=Date.parse('2026-10-19T19:59:59+04:00')");assert.deepEqual(ids(),[target],root.path+' existing two-hour visibility grace preserved');
 f.run("__now=Date.parse('2026-10-19T20:00:00+04:00')");assert.equal(ids().length,0,root.path+' existing expiry boundary preserved');
}
console.log('PASS: RU/EN actual all-city/category/date/time/radius/conference/expiry filters; count168 and no automatic radius widening. DOM simulation only.');
