const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
for(const city of ['', 'belgrade/', 'moscow/', 'palo-alto/', 'paris/', 'london/']){
 const code=fs.readFileSync('public/'+city+'app.js','utf8');
 assert.match(code,/radius=\.5,limit/);
 for(const saved of [{radius:3},{radius:5},{radius:0},{radius:0,radiusVersion:1},{radius:.5,radiusVersion:1}]){
  const ctx={position:[0,0],radius:.5,nearKey:'test',location:{hash:''},URLSearchParams,localStorage:{getItem:()=>JSON.stringify({...saved,position:[44.82,20.45]})}};
  vm.createContext(ctx);vm.runInContext(code.split('\n').find(x=>x.startsWith('function restoreNear()')),ctx);ctx.restoreNear();
  assert.equal(ctx.radius,saved.radiusVersion===1&&saved.radius===0?0:.5,city+JSON.stringify(saved));
  assert.deepEqual(Array.from(ctx.position),[44.82,20.45]);
 }
 const html=fs.readFileSync('public/'+city+'map.html','utf8');
 const options=html.match(/id="radiusFilter"[^>]*>(.*?)<\/select>/s)[1];
 assert.equal((options.match(/<option/g)||[]).length,2);
 assert.match(options,/value="0.5"/);
}
console.log('All six cities: 500 m radius default, legacy migration, saved centre and explicit whole-city choice pass.');
