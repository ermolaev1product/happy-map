const {readFileSync}=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
(async()=>{
 const source=readFileSync('public/freshness.js','utf8');
 for(const selected of [0,1,-1]){
  const nodes={'.month-label':{querySelector:()=>null},'#organizerDay':{}};
  const ctx={console,Date,Promise,setInterval:()=>{},document:{hidden:false,documentElement:{lang:'ru'},addEventListener:()=>{}},window:{addEventListener:()=>{}},$:s=>nodes[s],today:()=> '2026-10-13',dates:['2026-10-12','2026-10-13','2026-10-14'],day:selected,catalog:{events:[],endDate:'2026-10-20'},catalogDates:[],places:[],events:[],render:()=>{},NoreliDiscovery:{connect:places=>({places})},venueIndex:null,loadCatalog:async()=>({events:[{id:'new',date:'2026-10-13',category:'lecture'}],endDate:'2026-10-20'}),loadPlaces:async()=>[]};
  vm.createContext(ctx);vm.runInContext(source,ctx);await ctx.window.happyMapRefresh();
  assert.equal(ctx.dates[0],'2026-10-13');assert.equal(ctx.day,selected<0?-1:0);assert.equal(ctx.events[0].id,'new');assert.equal(ctx.events[0].category,'talk');assert.equal(ctx.catalogDates[0],'2026-10-13');
  ctx.loadCatalog=async()=>{throw Error('offline')};await ctx.window.happyMapRefresh();assert.equal(ctx.events[0].id,'new');
 }
 console.log('PASS: overnight resume, chosen date, whole week, fresh catalog, offline retention');
})();
