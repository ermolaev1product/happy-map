const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const stub=new Proxy(function(){},{get:(o,k)=>k==='querySelector'?()=>stub:k==='querySelectorAll'?()=>[]:k==='classList'?{add(){},remove(){},toggle(){}}:k==='value'?'all':stub,apply:()=>stub,set:()=>true});
const ctx=vm.createContext({console,Intl,Date:class extends Date{constructor(...args){super(...(args.length?args:['2026-10-10T07:00:00Z']));}static now(){return Date.parse('2026-10-10T07:00:00Z');}},URL,URLSearchParams,document:{querySelector:()=>stub,querySelectorAll:()=>[]},localStorage:{getItem:()=>null},window:stub,location:{search:'',hash:''},history:stub,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},navigator:{},ResizeObserver:class{observe(){}},fetch:()=>{},Map,Set});
vm.runInContext(fs.readFileSync('public/discovery-model.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('public/palo-alto/app.js','utf8'),ctx);
const data=JSON.parse(fs.readFileSync('public/palo-alto/events.json'));
ctx.input=data;vm.runInContext(`events=input.events;dates=['2026-10-10','2026-10-11'];catalogDates=['2026-10-10','2026-10-11','2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18'];searchTerm='';day=-1;radius=0;`,ctx);
const count=vm.runInContext('visible().length',ctx);assert(count>160);
assert(vm.runInContext(`visible().some(e=>e.title.includes('Criminal Queers')&&e.accessType==='restricted')`,ctx));
vm.runInContext(`accessFilter='open'`,ctx);assert(!vm.runInContext(`visible().some(e=>e.accessType==='restricted'||e.accessType==='unknown')`,ctx));
const exhibition=data.events.find(e=>e.title.startsWith('JANE!'));
ctx.ex=exhibition;assert(!vm.runInContext(`NoreliDiscovery.availableOnDate(ex,'2026-10-13')`,ctx));assert(vm.runInContext(`NoreliDiscovery.availableOnDate(ex,'2026-10-15')`,ctx));
assert.equal(exhibition.visitSchedule['2026-10-15'].end,'20:00');
assert.equal(new Set(data.events.map(e=>e.id)).size,data.events.length);
for(const e of data.events){assert(e.sourceUrl.startsWith('https://'));assert(e.accessType);assert(e.price===null||e.price>=0);assert(e.lat===null||e.lat>37);assert(e.lng===null||e.lng<-121)}
assert(data.events.filter(e=>e.source==='Meyhouse Jazz').slice(0,2).every(e=>e.soldOut));
console.log({allFuture:count,total:data.events.length,open:vm.runInContext('visible().length',ctx),stanfordRestricted:data.events.filter(e=>e.source==='Stanford Events'&&e.accessType==='restricted').length});

assert.equal(vm.runInContext("priceText({price:126,priceMax:141})",ctx),"$126–$141");
assert.equal(vm.runInContext("priceText({price:null,priceStatus:'not_published'})",ctx),"Price not listed");
assert.equal(vm.runInContext("priceText({price:0})",ctx),"Free");
for(const e of data.events.filter(e=>e.priceCheckedAt&&e.price!==null))assert(e.priceEvidenceUrl);

assert.equal(vm.runInContext("timeLabel('00:00')",ctx),"12:00 am");
assert.equal(vm.runInContext("timeLabel('18:30')",ctx),"6:30 pm");
assert.equal(vm.runInContext("eventCount(1)",ctx),"1 event");
assert.equal(vm.runInContext("placeCount(2)",ctx),"2 places");
