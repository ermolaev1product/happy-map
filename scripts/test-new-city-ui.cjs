const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const stub=new Proxy(function(){},{get:(o,k)=>k==='querySelector'?()=>stub:k==='querySelectorAll'?()=>[]:k==='classList'?{add(){},remove(){},toggle(){}}:k==='value'?'all':stub,apply:()=>stub,set:()=>true});
for(const [city,zone,symbol,center] of [['paris','Europe/Paris','€',[48.8566,2.3522]],['london','Europe/London','£',[51.5074,-0.1278]]]){
 const ctx=vm.createContext({console,Intl,Date,URL,URLSearchParams,document:{querySelector:()=>stub,querySelectorAll:()=>[]},localStorage:{getItem:()=>null},window:stub,location:{search:'',hash:''},history:stub,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},navigator:{},ResizeObserver:class{observe(){}},fetch:()=>{},Map,Set});
 vm.runInContext(fs.readFileSync('public/discovery-model.js','utf8'),ctx);
 vm.runInContext(fs.readFileSync(`public/${city}/app.js`,'utf8'),ctx);
 assert.equal(vm.runInContext('cityFolder',ctx),city+'/');
 assert.equal(vm.runInContext('nearKey',ctx),'happy-map-near-'+city+'-v1');
 assert.equal(vm.runInContext('position.join(",")',ctx),center.join(','));
 assert.equal(vm.runInContext('today()',ctx),new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
 assert.equal(vm.runInContext('priceText({price:10,priceMax:20})',ctx),symbol+'10–'+symbol+'20');
 assert.equal(vm.runInContext('priceText({price:null})',ctx),'Price not verified yet');
 assert.equal(vm.runInContext('priceText({price:0})',ctx),'Free');
 assert.equal(vm.runInContext('distance({lat:null,lng:null})',ctx),Infinity);
 assert.equal(vm.runInContext('languageLabel("FR")',ctx),'French');
 assert.equal(vm.runInContext('NoreliDiscovery.onDate({date:"2099-01-01",validDates:["2099-01-01"]},"2099-01-02")',ctx),false);
 assert.equal(vm.runInContext('timeLabel("19:30")',ctx),city==='paris'?'19:30':'7:30 pm');
 for(const name of ['index.html','map.html','invite-en.html','invite.html','share.html']){
  const html=fs.readFileSync(`public/${city}/${name}`,'utf8');
  assert(!/Palo Alto|Stanford|Tbilisi|California/.test(html));
  assert(html.includes('https://happymap.app/'+city+'/'));
 }
 console.log(city+': currency, timezone, coordinates, access calendar and city-specific links passed');
}
