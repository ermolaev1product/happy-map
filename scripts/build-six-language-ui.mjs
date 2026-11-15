// All six interface languages share the same city catalogues and identity keys.
// This build does not translate listings, change events, or create an APK.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import crypto from 'node:crypto';
import {createLocalePolicy} from '../lib/locale-routing.mjs';
const langs=['ru','en','sr','es','de','pt-BR'],added=['sr','es','de','pt-BR'];
const file='data/i18n/market-locales.json',registry=JSON.parse(fs.readFileSync(file));
registry.locales.sr={prefix:'sr',label:'Srpski (latinica)'};registry.locales.es={prefix:'es',label:'Español'};
registry.policy='Six shared interface languages in every existing city: RU, EN, SR (Latin), ES, DE, PT-BR. Existing additional local languages are retained. Interface language does not filter event language. Catalogue descriptions may remain in their existing language.';
for(const city of registry.cities){city.availableLocales=[...new Set([...langs,...city.availableLocales])];}
registry.sharedLocalizedPages=[...new Set([...registry.sharedLocalizedPages,'sources.html'])];
fs.writeFileSync(file,JSON.stringify(registry,null,2)+'\n');
const policy=createLocalePolicy(registry),copy=JSON.parse(fs.readFileSync('data/i18n/global-shell-copy.json'));
function run(file,args=[]){const r=spawnSync(process.execPath,[file,...args],{stdio:'inherit'});if(r.status!==0)throw Error(file+' failed');}
run('scripts/build-global-ui-dictionaries.mjs');
run('scripts/build-locale-policy.mjs');
// Refresh the existing Montréal French client against the current shared logic.
run('scripts/localize-city-ui.mjs',['--locale','fr-CA','--city','montreal','--dictionary','data/i18n/fr-CA-ui.json','--output',path.resolve('public')]);
for(const locale of added)run('scripts/localize-city-ui.mjs',['--locale',locale,'--city','all','--dictionary',`data/i18n/${locale}-ui.json`,'--output',path.resolve('public')]);
const pickerFile='public/city-picker.json',picker=JSON.parse(fs.readFileSync(pickerFile));
for(const locale of added){
 const dictionary=JSON.parse(fs.readFileSync(`data/i18n/${locale}-ui.json`));
 if(!picker.copy[locale])picker.copy[locale]=Object.fromEntries(Object.entries(picker.copy.en).map(([k,v])=>[k,dictionary[v]||dictionary[v.trim()]||v]));
 for(const city of picker.cities)city.name[locale]=copy[locale].names[city.id]||city.name[locale]||dictionary[city.name.en]||city.name.en;
}
fs.writeFileSync(pickerFile,JSON.stringify(picker,null,2)+'\n');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const locale of added){
 const prefix=policy.prefix(locale),t=copy[locale],dir='public/'+prefix,cityFile=dir+'/cities.html',names=new Intl.DisplayNames([locale==='sr'?'sr-Latn':locale],{type:'region'});
 let h=fs.readFileSync(cityFile,'utf8');const cards=picker.cities.map(city=>`<a href="${policy.path(city.path,locale)}?lang=${locale}" class="city-card" data-city="${city.id}" data-country="${city.country}"><span class="city-monogram">${esc(city.name[locale].slice(0,2))}</span><span><strong>${esc(city.name[locale])}</strong><small>${esc(names.of(city.country))}</small></span><span>↗</span></a>`).join('');
 h=h.replace(/(<div class="city-cards">)[\s\S]*?(<\/div><p class="city-note">)/,'$1'+cards+'$2');
 const p=picker.copy[locale];h=h.replace(/(<section class="choose-intro">[\s\S]*?<h1>)[\s\S]*?(<\/h1><p>)[\s\S]*?(<\/p><\/section>)/,'$1'+esc(p.heading)+'$2'+esc(p.intro)+'$3').replace(/(<p class="city-note">)[\s\S]*?(<\/p>)/,'$1'+esc(p.note)+'$2');
 h=h.replace(/<!-- guide-directory -->[\s\S]*?<!-- \/guide-directory -->/g,`<!-- guide-directory --><p><a href="/guide/${prefix}/">${esc(t.guideDirectory)}</a></p><!-- /guide-directory -->`);
 fs.writeFileSync(cityFile,h);
 // Share pages remain readable, localized landing pages, not redirect traps.
 const shareFile=dir+'/share.html',dict=JSON.parse(fs.readFileSync(`data/i18n/${locale}-ui.json`));
 let shareHead=fs.readFileSync(shareFile,'utf8').split('</head>')[0].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 fs.writeFileSync(shareFile,shareHead+`<link rel="stylesheet" href="/assets/guide.css"><style>main{max-width:900px}.share-art{max-width:100%;height:auto;border-radius:20px}nav{display:flex;flex-wrap:wrap;gap:16px}</style></head><body><main><h1>Happy Map</h1><img class="share-art" src="https://happymap.app/assets/happy-map-unified-20261015-${locale==='de'?'de':'en'}.png" width="1200" height="630" alt="${esc(t.suffix)}"><p>${esc(dict['Exhibitions, concerts, meetups and new favourite places — all on one map. Discover what is happening nearby, find where to go and make your plans.']||t.guideNote)}</p><a class="primary" href="/${prefix}/cities.html?lang=${locale}">${esc(dict['Choose a city'])} →</a><p>${esc(t.sourceNotice)}</p><nav>${langs.map(l=>`<a lang="${l}" href="${policy.path('/share.html',l)}">${l==='pt-BR'?'PT-BR':l.toUpperCase()}</a>`).join('')}</nav></main></body></html>`);
 // Shared entry assets must never retain a stale city availability registry.
 for(const asset of ['locale-policy.js','language-switch.js','entry-language.js','city-picker.js'])fs.copyFileSync('public/'+asset,dir+'/'+asset);
 // The complete directory routes to each city's localized map. Existing detailed
 // guide pages and their source provenance stay intact.
 const guideDir=`public/guide/${prefix}`;fs.mkdirSync(guideDir,{recursive:true});
 for(const city of picker.cities){
  const guideFile=guideDir+'/'+city.id+'.html';
  if(fs.existsSync(guideFile)&&!fs.readFileSync(guideFile,'utf8').includes('happymap-locale-shell'))continue;
  const dict=JSON.parse(fs.readFileSync(`data/i18n/${locale}-ui.json`)),cityName=city.name[locale],title=t.title.replaceAll('{city}',cityName).replace(' | Happy Map',''),desc=t.description.replaceAll('{city}',cityName);
  const map=policy.path(city.path,locale)+'?lang='+locale;
  fs.writeFileSync(guideFile,`<!doctype html><html lang="${locale==='sr'?'sr-Latn':locale}"><head><meta charset="utf-8"><meta name="happymap-locale-shell" content="1"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Happy Map</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="https://happymap.app/guide/${prefix}/${city.id}"><link rel="stylesheet" href="/assets/guide.css"></head><body><header><a href="/${prefix}/cities?lang=${locale}">Happy Map</a><nav>${langs.map(l=>`<a lang="${l}" href="/guide/${l==='ru'?'ru':policy.prefix(l)}/${city.id}">${l==='pt-BR'?'PT-BR':l.toUpperCase()}</a>`).join('')}</nav></header><main><h1>${esc(title)}</h1><p>${esc(desc)}</p><a class="primary" href="${map}&amp;layer=events&amp;period=week&amp;radius=all">${esc(dict['Open map']||dict['Map'])}</a><nav class="filters"><a href="${map}&amp;layer=events&amp;period=today&amp;radius=all">${esc(dict['Today'])}</a><a href="${map}&amp;layer=events&amp;period=week&amp;radius=all">${esc(dict['Next 7 days'])}</a><a href="${map}&amp;layer=places&amp;radius=all">${esc(dict['City places']||dict['Places'])}</a></nav><p>${esc(t.guideNote)}</p><p class="note">${esc(t.sourceNotice)}</p><a href="/guide/${prefix}/">${esc(t.guideDirectory)}</a></main></body></html>`);
 }
 fs.writeFileSync(guideDir+'/index.html',`<!doctype html><html lang="${locale==='sr'?'sr-Latn':locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.guideDirectory)} | Happy Map</title><link rel="canonical" href="https://happymap.app/guide/${prefix}/"><link rel="stylesheet" href="/assets/guide.css"></head><body><header><a href="/${prefix}/cities?lang=${locale}">Happy Map</a><nav>${langs.map(l=>`<a lang="${l}" href="${policy.path('/cities.html',l)}?lang=${l}">${l==='pt-BR'?'PT-BR':l.toUpperCase()}</a>`).join('')}</nav></header><main><h1>${esc(t.guideDirectory)}</h1><p>${esc(t.guideNote)}</p><ul>${picker.cities.map(c=>`<li><a href="/guide/${prefix}/${c.id}">${esc(c.name[locale])}</a></li>`).join('')}</ul></main></body></html>`);
}
// Responsive selector styling, isolated from the existing visual system.
const style=`.language-switch{display:inline-flex;flex-wrap:wrap;max-width:100%;gap:2px}.language-switch a{white-space:nowrap}.city-top{flex-wrap:wrap;gap:12px}.city-top .language-switch{flex-basis:100%;justify-content:flex-end}@media(max-width:760px){.map-first .header--compact{grid-template-rows:44px 44px auto}.map-first .header--compact>.language-switch{grid-column:1 / -1;grid-row:3;justify-self:end;flex-wrap:wrap}.map-first .header--compact>.language-switch a{min-width:36px;min-height:40px;padding:6px}.download-header .language-switch{flex-wrap:wrap}}`;
fs.writeFileSync('public/assets/global-languages.css',style+'\n');
const cssHash=crypto.createHash('sha256').update(style+'\n').digest('hex').slice(0,12);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const f of walk('public').filter(f=>f.endsWith('.html'))){
 let h=fs.readFileSync(f,'utf8');if(h.includes('language-switch.js')){h=h.replace(/<link rel="stylesheet" href="\/assets\/global-languages\.css(?:\?[^"<>]*)?">/g,'');h=h.replace('</head>',`<link rel="stylesheet" href="/assets/global-languages.css?v=${cssHash}"></head>`);fs.writeFileSync(f,h);}
}
for(const item of Object.values(registry.locales)){if(item.prefix&&fs.existsSync('public/'+item.prefix))for(const asset of ['locale-policy.js','language-switch.js','entry-language.js','city-picker.js'])fs.copyFileSync('public/'+asset,'public/'+item.prefix+'/'+asset);}
run('scripts/stamp-language-routing.mjs');
// Refresh all locale JS/CSS references after generation, including local languages.
for(const f of walk('public').filter(f=>f.endsWith('.html'))){let h=fs.readFileSync(f,'utf8');const changed=h.replace(/\b(src|href)=(['"])([^'"?#]+)(?:\?[^'"#]*)?\2/g,(m,attr,q,url)=>{if(!/\.(?:js|css)$/.test(url)||/^(?:https?:|\/\/)/.test(url))return m;const p=url.startsWith('/')?'public'+url:path.resolve(path.dirname(f),url);if(!fs.existsSync(p))return m;return `${attr}=${q}${url}?v=${crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0,12)}${q}`;});if(changed!==h)fs.writeFileSync(f,changed);}
console.log(JSON.stringify({languages:langs,cities:registry.cities.length,catalogueChanges:0,apkChanges:0,sourceDescriptions:'retained without claiming a new translation'}));
