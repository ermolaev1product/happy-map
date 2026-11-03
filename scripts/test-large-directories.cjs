const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('public/discovery-model.js','utf8'),ctx);const model=ctx.module.exports;
const rows=Array.from({length:40000},(_,i)=>({id:'p'+i,title:'Venue '+i,lat:51+(i%200)*.002,lng:-.3+Math.floor(i/200)*.002,kind:'place'}));
const event={id:'e',title:'Live',venue:'Venue 12345 Music',lat:rows[12345].lat+.0001,lng:rows[12345].lng,date:'2026-10-18',time:'20:00'};
const result=model.connect(rows,[event]);assert.equal(result.links.get('e'),'p12345');assert.equal(result.places.length,40000);
for(const city of ['london','paris','moscow','palo-alto','flensburg']){
 const raw=JSON.parse(fs.readFileSync(`public/${city}/places.json`));const p=raw.places||raw;assert.equal(new Set(p.map(x=>x.id)).size,p.length);assert(p.every(x=>typeof x.title==='string'));
 const file=fs.existsSync(`public/${city}/discovery.js`)?`public/${city}/discovery.js`:'public/discovery.js';const code=fs.readFileSync(file,'utf8');const expression=code.match(/const valid=(.*?);\n/)[1];const valid=vm.runInNewContext('('+expression+')');assert(valid(p),city+' accepts full catalogue');assert(!valid([{id:'broken'}]));
}
console.log('Large directory loading, unique IDs, 40k-place venue matching and invalid input checks passed.');
