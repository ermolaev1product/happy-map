const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Browser scripts run as classic scripts even though this repository uses ESM.
for(const city of ['', 'belgrade/', 'moscow/', 'palo-alto/', 'paris/', 'london/']){
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(`public/${city}map-layout.js`,'utf8'),context);
const layout=vm.runInContext('MorrowMapLayout',context);
const points=Array.from({length:80},(_,i)=>({x:28+(i%8)*42,y:70+Math.floor(i/8)*43,item:{id:i}}));
const groups=layout(points,390,620,14);
assert.equal(groups.flatMap(g=>g.items).length,80);
assert.equal(new Set(groups.flatMap(g=>g.items.map(i=>i.id))).size,80);
const labels=groups.filter(g=>g.labelRect).map(g=>g.labelRect);
const overlaps=(a,b)=>a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t;
for(let i=0;i<labels.length;i++){assert(labels[i].l>=8&&labels[i].r<=382);for(let j=0;j<i;j++)assert(!overlaps(labels[i],labels[j]));for(const g of groups)assert(!overlaps(labels[i],{l:g.x-23,r:g.x+23,t:g.y-23,b:g.y+23}));}
assert.equal(layout([{x:100,y:100,item:1},{x:115,y:110,item:2}],390,620,14).length,1);
assert.equal(layout([{x:100,y:100,item:1},{x:180,y:110,item:2}],390,620,17).length,2);
console.log('80-event stress check: all events retained; labels never overlap markers or each other; clusters split with separation.');
}
