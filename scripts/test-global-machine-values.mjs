import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {parse} from 'acorn';
const files=['social.js','plan-account.js','location-control.js','map-space.js','business-entry.js','city-state.js','freshness.js','source-priorities.js','sources.js','assets/app-shell.js','map-basemap.js','catalog-modes.js'];
function values(code){const result={headers:[],storage:[],comparisons:[],keys:[],api:[],reviewed:[],languageMatches:[]};
 function walk(n,parent){if(!n||typeof n!=='object')return;
  if(n.type==='Property')result.keys.push(n.key.type==='Identifier'?n.key.name:String(n.key.value));
  if(n.type==='Literal'&&typeof n.value==='string'){
   if(/^X-[A-Za-z-]+$/.test(n.value)||['Content-Type','Authorization','Accept'].includes(n.value))result.headers.push(n.value);
   if(parent?.type==='MemberExpression'&&parent.computed&&parent.property===n)result.keys.push(n.value);
   if((parent?.type==='SwitchCase'||(parent?.type==='BinaryExpression'&&['===','!==','==','!=','in','instanceof'].includes(parent.operator)))&&!['en','de','ru','pt-BR','fr-CA','sr','sr-Latn','es'].includes(n.value))result.comparisons.push(n.value);
   if(n.value.startsWith('/api/')||n.value.startsWith('/signin-')||n.value.startsWith('/signout-'))result.api.push(n.value);
  }
  if(n.type==='CallExpression'&&['getItem','setItem','removeItem'].includes(n.callee?.property?.name)&&n.arguments[0]?.type==='Literal')result.storage.push(n.arguments[0].value);
  if(n.type==='VariableDeclarator'&&['reviewed','languageMatches'].includes(n.id?.name))result[n.id.name].push(code.slice(n.start,n.end));
  for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(x=>walk(x,n));else if(v&&typeof v==='object')walk(v,n);}
 }
 walk(parse(code,{ecmaVersion:'latest',sourceType:'module'}));for(const key of Object.keys(result))result[key].sort();return result;
}
let checked=0;
const cityIDs=JSON.parse(fs.readFileSync('public/city-picker.json')).cities.map(c=>c.id);
for(const [locale,cities] of ['sr','es','de','pt-br'].map(locale=>[locale,cityIDs.filter(id=>id!=='tbilisi')])){
 for(const file of [...files,'app.js','discovery.js','map-layout.js',...cities.flatMap(city=>['app.js','discovery.js','map-layout.js'].map(f=>city+'/'+f))]){
  const source=file==='catalog-modes.js'?'public/catalog-modes.js':'public/en/'+file,target='public/'+(locale?locale+'/':'')+file;
  if(!fs.existsSync(source)||!fs.existsSync(target))continue;
  const content=fs.readFileSync(target,'utf8');if(file.endsWith('/app.js'))assert(content.includes("readCatalog('/live/'+cityFolder+'events.json')"),file+' native live events path');if(file.endsWith('/discovery.js'))assert(content.includes("fetch('/live/'+cityFolder+'places.json'"),file+' native live places path');
  const a=values(fs.readFileSync(source,'utf8')),b=values(fs.readFileSync(target,'utf8'));
  if(file==='location-control.js'){assert(fs.readFileSync(target,'utf8').includes('policy.choose(nearest.id,null,document.documentElement.lang)'));a.comparisons.splice(a.comparisons.indexOf('flensburg'),1);}
  for(const key of Object.keys(a))assert.deepEqual(b[key],a[key],locale+'/'+file+' machine '+key);checked++;
 }
}
for(const locale of ['sr','es','de','pt-br'])for(const id of cityIDs){const rel=id==='tbilisi'?'app.js':id+'/app.js';const original=fs.readFileSync('public/en/'+rel,'utf8'),translated=fs.readFileSync('public/'+locale+'/'+rel,'utf8');const extract=code=>{const tree=parse(code,{ecmaVersion:'latest',sourceType:'module'}),node=tree.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='visible');assert(node,'visible function exists');return code.slice(node.start,node.end)};assert.equal(extract(translated),extract(original),locale+'/'+rel+' exact visibility/filtering/sorting');}
console.log('PASS: '+checked+' localized JS files preserve protocol headers, API/auth routes, storage keys, object/computed keys, enum comparisons, reviewed records and language matching logic.');
