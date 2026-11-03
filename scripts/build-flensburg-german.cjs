// Generate a bounded German Flensburg interface from the completed English build.
// Listing identifiers, source URLs, original titles and data remain unchanged.
const fs=require('node:fs'),path=require('node:path'),acorn=require('acorn');
const args=process.argv.slice(2);const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=process.cwd(),source=path.resolve(option('--english-root','public/en')),out=path.resolve(option('--output','public/de/flensburg'));
const dictionary=JSON.parse(fs.readFileSync(option('--dictionary','data/i18n/flensburg-de-ui.json'),'utf8'));
const keys=Object.keys(dictionary).sort((a,b)=>b.length-a.length),escape=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const re=new RegExp('(?<![A-Za-zÀ-ž])(?:'+keys.map(escape).join('|')+')(?![A-Za-zÀ-ž])','g');
function text(s){if(Object.hasOwn(dictionary,s.trim()))return s.replace(s.trim(),dictionary[s.trim()]);return s.replace(/Happy Map/g,'__HAPPYMAP_BRAND__').replace(re,x=>dictionary[x]).replace(/__HAPPYMAP_BRAND__/g,'Happy Map');}
function html(s){return s.split(/(<[^>]*>)/g).map((part,i)=>i%2?part.replace(/\b(title|alt|placeholder|aria-label|aria-description|content)=(['"])(.*?)\2/g,(m,k,q,v)=>k+'='+q+text(v)+q):text(part)).join('');}
const machine=s=>/^[-.#/a-z0-9_:]+$/.test(s)||/^(?:https?:|data:|tel:)/.test(s)||/^\s*\.?[\w-]+(?:\/|\.)[\w.\/-]+\s*$/.test(s);
function js(s,file){
 const tree=acorn.parse(s,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 function walk(n,parent){if(!n||typeof n!=='object')return;
  if(n.type==='Literal'&&typeof n.value==='string'){
   const isKey=parent?.type==='Property'&&parent.key===n&&!parent.computed;
   if(!isKey&&!machine(n.value)){const v=n.value.includes('<')?html(n.value):text(n.value);if(v!==n.value)edits.push({start:n.start,end:n.end,value:JSON.stringify(v)});}
  } else if(n.type==='TemplateLiteral'){
   const marker='__HAPPYMAP_EXPR_SLOT__';const joined=n.quasis.map(q=>q.value.raw).join(marker),translated=joined.includes('<')?html(joined):text(joined);const parts=translated.split(marker);
   if(parts.length!==n.quasis.length)throw Error('Template placeholders changed: '+file);
   n.quasis.forEach((q,i)=>{if(parts[i]!==q.value.raw)edits.push({start:q.start,end:q.end,value:parts[i].replace(/`/g,'\\`')});});
   n.expressions.forEach(e=>walk(e,n));return;
  }
  for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(x=>walk(x,n));else if(v&&typeof v==='object')walk(v,n);}
 }
 walk(tree);for(const e of edits.sort((a,b)=>b.start-a.start))s=s.slice(0,e.start)+e.value+s.slice(e.end);acorn.parse(s,{ecmaVersion:'latest',sourceType:'module'});return s;
}
function localizedLinks(s){return s.replace(/(["'`])\/flensburg\//g,'$1/de/flensburg/').replace(/\/en\/flensburg(?=\/|['"])/g,'/de/flensburg').replace(/https:\/\/happymap\.app\/flensburg\//g,'https://happymap.app/de/flensburg/');}
function page(s,file){
 const scripts=[];s=s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,m=>{scripts.push(m);return '__HAPPYMAP_BLOCK_'+(scripts.length-1)+'__';});s=html(s).replace(/lang="en"/g,'lang="de"');
 s=s.replace(/__HAPPYMAP_BLOCK_(\d+)__/g,(_,i)=>scripts[i].replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/i,(m,a,b,c)=>a+(b.trim()?js(b,file):b)+c));
 s=localizedLinks(s);
 // The shared country picker uses an explicit query for its German interface.
 s=s.replace(/(class="change-city" href=")\/en\/cities\.html(")/g,'$1/en/cities.html?lang=de$2');
 s=s.replace(/(src|href)="\.\.\/([^"?]+)([^"<>]*)"/g,(_,attr,name,suffix)=>attr+'="/en/'+name+suffix+'"');
 for(const name of ['map-space.js','business-entry.js','city-state.js'])s=s.replace(new RegExp('(["\\\'])/en/'+name.replace('.','\\.')+'(?:\\?[^"\\\']*)?(["\\\'])','g'),'$1/de/flensburg/'+name+'?v=flensburg-de-20261014$2');
 s=s.replace(/\/en\/assets\/app-shell\.js[^"']*/g,'/de/flensburg/app-shell.js?v=flensburg-de-20261014');
 s=s.replace(/\/language-switch\.js(?:\?[^"']*)?/g,'/language-switch.js?v=flensburg-de-20261014');
 s=s.replace(/(src="(?:app|discovery|social\.en|sources-page)\.js)(?:\?[^"']*)?/g,'$1?v=flensburg-de-20261014');
 if(s.includes('id="language"')&&!s.includes('value="DE"'))s=s.replace('<option value="EN">','<option value="DE">Deutsch</option><option value="EN">');
 const canonical='https://happymap.app/de/flensburg/'+(file==='index.html'?'':file);
 s=s.replace(/(<link[^>]*rel="canonical"[^>]*href=")[^"]*/g,'$1'+canonical).replace(/(<meta[^>]*property="og:url"[^>]*content=")[^"]*/g,'$1'+canonical);
 // Preview artwork follows the generated interface, independently of source wording.
 const preview={'og:image':'https://happymap.app/assets/happy-map-unified-20261015-de.png','twitter:image':'https://happymap.app/assets/happy-map-unified-20261015-de.png','og:locale':'de_DE','og:image:alt':'Happy Map — Veranstaltungen. Orte. Pläne.','twitter:image:alt':'Happy Map — Veranstaltungen. Orte. Pläne.'};
 if(s.includes('property="og:image"'))for(const [key,value] of Object.entries(preview)){
  const tag='<meta '+(key.startsWith('og:')?'property':'name')+'="'+key+'" content="'+value+'">';
  const pattern=new RegExp('<meta\\b[^>]*(?:name|property)="'+key+'"[^>]*>','g');
  if(pattern.test(s))s=s.replace(pattern,tag);else s=s.replace(/(<meta[^>]*property="og:image"[^>]*>)/,'$1\n'+tag);
 }
 return s;
}
fs.mkdirSync(out,{recursive:true});
for(const name of fs.readdirSync(path.join(source,'flensburg'))){const from=path.join(source,'flensburg',name);if(!fs.statSync(from).isFile())continue;let content=fs.readFileSync(from);
 if(name.endsWith('.js')){let s=js(content.toString(),name);s=localizedLinks(s).replace(/(['"])en-GB\1/g,"'de-DE'");
 if(name==='app.js'){
  s=s.replace(/const timeLabel=t=>\{[^\n]*?\};/,"const timeLabel=t=>t;");
  s=s.replace(/const eventCount=n=>[^\n]+;/,"const eventCount=n=>`${n} ${n===1?'Veranstaltung':'Veranstaltungen'}`;");
  s=s.replace(/^function placeCount\(n\).*$/m,"function placeCount(n){return `${n} ${n===1?'Ort':'Orte'}`;}");
  s=s.replace(/'from '/g,"'ab '");
 }
 acorn.parse(s,{ecmaVersion:'latest',sourceType:'module'});content=Buffer.from(s);
 }else if(name.endsWith('.html'))content=Buffer.from(page(content.toString(),name));
 fs.writeFileSync(path.join(out,name),content);
}
for(const [from,name] of [['map-space.js','map-space.js'],['business-entry.js','business-entry.js'],['city-state.js','city-state.js'],['assets/app-shell.js','app-shell.js']]){
 let s=js(fs.readFileSync(path.join(source,from),'utf8'),from);s=localizedLinks(s);
 if(name==='city-state.js')s=s.replace("const shareEnglish=document.documentElement.lang==='en';","const shareEnglish=true;").replace("(shareEnglish?'en/':'')","'de/'");
 if(name==='map-space.js')s=s.replace("if(document.documentElement.lang==='en'){const note","if(document.documentElement.lang!=='ru'){const note");
 if(name==='app-shell.js')s=s.replace("document.documentElement.lang==='en'?","true?");
 if(name==='business-entry.js')s=s.replace("const en=document.documentElement.lang==='en';","const en=true;");
 fs.writeFileSync(path.join(out,name),s);
}
console.log('German Flensburg interface generated at '+out);
