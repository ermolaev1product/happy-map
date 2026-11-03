import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
const code=fs.readFileSync('public/assets/traffic.js','utf8');
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
function page(path,{storage=memory(),dnt='0',gpc=false,host='happymap.app',visibility='visible',search='',referrer=''}={}){
 const events=[],listeners={};const document={visibilityState:visibility,referrer,addEventListener:(n,f)=>{(listeners[n]??=[]).push(f)}};
 const sandbox={window:{},document,location:{pathname:path,hostname:host,search},navigator:{doNotTrack:dnt,globalPrivacyControl:gpc},localStorage:storage,sessionStorage:memory(),crypto:webcrypto,Intl,Date,URL,URLSearchParams,fetch:(u,o)=>{events.push({url:u,...JSON.parse(o.body)});return Promise.resolve({status:204})}};
 const context=vm.createContext(sandbox);vm.runInContext(code,context);return {events,context,document,show:()=>{document.visibilityState='visible';for(const f of listeners.visibilitychange||[])f()}};
}
const storage=memory(),cases={'/map.html':'/tbilisi/map.html','/map':'/tbilisi/map.html','/de/flensburg/map':'/flensburg/map.html','/en/paris/android':'/paris/android.html','/cities':'/cities.html','/en/map.html':'/tbilisi/map.html','/palo-alto/index.html':'/palo-alto/','/en/palo-alto/map.html':'/palo-alto/map.html','/belgrade/index.html':'/belgrade/','/moscow/map.html':'/moscow/map.html','/en/paris/index.html':'/paris/','/london/':'/london/','/de/flensburg/index.html':'/flensburg/','/en/android.html':'/android.html','/en/cities.html':'/cities.html'};
let visitor;
for(const [url,canonical] of Object.entries(cases)){
 const p=page(url,{storage,search:'?email=private@example.test&q=secret&utm_source=friend'});assert.equal(p.events.length,1,url);assert.equal(p.events[0].path,canonical);assert.equal(p.events[0].source,'friend');assert(!JSON.stringify(p.events).includes('private'));assert(!JSON.stringify(p.events).includes('secret'));visitor??=p.events[0].visitor;assert.equal(p.events[0].visitor,visitor);vm.runInContext(code,p.context);assert.equal(p.events.length,1,'duplicate script');
}
for(const url of ['/stats.html','/en/stats.html','/friends.html','/traffic-privacy.html','/api/social/me','/unknown.html','/index.html','/paris/share.html'])assert.equal(page(url).events.length,0,url);
for(const options of [{dnt:'1'},{gpc:true},{host:'localhost'},{host:'preview.example.test'},{storage:{getItem(){throw Error('blocked')}}}])assert.equal(page('/map.html',options).events.length,0);
const optout=memory();optout.setItem('happymap-stats-exclude','1');assert.equal(page('/map.html',{storage:optout}).events.length,0);
const hidden=page('/map.html',{visibility:'hidden'});assert.equal(hidden.events.length,0);hidden.show();hidden.show();assert.equal(hidden.events.length,1);
assert.equal(page('/map.html',{referrer:'https://google.com.example.test/path'}).events[0].source,'other');
assert.equal(page('/map.html',{referrer:'https://www.google.co.uk/search?q=secret'}).events[0].source,'google');
console.log('PASS: locale normalization, all cities, shared browser ID, one event per visible page, exclusions, URL-query minimization, host restriction and referral labels.');
