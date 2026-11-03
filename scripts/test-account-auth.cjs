const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('public/social.js','utf8').replace("import('/assets/social-auth.js')","Promise.resolve({createClient:globalThis.mockClient})");
const tick=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,5))};
function fixture({available=true,email=true,google=false}={}){
 let session=null,onAuth,delayed=null;const fetched=[],listeners={},elements=new Map();
 const dialog={innerHTML:'',open:false,setAttribute(){},querySelector(selector){if(selector==='#socialEmail'&&!this.innerHTML.includes('id="socialEmail"'))return null;if(selector==='#socialGoogle'&&!this.innerHTML.includes('id="socialGoogle"'))return null;if(selector==='[role="status"]')return null;if(!elements.has(selector))elements.set(selector,{addEventListener:(name,fn)=>listeners[selector+name]=fn,append(){},remove(){}});return elements.get(selector)},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false}};
 const auth={getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{onAuth=fn;},signInWithOtp:async()=>{throw Error('No mail allowed in test')},signInWithOAuth:async()=>{throw Error('No OAuth allowed in test')}};
 const context={setTimeout,setInterval(){},URLSearchParams,location:{pathname:'/map.html',search:'',hash:'',origin:'https://happymap.test'},history:{replaceState(){}},sessionStorage:{getItem(){return null},setItem(){},removeItem(){}},document:{createElement:tag=>tag==='dialog'?dialog:{setAttribute(){},addEventListener(){},textContent:''},body:{append(){}},querySelector(){return null},querySelectorAll(){return []},hidden:false},window:{},mockClient:()=>({auth}),fetch:async(url,opts)=>{fetched.push({url,opts});if(url.endsWith('config'))return {ok:true,json:async()=>({provider:'supabase',ready:true,serviceAvailable:available,providers:{email,google},url:'https://example.test',key:'test'})};if(delayed){const d=delayed;delayed=null;await d;}return {ok:true,json:async()=>({profile:null})}}};
 vm.runInNewContext(source,context);return {api:context.window.HappyMapAccount,dialog,fetched,listeners,setSession:s=>{session=s;onAuth?.('SIGNED_IN',s)},block:p=>{delayed=p}};
}
(async()=>{
 let f=fixture({available:false});await f.api.login();assert(f.dialog.innerHTML.includes('socialGuest'));assert(!f.dialog.innerHTML.includes('socialEmail'));f.listeners['#socialGuestclick']();assert.equal(f.dialog.open,false);
 f=fixture({email:false});await f.api.login();assert(!f.dialog.innerHTML.includes('id="socialEmail"'));assert(!f.dialog.innerHTML.includes('id="socialGoogle"'));
 f=fixture();await f.api.identity();const changed=[];f.api.subscribe(id=>changed.push(id));f.setSession({user:{id:'A'},access_token:'synthetic-A'});await tick();assert.equal(changed[0],'A');
 await assert.rejects(()=>f.api.request('plans','POST',{events:[]},{expectedIdentity:'B'}),/changed|изменился/);assert.equal(f.fetched.filter(r=>r.url.endsWith('plans')).length,0);
 let release;f.block(new Promise(r=>release=r));const pending=f.api.request('feed');await tick();f.setSession({user:{id:'B'},access_token:'synthetic-B'});release();await assert.rejects(()=>pending,/changed|изменился/);await tick();assert.equal(changed.at(-1),'B');
 console.log('PASS unavailable backend offers guest; disabled providers hidden; auth notifications; mismatched-owner writes and stale private responses rejected. No emails or accounts created.');
})().catch(e=>{console.error(e);process.exitCode=1});
