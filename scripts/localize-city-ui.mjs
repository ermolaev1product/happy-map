// Build explicit locale UI from the reviewed English client. Never translate listings.
import fs from 'node:fs';import path from 'node:path';import {parse} from 'acorn';
const args=process.argv.slice(2),option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const locale=option('--locale','de'),prefix=locale==='ru'?'':locale.toLowerCase();
const city=option('--city','brasilia'),out=path.resolve(option('--output','/workspace/shared/hm-locale-stage'));
const dictionary=JSON.parse(fs.readFileSync(option('--dictionary','data/i18n/flensburg-de-ui.json'),'utf8'));
const keys=Object.keys(dictionary).filter(Boolean).sort((a,b)=>b.length-a.length);
const escape=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const re=new RegExp('(?<![A-Za-zÀ-ž])(?:'+keys.map(escape).join('|')+')(?![A-Za-zÀ-ž])','g');
const protectedText=s=>/^(?:https?:|data:|tel:|mailto:|\/|\.\.?\/|#)/.test(s.trim());
const text=s=>protectedText(s)?s:Object.hasOwn(dictionary,s.trim())?s.replace(s.trim(),dictionary[s.trim()]):s.replace(/Happy Map/g,'__HM_BRAND__').replace(re,x=>dictionary[x]).replace(/__HM_BRAND__/g,'Happy Map');
const htmlText=s=>s.split(/(<[^>]*>)/g).map((part,i)=>i%2?part.replace(/\b(title|alt|placeholder|aria-label|aria-description|content)=(['"])(.*?)\2/g,(m,k,q,v)=>k+'='+q+text(v)+q):text(part)).join('');
const machine=s=>/^[A-Za-z]+(?:-[A-Za-z]+){2,}$/.test(s)||protectedText(s)||/^[.#[{]/.test(s)||/^[-.#/a-z0-9_:]+$/.test(s)||/^(?:https?:|data:|tel:)/.test(s)||/^\s*\.?[\w-]+(?:\/|\.)[\w.\/-]+\s*$/.test(s);
const protectedNames=new Set(['languageMatches','languageAliases','languageCodes','conferenceLanguageCodes','matchesConferenceLanguage','reviewed']);
function js(s,file,from=file){
 const tree=parse(s,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 function walk(n,parent){if(!n||typeof n!=='object')return;
  if((n.type==='VariableDeclarator'&&protectedNames.has(n.id?.name))||(n.type==='FunctionDeclaration'&&protectedNames.has(n.id?.name)))return;
  if(n.type==='Literal'&&typeof n.value==='string'){
   const isComparison=parent?.type==='SwitchCase'||(parent?.type==='BinaryExpression'&&['===','!==','==','!=','in','instanceof'].includes(parent.operator));
   const isKey=(parent?.type==='Property'&&parent.key===n)||(parent?.type==='MemberExpression'&&parent.property===n);
   const call=parent?.type==='CallExpression'?parent:null;
   const method=call?.callee?.property?.name;
   const isSelector=['querySelector','querySelectorAll','closest','matches','getElementById'].includes(method)||(['getItem','setItem','removeItem','get','set','has','delete','append'].includes(method)&&call.arguments[0]===n);
   const machineAttribute=method==='setAttribute'&&!['aria-label','aria-description','title','placeholder','alt'].includes(call.arguments[0]?.value);
   if(!isComparison&&!isKey&&!isSelector&&!machineAttribute&&!machine(n.value)){const v=n.value.includes('<')?htmlText(n.value):text(n.value);if(v!==n.value)edits.push({start:n.start,end:n.end,value:JSON.stringify(v)});}
  }else if(n.type==='TemplateLiteral'){
   const marker='__HM_EXPR_SLOT__',joined=n.quasis.map(q=>q.value.raw).join(marker),translated=joined.includes('<')?htmlText(joined):text(joined),parts=translated.split(marker);
   if(parts.length!==n.quasis.length)throw Error('Template slots changed: '+file);
   n.quasis.forEach((q,i)=>{if(parts[i]!==q.value.raw)edits.push({start:q.start,end:q.end,value:parts[i].replace(/`/g,'\\`')});});n.expressions.forEach(e=>walk(e,n));return;
  }
  for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(x=>walk(x,n));else if(v&&typeof v==='object')walk(v,n);}
 }
 walk(tree);for(const e of edits.sort((a,b)=>b.start-a.start))s=s.slice(0,e.start)+e.value+s.slice(e.end);
 // UI ternaries use the already translated English branch; date formatters retain locale.
 s=s.replace(/document\.documentElement\.lang==='en'/g,'true').replace(/document\.documentElement\.lang==='de'/g,'false');
 s=s.replace(/const locale=document\.documentElement\.lang;/g,"const locale='en';");
 s=s.replace(/const lang=document\.documentElement\.lang\.startsWith\('ru'\)\?'ru':document\.documentElement\.lang\.startsWith\('de'\)\?'de':'en';/g,"const lang='en';");
 s=s.replace(/const lang=document\.documentElement\.lang;/g,"const lang='en';");
 // New route prefixes are presentation only; city/account storage keys stay unchanged.
 s=s.replaceAll('(?:en|de)','(?:en|de|pt-br|fr-ca)');
 s=s.replace(/(['"])en-GB\1/g,JSON.stringify(locale==='de'&&city==='bern'&&from.startsWith(city+'/')?'de-CH':locale));
 // Relative catalogue reads always address the same existing English data asset.
 if(from.startsWith(city+'/'))s=s.replace(/(\breadCatalog\(|\bfetch\()(['"])(events|places|sources)\.json\2/g,(_,call,q,name)=>call+q+(locale==='ru'?'':'/en')+'/'+city+'/'+name+'.json'+q);
 if(file==='map-basemap.js')s=s.replace(/const language = [^;]+;/,`const language = '${locale==='pt-BR'?'pt':locale==='fr-CA'?'fr':locale}';`);
 if(file==='social.js'&&locale==='de')s=s.replace(/(['"])im Umkreis von \1\+new Date\(s\.expiresAt\)/g,"'bis '+new Date(s.expiresAt)");
 if(file==='social.js'&&locale==='fr-CA')s=s.replace(/(['"])dans un rayon de \1\+new Date\(s\.expiresAt\)/g,"'jusqu’au '+new Date(s.expiresAt)");
 if(file==='social.js'&&locale==='pt-BR')s=s.replace(/(['"])em um raio de \1\+new Date\(s\.expiresAt\)/g,"'até '+new Date(s.expiresAt)");
 if(file==='city-state.js')s=s.replace("(shareEnglish?'en/':'')",JSON.stringify(prefix?prefix+'/':''));
 if(file==='location-control.js')s=s.replace("const prefix=lang==='en'?'/en/':lang==='de'&&nearest.id==='flensburg'?'/de/':'/';const target=new URL(prefix+nearest.path,location.href);","const policy=window.HappyMapLocalePolicy;const nextLocale=policy?policy.choose(nearest.id,null,document.documentElement.lang):'en';const target=new URL(policy?policy.path(nearest.path,nextLocale):'/en/'+nearest.path,location.href);");
 if(file==='map-space.js'&&locale==='fr-CA')s=s.replace(/home:\s*(['"])home\1/g,'home:"accueil"');
 if(file==='map-space.js'&&locale==='de')s=s.replace(/home:\s*(['"])home\1/g,'home:"Startseite"');
 if(file==='app.js'&&['de','fr-CA'].includes(locale))s=s.replace('map=L.map(',`L.Control.Zoom.prototype.options.zoomInTitle=${JSON.stringify(locale==='de'?'Vergrößern':'Agrandir')};L.Control.Zoom.prototype.options.zoomOutTitle=${JSON.stringify(locale==='de'?'Verkleinern':'Réduire')};map=L.map(`);
 if(file==='app.js'){
  s=s.replace(/const timeLabel=t=>\{[^\n]*?\};/,"const timeLabel=t=>t;");
  if(locale==='ru')s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n%100>=11&&n%100<=14?'мест':n%10===1?'место':n%10>=2&&n%10<=4?'места':'мест'}`;}");
  if(locale==='fr-CA')s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n===1?'lieu':'lieux'}`;}");
  if(locale==='fr-CA')s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n===1?'événement':'événements'}`;");
  if(locale==='de')s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n===1?'Ort':'Orte'}`;}");
  if(locale==='pt-BR')s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n===1?'lugar':'lugares'}`;}");
  if(locale==='de')s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n===1?'Veranstaltung':'Veranstaltungen'}`;");
  if(locale==='pt-BR')s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n===1?'evento':'eventos'}`;");
  if(locale==='ru')s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n%100>=11&&n%100<=14?'событий':n%10===1?'событие':n%10>=2&&n%10<=4?'события':'событий'}`;");
 }
 parse(s,{ecmaVersion:'latest',sourceType:'module'});return s;
}
const globals=['social.js','plan-account.js','location-control.js','map-space.js','business-entry.js','city-state.js','freshness.js','source-priorities.js','sources.js','assets/app-shell.js','map-basemap.js','catalog-modes.js'];
const rootPages=['index.html','app-start.html','about.html','android.html','friends.html','traffic-privacy.html'];
const targets=new Set([...globals,...rootPages,'cities.html',...fs.readdirSync('public/en/'+city).filter(n=>/\.(html|js)$/.test(n)).map(n=>city+'/'+n)]);
function link(url,from){
 if(/^(?:https?:|data:|mailto:|tel:|#|\/\/)/.test(url))return url;
 const base=new URL(url,'https://happymap.app/en/'+from),source=base.pathname.replace(/^\/(?:en\/)?/,'');
 if(base.pathname.startsWith('/api/')||base.pathname.startsWith('/downloads/'))return url;
 if(targets.has(source))base.pathname=(prefix?'/'+prefix:'')+'/'+source;
 else if(fs.existsSync('public/en/'+source))base.pathname='/en/'+source;
 else return url;
 return base.pathname+base.search+base.hash;
}
function links(s,from){return s.replace(/\b(src|href)=(['"])(.*?)\2/g,(_,attr,q,url)=>attr+'='+q+link(url,from)+q);}
function page(s,from){const dataRows=[];s=s.replace(/<tbody\b[^>]*>[\s\S]*?<\/tbody>/gi,m=>{dataRows.push(m);return '__HM_DATA_'+(dataRows.length-1)+'__';});const scripts=[];s=s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,m=>{scripts.push(m);return '__HM_BLOCK_'+(scripts.length-1)+'__';});s=htmlText(s).replace(/lang="en"/g,'lang="'+(locale==='de'&&city==='bern'&&from.startsWith(city+'/')?'de-CH':locale)+'"');s=s.replace(/__HM_BLOCK_(\d+)__/g,(_,i)=>scripts[i].replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/i,(m,a,b,c)=>a+(b.trim()?js(b,from):b)+c));
 s=s.replace(/__HM_DATA_(\d+)__/g,(_,i)=>dataRows[i]);s=links(s,from);const canonical='https://happymap.app/'+(prefix?prefix+'/':'')+from;
 s=s.replace(/(<link[^>]*rel="canonical"[^>]*href=")[^"]*/g,'$1'+canonical).replace(/(<meta[^>]*property="og:url"[^>]*content=")[^"]*/g,'$1'+canonical);
 s=s.replace(/(<meta[^>]*property="og:locale"[^>]*content=")[^"]*/g,'$1'+(locale==='pt-BR'?'pt_BR':locale==='ru'?'ru_RU':locale==='fr-CA'?'fr_CA':city==='bern'?'de_CH':city==='vienna'?'de_AT':'de_DE'));
 return s;
}
fs.mkdirSync(out,{recursive:true});
for(const relative of targets){
 const input=relative==='catalog-modes.js'?'public/catalog-modes.js':'public/en/'+relative;if(!fs.existsSync(input))continue;
 let content=fs.readFileSync(input,'utf8');content=relative.endsWith('.html')?page(content,relative):js(content,path.basename(relative),relative);
 // Rewrite literal internal UI URLs, never APIs, source links or identity keys.
 if(relative.endsWith('.js'))content=content.replace(/(['"`])(\/en\/[^\s'"`<>]+)\1/g,(m,q,url)=>q+link(url,relative)+q);
 const dest=path.join(out,prefix,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);
}
console.log(JSON.stringify({locale,city,out,files:targets.size-1,catalogues:'not copied or translated; existing /en data URLs reused'}));
