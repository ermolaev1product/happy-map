// Build explicit locale UI from the reviewed English client. Never translate listings.
import fs from 'node:fs';import path from 'node:path';import {parse} from 'acorn';
const args=process.argv.slice(2),option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const locale=option('--locale','de'),prefix=locale==='ru'?'':locale.toLowerCase();
const city=option('--city','brasilia'),globalMode=city==='all',out=path.resolve(option('--output','/workspace/shared/hm-locale-stage'));
const dictionary=JSON.parse(fs.readFileSync(option('--dictionary','data/i18n/flensburg-de-ui.json'),'utf8'));
const registry=JSON.parse(fs.readFileSync('data/i18n/market-locales.json'));
const picker=JSON.parse(fs.readFileSync('public/city-picker.json'));
const routeCity=from=>from.includes('/')&&registry.cities.some(c=>c.id===from.split('/')[0])?from.split('/')[0]:'tbilisi';
const keys=Object.keys(dictionary).filter(Boolean).sort((a,b)=>b.length-a.length);
const escape=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const re=new RegExp('(?<![A-Za-zÀ-ž])(?:'+keys.map(escape).join('|')+')(?![A-Za-zÀ-ž])','g');
const protectedText=s=>/^(?:https?:|data:|tel:|mailto:|\/|\.\.?\/|#)/.test(s.trim());
const text=s=>protectedText(s)?s:Object.hasOwn(dictionary,s.trim())?s.replace(s.trim(),dictionary[s.trim()]):s.replace(/Happy Map/g,'__HM_BRAND__').replace(re,x=>dictionary[x]).replace(/__HM_BRAND__/g,'Happy Map');
const htmlText=s=>s.split(/(<[^>]*>)/g).map((part,i)=>i%2?part.replace(/\b(title|alt|placeholder|aria-label|aria-description|content)=(['"])(.*?)\2/g,(m,k,q,v)=>k+'='+q+text(v)+q):text(part)).join('');
const machine=s=>/^[A-Za-z]+(?:-[A-Za-z]+){2,}$/.test(s)||protectedText(s)||/^[.#[{]/.test(s)||/^[-.#/a-z0-9_:]+$/.test(s)||/^(?:https?:|data:|tel:)/.test(s)||/^\s*\.?[\w-]+(?:\/|\.)[\w.\/-]+\s*$/.test(s);
const protectedNames=new Set(['languageMatches','languageAliases','languageCodes','conferenceLanguageCodes','matchesConferenceLanguage','reviewed']);
function js(s,file,from=file){
 const city=globalMode?routeCity(from):option('--city','brasilia');
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
 s=s.replaceAll('(?:en|de)','(?:en|de|pt-br|fr-ca|sr|es)');
 s=s.replace(/(['"])en-GB\1/g,JSON.stringify(locale==='sr'?'sr-Latn':locale==='de'&&city==='bern'&&from.startsWith(city+'/')?'de-CH':locale));
 // Relative catalogue reads always address the same existing English data asset.
 if(globalMode||from.startsWith(city+'/'))s=s.replace(/(\breadCatalog\(|\bfetch\()(['"])(events|places|sources)\.json\2/g,(_,call,q,name)=>call+q+(locale==='ru'?'':'/en')+'/'+(city==='tbilisi'?'':city+'/')+name+'.json'+q);
 // Source pages fetch a filename array via fetch(url); localize those URLs too.
 if((globalMode||from.startsWith(city+'/'))&&file==='sources-page.js')s=s.replace("['sources.json','events.json','places.json']",JSON.stringify(['sources','events','places'].map(name=>(locale==='ru'?'':'/en')+'/'+(city==='tbilisi'?'':city+'/')+name+'.json')));
 if(file==='map-basemap.js')s=s.replace(/const language = [^;]+;/,`const language = '${locale==='pt-BR'?'pt':locale==='fr-CA'?'fr':locale}';`);
 if(file==='social.js'&&locale==='de')s=s.replace(/(['"])im Umkreis von \1\+new Date\(s\.expiresAt\)/g,"'bis '+new Date(s.expiresAt)");
 if(file==='social.js'&&locale==='fr-CA')s=s.replace(/(['"])dans un rayon de \1\+new Date\(s\.expiresAt\)/g,"'jusqu’au '+new Date(s.expiresAt)");
 if(file==='social.js'&&locale==='sr')s=s.replace(/(['"])u krugu od \1\+new Date\(s\.expiresAt\)/g,"'do '+new Date(s.expiresAt)");
 if(file==='social.js'&&locale==='es')s=s.replace(/(['"])en un radio de \1\+new Date\(s\.expiresAt\)/g,"'hasta '+new Date(s.expiresAt)");
 if(file==='social.js'&&locale==='pt-BR')s=s.replace(/(['"])em um raio de \1\+new Date\(s\.expiresAt\)/g,"'até '+new Date(s.expiresAt)");
 if(file==='city-state.js'&&locale!=='de')s=s.replace("currentCity==='flensburg'?'/invite-local.html':'/invite.html'","currentCity==='flensburg'?'/invite.html':'/invite.html'");
 if(file==='social.js')s=s.replace("if(['/en/friends.html','/friends'].includes(location.pathname)","if((/^(?:\\/(?:en|de|pt-br|fr-ca|sr|es))?\\/friends(?:\\.html)?\\/?$/.test(location.pathname))");
 if(file==='city-state.js')s=s.replace("(shareEnglish?'en/':'')",JSON.stringify(prefix?prefix+'/':''));
 if(file==='location-control.js')s=s.replace("const prefix=lang==='en'?'/en/':lang==='de'&&nearest.id==='flensburg'?'/de/':'/';const target=new URL(prefix+nearest.path,location.href);","const policy=window.HappyMapLocalePolicy;const nextLocale=policy?policy.choose(nearest.id,null,document.documentElement.lang):'en';const target=new URL(policy?policy.path(nearest.path,nextLocale):'/en/'+nearest.path,location.href);");
 if(file==='map-space.js'&&locale==='fr-CA')s=s.replace(/home:\s*(['"])home\1/g,'home:"accueil"');
 if(file==='map-space.js'&&locale==='sr')s=s.replace(/home:\s*(['"])home\1/g,'home:"početna"');
 if(file==='map-space.js'&&locale==='es')s=s.replace(/home:\s*(['"])home\1/g,'home:"inicio"');
 if(file==='map-space.js'&&locale==='pt-BR')s=s.replace(/home:\s*(['"])home\1/g,'home:"início"');
 if(file==='map-space.js'&&locale==='de')s=s.replace(/home:\s*(['"])home\1/g,'home:"Startseite"');
 if(file==='app.js'&&['de','fr-CA'].includes(locale))s=s.replace('map=L.map(',`L.Control.Zoom.prototype.options.zoomInTitle=${JSON.stringify(locale==='de'?'Vergrößern':'Agrandir')};L.Control.Zoom.prototype.options.zoomOutTitle=${JSON.stringify(locale==='de'?'Verkleinern':'Réduire')};map=L.map(`);
 if(file==='app.js'){
  const detailLabels={de:'Details','pt-BR':'detalhes',es:'detalles',sr:'detalji','fr-CA':'détails'};
  if(detailLabels[locale])s=s.replace(/s\.price==null\?(['"])details\1/g,'s.price==null?'+JSON.stringify(detailLabels[locale]));
  s=s.replace(/const timeLabel=t=>\{[^\n]*?\};/,"const timeLabel=t=>t;");
  if(locale==='es')s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n===1?'lugar':'lugares'}`;}");
  if(locale==='sr')s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n%10===1&&n%100!==11?'mesto':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'mesta':'mesta'}`;}");
  if(locale==='es')s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n===1?'evento':'eventos'}`;");
  if(locale==='sr')s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n%10===1&&n%100!==11?'događaj':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'događaja':'događaja'}`;");
  if(locale==='ru')s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n%100>=11&&n%100<=14?'мест':n%10===1?'место':n%10>=2&&n%10<=4?'места':'мест'}`;}");
  if(locale==='fr-CA')s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n===1?'lieu':'lieux'}`;}");
  if(locale==='fr-CA')s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n===1?'événement':'événements'}`;");
  if(locale==='de')s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n===1?'Ort':'Orte'}`;}");
  if(locale==='pt-BR')s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n===1?'lugar':'lugares'}`;}");
  if(locale==='de')s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n===1?'Veranstaltung':'Veranstaltungen'}`;");
  if(locale==='pt-BR')s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n===1?'evento':'eventos'}`;");
  if(locale==='ru')s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n%100>=11&&n%100<=14?'событий':n%10===1?'событие':n%10>=2&&n%10<=4?'события':'событий'}`;");
 }
 // Rewrite only recognized internal UI destinations, including inline redirects.
 s=s.replace(/(['"`])(\/(?:[^\s'"`<>]*))\1/g,(m,q,url)=>q+link(url,from)+q);
 parse(s,{ecmaVersion:'latest',sourceType:'module'});return s;
}
const globals=['social.js','plan-account.js','location-control.js','map-space.js','business-entry.js','city-state.js','freshness.js','source-priorities.js','sources.js','assets/app-shell.js','map-basemap.js','catalog-modes.js'];
const rootPages=['index.html','share.html','app-start.html','about.html','android.html','friends.html','traffic-privacy.html'];
const cityTargets=(globalMode?registry.cities.filter(c=>c.id!=='tbilisi').map(c=>c.id):[city]).flatMap(id=>fs.readdirSync('public/en/'+id).filter(n=>/\.(html|js)$/.test(n)&&(locale==='de'||n!=='invite-local.html')).map(n=>id+'/'+n));
const flatTargets=globalMode?['map.html','plans.html','sources.html','app.js','discovery.js','map-layout.js']:[];
const targets=new Set([...globals,...rootPages,'cities.html',...flatTargets,...cityTargets]);
function link(url,from){
 if(/^(?:https?:|data:|mailto:|tel:|#|\/\/)/.test(url))return url;
 const base=new URL(url,'https://happymap.app/en/'+from),source=base.pathname.replace(/^\/(?:en\/)?/,'');
 const targetKey=targets.has(source)?source:targets.has(source+'index.html')?source+'index.html':targets.has(source+'/index.html')?source+'/index.html':targets.has(source+'.html')?source+'.html':null;
 if(base.pathname.startsWith('/api/')||base.pathname.startsWith('/downloads/'))return url;
 if(globalMode&&/^\/guide\/en(?:\/|$)/.test(base.pathname)){return base.pathname.replace('/guide/en','/guide/'+prefix)+base.search+base.hash;}
 if(['locale-policy.js','language-switch.js','entry-language.js','city-picker.js'].includes(source)){return '/'+source+base.search+base.hash;}
 if(targetKey){base.pathname=(prefix?'/'+prefix:'')+'/'+source;if(base.searchParams.has('lang'))base.searchParams.set('lang',locale);if(base.searchParams.has('autoLang'))base.searchParams.set('autoLang',locale);}
 else if(fs.existsSync('public/en/'+source))base.pathname='/en/'+source;
 else return url;
 return base.pathname+base.search+base.hash;
}
function links(s,from){return s.replace(/\b(src|href)=(['"])(.*?)\2/g,(_,attr,q,url)=>attr+'='+q+link(url,from)+q);}
function page(s,from){const city=globalMode?routeCity(from):option('--city','brasilia');const dataRows=[];s=s.replace(/<tbody\b[^>]*>[\s\S]*?<\/tbody>/gi,m=>{dataRows.push(m);return '__HM_DATA_'+(dataRows.length-1)+'__';});const scripts=[];s=s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,m=>{scripts.push(m);return '__HM_BLOCK_'+(scripts.length-1)+'__';});s=htmlText(s).replace(/(<html\b[^>]*\blang=)"en"/g,'$1"'+(locale==='sr'?'sr-Latn':locale==='de'&&city==='bern'&&from.startsWith(city+'/')?'de-CH':locale)+'"');s=s.replace(/__HM_BLOCK_(\d+)__/g,(_,i)=>scripts[i].replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/i,(m,a,b,c)=>a+(b.trim()?js(b,from):b)+c));
 s=s.replace(/__HM_DATA_(\d+)__/g,(_,i)=>dataRows[i]);s=links(s,from);const canonical='https://happymap.app/'+(prefix?prefix+'/':'')+from;
 s=s.replace(/(<link[^>]*rel="canonical"[^>]*href=")[^"]*/g,'$1'+canonical).replace(/(<meta[^>]*property="og:url"[^>]*content=")[^"]*/g,'$1'+canonical);
 s=s.replace(/(<meta[^>]*property="og:locale"[^>]*content=")[^"]*/g,'$1'+(locale==='pt-BR'?'pt_BR':locale==='ru'?'ru_RU':locale==='fr-CA'?'fr_CA':locale==='es'?'es_ES':locale==='sr'?'sr_RS':city==='bern'?'de_CH':'de_DE'));
 const artwork=locale==='de'?'de':locale==='ru'?'ru':'en';
 const alt={de:'Happy Map — Veranstaltungen. Orte. Pläne.','pt-BR':'Happy Map — Eventos. Lugares. Planos.',es:'Happy Map — Eventos. Lugares. Planes.',sr:'Happy Map — Događaji. Mesta. Planovi.','fr-CA':'Happy Map — Events. Places. Plans.',ru:'Happy Map — События. Места. Планы.'}[locale];
 s=s.replace(/(<meta[^>]*(?:property|name)="(?:og:image|twitter:image)"[^>]*content=")[^"]*/g,'$1https://happymap.app/assets/happy-map-unified-20261015-'+artwork+'.png');
 if(alt)s=s.replace(/(<meta[^>]*(?:property|name)="(?:og:image:alt|twitter:image:alt)"[^>]*content=")[^"]*/g,'$1'+alt);
 return s;
}
fs.mkdirSync(out,{recursive:true});
for(const relative of targets){
 const input=relative==='catalog-modes.js'?'public/catalog-modes.js':'public/en/'+relative;if(!fs.existsSync(input))continue;
 let content=fs.readFileSync(input,'utf8');content=relative.endsWith('.html')?page(content,relative):js(content,path.basename(relative),relative);
 // Rewrite literal internal UI URLs, never APIs, source links or identity keys.
 if(relative.endsWith('.js'))content=content.replace(/(['"`])(\/en\/[^\s'"`<>]+)\1/g,(m,q,url)=>q+link(url,relative)+q);
 // The reviewed German Flensburg event asset must win after all generic /en rewrites.
 if(locale==='de'&&relative==='flensburg/app.js')content=content.replace(/(\breadCatalog\(|\bfetch\()(['"])\/en\/flensburg\/events\.json\2/g,'$1$2/de/flensburg/events.json$2');
 const dest=path.join(out,prefix,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);
}
console.log(JSON.stringify({locale,city,out,files:targets.size-1,catalogues:'not copied or translated; existing /en data URLs reused'}));
