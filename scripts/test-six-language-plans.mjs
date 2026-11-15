import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const cities=JSON.parse(fs.readFileSync('public/city-picker.json')).cities;
const stub=new Proxy(function(){},{get:(o,k)=>k==='querySelector'?()=>stub:k==='querySelectorAll'?()=>[]:k==='classList'?{add(){},remove(){},toggle(){}}:k==='value'?'all':stub,apply:()=>stub,set:()=>true});
function context(code,locale,storage){const ctx=vm.createContext({console,Intl,Date,URL,URLSearchParams,document:{documentElement:{lang:locale},querySelector:()=>stub,querySelectorAll:()=>[],createElement:()=>stub},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:stub,location:{search:'',hash:'',pathname:'/map.html'},history:stub,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame(){},navigator:{},ResizeObserver:class{observe(){}},fetch:()=>Promise.reject(new Error('offline fixture')),Map,Set,AbortController});vm.runInContext(fs.readFileSync('public/discovery-model.js','utf8'),ctx);vm.runInContext(code,ctx);vm.runInContext('render=()=>{};toast=()=>{};updateDetailButton=()=>{};',ctx);return ctx;}
let count=0;
for(const city of cities){const relative=city.id==='tbilisi'?'app.js':city.id+'/app.js',storage=new Map(),event={id:'language-parity-test',title:'Original user event · Текст · texto',description:'Do not translate user content',date:'2026-11-08',time:'19:00',category:'music'};
 for(const locale of ['sr','es','de','pt-br']){
  const code=fs.readFileSync('public/'+locale+'/'+relative,'utf8'),ctx=context(code,locale==='sr'?'sr-Latn':locale,storage);
  vm.runInContext('events='+JSON.stringify([event])+';toggleSave("language-parity-test");',ctx);
  assert.equal(vm.runInContext('saved.length',ctx),1,city.id+' '+locale+' save');assert.equal(vm.runInContext('saved[0].title',ctx),event.title);
  const en=context(fs.readFileSync('public/en/'+relative,'utf8'),'en',storage);assert.equal(vm.runInContext('saved[0].id',en),event.id,city.id+' survives language switch');assert.equal(vm.runInContext('saved[0].description',en),event.description);
  vm.runInContext('toggleSave("language-parity-test");',ctx);assert.equal(vm.runInContext('saved.length',ctx),0,city.id+' remove');count++;
 }
}
console.log('PASS: '+count+' save, language-switch reload, original user text, remove scenarios across100 cities. Simulated DOM/storage; no real accounts or plans changed.');
