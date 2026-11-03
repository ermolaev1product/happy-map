const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(root+'/public/palo-alto/events.json'));
const event=data.events.find(e=>e.id==='pa-0c5834ed4d0ef40b');
const now=Date.parse('2026-10-14T12:00:00-07:00');
class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
const ctx=vm.createContext({Date:Clock});
vm.runInContext(fs.readFileSync(root+'/public/palo-alto/promotion-demo.js','utf8'),ctx);const demo=ctx.HappyMapPromotionDemo;
assert.equal(demo.active(event),true);assert.equal(demo.active(event,false),false);
for(const other of data.events.filter(e=>e.id!==event.id))assert.equal(demo.active(other),false);
assert.equal(demo.active({...event,date:'2026-10-14'}),false);
assert.equal(demo.active({...event,kind:'place'}),false);
assert.equal(demo.active({...event,cancelled:true}),false);
assert.equal(demo.active({...event,status:'cancelled'}),false);
assert.equal(demo.active(event,true,Date.parse(event.endAt)),false);
assert.equal(demo.active(event,true,Date.parse(event.endAt)-1),true);
assert.match(demo.badge(event),/Promotion demo/);assert.match(demo.disclosure(event),/No payment was received/);assert.match(demo.marker(event),/aria-hidden="true"/);
const preview=fs.readFileSync(root+'/public/palo-alto/promotion-preview.js','utf8');new vm.Script(preview);
assert.doesNotMatch(preview,/localStorage|sessionStorage|persistNear|toggleSave|checkout\(|fetch\([^\n]+method:/);
for(const file of ['index.html','map.html','app.js','discovery.js','style.css'])assert.doesNotMatch(fs.readFileSync(root+'/public/palo-alto/'+file,'utf8'),/promotion-demo|HappyMapPromotionDemo/,'no normal-map or feed rollout');
const html=fs.readFileSync(root+'/public/palo-alto/promotion-demo.html','utf8');assert.match(html,/noindex,follow/);assert.match(html,/No payment was received/);assert(html.indexOf('promotion-demo.js')<html.indexOf('promotion-preview.js'));
const disabled=vm.createContext({Date:Clock});vm.runInContext(fs.readFileSync(root+'/public/palo-alto/promotion-demo.js','utf8').replace('const ENABLED = true','const ENABLED = false'),disabled);assert.equal(disabled.HappyMapPromotionDemo.active(event),false);assert.equal(disabled.HappyMapPromotionDemo.badge(event),'');
async function previewTest({failure=false,ended=false}={}){
 const nodes=new Map(),writes=[],markers=[];
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',checked:id==='#demoToggle',hidden:true,open:false,isConnected:true,events:{},addEventListener(name,fn){this.events[name]=fn;},showModal(){this.open=true;},close(){this.open=false;this.events.close?.();},focus(){this.focused=true;},getBoundingClientRect(){return {left:0,right:500,top:0,bottom:500};}});return nodes.get(id);};
 class TestClock extends Clock{static now(){return ended?Date.parse(event.endAt):now;}}
 const sandbox=vm.createContext({Date:TestClock,console,Intl,URL,document:{querySelector:node,activeElement:null},fetch:async url=>{assert.equal(url,'events.json');if(failure)return {ok:false};return {ok:true,json:async()=>data};},ResizeObserver:class{observe(){}},localStorage:{getItem(){throw Error('No storage access allowed');},setItem(...args){writes.push(args);}},HappyMapBasemap:{addTo(){}},L:{map:()=>({setView(){return this;},invalidateSize(){}}),control:{zoom:()=>({addTo(){}})},divIcon:x=>x,marker:(point,options)=>{const m={point,options,remove(){this.removed=true;},addTo(){return this;},bindTooltip(text){this.tooltip=text;return this;},on(name,fn){this[name]=fn;return this;},getElement(){return {querySelector:()=>node('#pin')};}};markers.push(m);return m;}}});
 vm.runInContext(fs.readFileSync(root+'/public/palo-alto/promotion-demo.js','utf8'),sandbox);await vm.runInContext(preview,sandbox);
 if(failure){assert.equal(node('#demoState').textContent,'Preview unavailable');assert.equal(node('#demoToggle').disabled,true);assert.match(node('#previewCard').innerHTML,/could not be loaded/);return;}
 assert.equal(markers.length,1);assert.deepEqual(Array.from(markers[0].point),[event.lat,event.lng]);assert.match(node('#previewCard').innerHTML,/Thursday, October 22, 2026/);assert.match(node('#previewCard').innerHTML,/6:30 PM–8:30 PM/);assert.match(node('#previewCard').innerHTML,/\$15/);assert.match(node('#previewCard').innerHTML,/E-104 Einstein Room/);
 if(ended){assert.equal(node('#demoToggle').disabled,true);assert.doesNotMatch(markers[0].options.icon.html,/promotion-demo-crown/);assert.match(node('#previewCard').innerHTML,/event has ended/);return;}
 assert.match(markers[0].options.icon.html,/promotion-demo-crown/);assert.match(markers[0].options.icon.html,/aria-label="AI Agent Arena · Thursday, October 22, 2026 · Promotion demo"/);assert.match(markers[0].tooltip,/Promotion demo/);
 node('#openDetails').onclick({currentTarget:node('#openDetails')});assert.equal(node('#previewDetails').open,true);assert.match(node('#detailsBody').innerHTML,/No payment was received/);assert.match(node('#detailsBody').innerHTML,/https:\/\/studentsync.ai\/blog\/ai-agent-arena-live-demo-night-palo-alto/);
 node('#closeDetails').onclick();assert.equal(node('#previewDetails').open,false);assert.equal(node('#openDetails').focused,true);
 markers.at(-1).click();assert.equal(node('#previewDetails').open,true);node('#closeDetails').onclick();assert.equal(node('#pin').focused,true);
 node('#demoToggle').checked=false;node('#demoToggle').onchange();assert.equal(markers.length,2);assert(markers[0].removed);assert.doesNotMatch(markers[1].options.icon.html,/promotion-demo-crown/);assert.doesNotMatch(node('#previewCard').innerHTML,/is-promoted/);
 node('#demoToggle').checked=true;node('#demoToggle').onchange();assert.equal(markers.length,3);assert(markers[1].removed);assert.match(markers[2].options.icon.html,/promotion-demo-crown/);assert.equal(writes.length,0);
 assert.equal(markers.filter(m=>!m.removed).length,1,'exactly one example, no cluster or second event');
}
(async()=>{await previewTest();await previewTest({failure:true});await previewTest({ended:true});console.log('PASS: isolated preview only; exact target/date/venue/price; no real payment claim; crown accessible name and tooltip; popup disclosure/source; repeat toggle; card/pin open; Close and focus return; missing-data and expiry states; reversible flag; no main-map integration or storage access.');})().catch(e=>{console.error(e);process.exitCode=1;});
