const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++},ok=(a,m)=>{assert.ok(a,m);checks++};
const policyContext={window:{}};vm.runInNewContext(fs.readFileSync('public/locale-policy.js','utf8'),policyContext);const policy=policyContext.window.HappyMapLocalePolicy;
const registry=JSON.parse(read('public/city-picker.json'));
const bootstrap=read('public/language-switch.js').split('})();')[0]+'})();';
function boot({query='',hash='',saved=false,blocked=false}={}){
 const added=[],store=new Map(saved?[['happymap-telegram-session','1']]:[]),window={};
 vm.runInNewContext(bootstrap,{window,location:{search:query,hash},URLSearchParams,sessionStorage:{getItem:k=>{if(blocked)throw Error();return store.get(k)},setItem:(k,v)=>{if(blocked)throw Error();store.set(k,v)}},document:{head:{append:n=>added.push(n)},createElement:()=>({})}});
 return {window,added,store};
}
async function entry({city,lang,requested='',browser='en-US',sessionBlocked=false,localBlocked=false,failed=false,hash='#tgWebAppVersion=8.0'}={}){
 let target;const storage=new Map([['morrow-city',city],['happymap-interface-language',lang]]);
 await vm.runInNewContext(read('public/telegram-entry.js'),{URL,URLSearchParams,navigator:{language:browser},sessionStorage:{setItem(){if(sessionBlocked)throw Error('denied')}},localStorage:{getItem:k=>{if(localBlocked)throw Error('denied');return storage.get(k)}},fetch:async()=>({ok:!failed,json:async()=>registry}),location:{origin:'https://happymap.app',search:requested?'?lang='+requested:'',hash,replace:u=>target=u}});
 const staged=new URL(target,'https://happymap.app');
 eq(staged.pathname,'/app-start.html','Telegram delegates to shared locale entry');
 await vm.runInNewContext(read('public/entry-language.js'),{window:{HappyMapLocalePolicy:policy},URLSearchParams,AbortSignal,localStorage:{getItem:k=>{if(localBlocked)throw Error('denied');return storage.get(k)}},fetch:async url=>({ok:!failed,json:async()=>url==='/city-picker.json'?registry:{language:'en'}}),location:{pathname:staged.pathname,search:staged.search,hash:staged.hash,replace:u=>target=u}});
 return new URL(target,'https://happymap.app');
}
function bridge({platform='android',path='/en/map',loading=false}={}){
 const nodes={},events={},listeners={},added=[],styles={},classes=new Set(),bodyClasses=new Set(),calls=[];let back,observer;
 const document={readyState:loading?'loading':'complete',documentElement:{lang:'en',classList:{add:c=>classes.add(c)},style:{setProperty:(k,v)=>styles[k]=v}},body:{classList:{contains:c=>bodyClasses.has(c)}},createElement:tag=>({tag}),head:{append:n=>added.push(n)},addEventListener:(n,fn)=>listeners['doc:'+n]=fn,querySelector:s=>nodes[s]||null,querySelectorAll:s=>nodes[s]||[],getElementById:id=>nodes[id]};
 const tg={platform,viewportStableHeight:700,safeAreaInset:{top:20,bottom:10,left:3,right:4},contentSafeAreaInset:{top:30,bottom:4},expand:()=>calls.push('expand'),ready:()=>calls.push('ready'),BackButton:{show:()=>calls.push('show'),hide:()=>calls.push('hide'),onClick:f=>back=f,offClick:f=>{if(back===f)back=null}},onEvent:(n,f)=>events[n]=f,offEvent:(n,f)=>{if(events[n]===f)delete events[n]}};
 const window={Telegram:{WebApp:tg},addEventListener:(n,f)=>listeners[n]=f,dispatchEvent:e=>calls.push(e.type)};
 const location={href:'https://happymap.app'+path,origin:'https://happymap.app',pathname:path,assign:u=>calls.push(['assign',u])};
 const context={window,document,location,URL,Event:class{constructor(type){this.type=type}},MutationObserver:class{constructor(f){this.fn=f;observer=this}observe(){this.active=true}disconnect(){this.active=false}}};
 vm.runInNewContext(read('public/telegram.js'),context);
 return {nodes,events,listeners,added,styles,classes,bodyClasses,calls,tg,location,document,context,get observer(){return observer},get back(){return back},click(a){listeners['doc:click']({target:{closest:()=>a}})}};
}
(async()=>{
 let b=boot();eq(b.added.length,0,'regular web does not load SDK/bridge');eq(b.window.HappyMapTelegram,undefined);
 for(const opts of [{query:'?miniapp=telegram'},{hash:'#tgWebAppVersion=8.0'},{saved:true},{query:'?miniapp=telegram',blocked:true}]){b=boot(opts);eq(b.window.HappyMapTelegram,true);eq(b.added.length,1);eq(b.added[0].src,'/telegram.js?v=1');}
 let u=await entry();eq(u.pathname,'/en/cities.html');eq(u.searchParams.get('miniapp'),'telegram');eq(u.hash,'#tgWebAppVersion=8.0');
 for(const c of registry.cities)for(const lang of ['ru','en','de']){u=await entry({city:c.id,lang});eq(u.pathname,policy.path(c.path,policy.choose(c.id,null,lang)),c.id+' '+lang);eq(u.searchParams.get('miniapp'),'telegram');}
 u=await entry({city:'unknown',browser:'de-DE'});eq(u.pathname,'/en/cities.html');eq(u.searchParams.get('autoLang'),'en','browser locale never overrides hosting fallback');
 u=await entry({city:'moscow',lang:'ru',requested:'en'});eq(u.pathname,'/en/moscow/index.html');
 for(const opts of [{failed:true},{localBlocked:true},{localBlocked:true,sessionBlocked:true}]){u=await entry({city:'moscow',...opts});eq(u.pathname,'/en/cities.html');}
 u=await entry({city:'moscow',lang:'ru',sessionBlocked:true});eq(u.pathname,'/moscow/index.html','session-storage failure must not discard usable city preference');
 let h=bridge({platform:'unknown'});eq(h.classes.size,0);eq(h.calls.length,0,'normal browser SDK is not expanded/readied');
 h=bridge();ok(h.classes.has('telegram-app'));eq(h.styles['--hm-tg-height'],'700px');eq(h.styles['--hm-tg-top'],'50px');eq(h.styles['--hm-tg-bottom'],'14px');ok(h.calls.includes('ready'));ok(h.calls.includes('expand'));eq(typeof h.back,'function');
 h.tg.viewportStableHeight=500;h.events.viewportChanged();eq(h.styles['--hm-tg-height'],'500px');h.tg.contentSafeAreaInset.top=8;h.events.contentSafeAreaChanged();eq(h.styles['--hm-tg-top'],'28px');
 // Last open dialog is dismissed first; no account or save action is invoked.
 let closed=0;h.nodes['dialog[open]']=[{close(){throw Error('not topmost')}},{close(){closed++;h.nodes['dialog[open]']=[]}}];h.back();eq(closed,1);ok(!h.calls.some(c=>Array.isArray(c)));
 const menu={open:true};h.nodes['.more-menu[open],.map-options[open]']=menu;h.back();eq(menu.open,false);delete h.nodes['.more-menu[open],.map-options[open]'];
 let picks=0;h.nodes['.picker-back:not([hidden])']={click:()=>picks++};h.back();eq(picks,1);delete h.nodes['.picker-back:not([hidden])'];
 h.bodyClasses.add('plan-view');h.nodes.exploreTab={click:()=>h.bodyClasses.delete('plan-view')};h.back();eq(h.bodyClasses.has('plan-view'),false);h.back();eq(h.calls.at(-1),['assign','/cities.html?miniapp=telegram&lang=en']);
 h=bridge({path:'/cities.html'});eq(h.calls.at(-1),'hide');const before=h.calls.length;h.back();eq(h.calls.length,before,'root Back must not close app or navigate away');
 h.nodes['.picker-back:not([hidden])']={click(){}};h.observer.fn();eq(h.calls.at(-1),'show');
 h=bridge({loading:true});eq(h.calls.length,0,'readiness waits for essential DOM');h.document.readyState='complete';h.listeners['doc:DOMContentLoaded']();ok(h.calls.includes('ready'));
 const a={href:'https://happymap.app/en/index.html',hasAttribute:()=>false,target:''};h.click(a);eq(new URL(a.href).pathname,'/telegram.html');eq(new URL(a.href).searchParams.get('miniapp'),'telegram');
 for(const href of ['https://example.org/event','https://happymap.app/api/auth','https://happymap.app/downloads/app.apk']){const a={href,hasAttribute:()=>false,target:''};h.click(a);eq(a.href,href,'external/API/download destinations untouched');}
 h.listeners.pagehide({persisted:true});ok(h.observer.active,'BFCache keeps observer for restored document');eq(typeof h.back,'function','BFCache keeps Back registration');
 h.listeners.pagehide({persisted:false});eq(h.observer.active,false);eq(h.back,null);eq(Object.keys(h.events).length,0);
 const source=read('scripts/test-location-control.cjs');const end=source.indexOf('\nfor(const locale');const harnessContext={require,module:{exports:{}},console,URL,URLSearchParams};vm.runInNewContext(source.slice(0,end)+'\nmodule.exports=harness;',harnessContext);const harness=harnessContext.module.exports;
 for(const locale of ['ru','en','de']){
  const h=harness({locale,search:'?miniapp=telegram',prepare(ctx){ctx.window.HappyMapTelegram=true}});h.ctx.start();h.ctx.initMap();eq(h.requests.length,0,'Telegram never auto-requests location '+locale);h.node('#locateMe').onclick();eq(h.requests.length,1,'explicit location remains usable '+locale);
 }
 // Explicit cross-city location stays in Telegram even when session storage is unavailable.
 for(const telegram of [false,true]){
  const h=harness({locale:'ru',search:telegram?'?miniapp=telegram&location=city':'?location=city',prepare(ctx){ctx.window.HappyMapTelegram=telegram;ctx.sessionStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};}});
  h.ctx.start();h.ctx.initMap();
  if(!telegram)h.requests[0].e({code:1});
  h.node('#locateMe').onclick();h.success(h.requests.length-1,[40.1811,44.5136],8);
  eq(h.ctx.redirect,'/yerevan/index.html'+(telegram?'?miniapp=telegram&location=city':''),'cross-city redirect preserves Telegram only when active');
  if(telegram){const next=boot({query:new URL(h.ctx.redirect,'https://happymap.app').search,blocked:true});eq(next.window.HappyMapTelegram,true,'next document restores context without storage');}
 }
 for(const file of ['public/telegram.js','public/telegram-entry.js'])ok(!/initDataUnsafe|\.initData\b|requestContact|requestWriteAccess|LocationManager|\.auth\./.test(read(file)),'no identity trust or extra permission APIs '+file);
 console.log('PASS Telegram Mini App: '+checks+' checks; simulated DOM/SDK only, not a real Telegram-client test.');
})().catch(e=>{console.error(e);process.exitCode=1});
