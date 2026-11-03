import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validatePacket,readModel} from './validate-packet.mjs';
import {readPublishedFeed,filterForPublication} from './publication-filter.mjs';
import {normalizePacket, localizeRecord} from './normalize-packet.mjs';
import {syncRegistry} from './sync-registry.mjs';

const json = file => JSON.parse(fs.readFileSync(file,'utf8'));
const writeJSON = (file, data) => {fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const enText = 'Events. Places. Plans.';
const ruText = 'События. Места. Планы.';

function metadata(city, lang, route) {
  const name = city.name[lang], title = `Happy Map — ${name}: ${lang==='ru'?'события и места':'Events and Places'}`;
  const description = lang==='ru' ? `${name}: проверенные события и интересные места на одной карте. Выбирай, куда пойти, и сохраняй планы.` : `Discover verified events and interesting places in ${name}. Choose where to go and save your plans.`;
  const url = `https://happymap.app/${city.id}/${route}`;
  const image = `https://happymap.app/assets/happy-map-unified-20261015-${lang}.png`;
  const alt = 'Happy Map — '+(lang==='ru'?ruText:enText);
  return {title,description,url,image,alt,html:`<title>${esc(title)}</title>\n<meta name="description" content="${esc(description)}">\n<link rel="canonical" href="${url}">\n<meta property="og:type" content="website"><meta property="og:site_name" content="Happy Map">\n<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}">\n<meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${alt}"><meta property="og:locale" content="${lang==='ru'?'ru_RU':'en_GB'}">\n<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="${alt}">`};
}

function sourcePage(city, packet) {
  const sources=packet.sources.map(s=>localizeRecord(s,'en'));
  const rows=sources.map(s=>`<tr><td><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a></td><td>${esc(s.status)}${s.accessStatus!==s.status?' / '+esc(s.accessStatus):''}</td><td>${s.count}</td><td>${esc(s.checkedAt)}</td><td>${esc(s.note)}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(city.name.en)} sources · Happy Map</title><style>body{font:16px/1.55 system-ui;margin:0;background:#f6f7f4;color:#29312d}main{max-width:1200px;margin:auto;padding:28px}a{color:inherit}table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #ddd}h1{line-height:1.1}.scroll{overflow:auto}small{display:block}</style></head><body><main><a href="/${city.id}/index.html">← Open ${esc(city.name.en)} map</a><h1>${esc(city.name.en)}: sources and coverage</h1><p>${esc(packet.coverage)}</p><p>${packet.events.length} dated listings · ${packet.places.length} sourced places · ${packet.events.filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng)).length} events with verified venue pins. Unlocated events have no invented pins.</p><p>Event times use ${esc(city.ianaTimezone)}. Check tickets, cancellations and admission with the organizer before going. A source link or a public preview does not mean its full history was reviewed or imported. These are editorial snapshots; no automatic source parser is implied.</p><p><a href="events.json">Event feed</a> · <a href="places.json">Place feed</a> · <a href="source-registry.json">Source registry</a></p><div class="scroll"><table><thead><tr><th>Source</th><th>Review / access status</th><th>Imported listings</th><th>Checked (UTC/offset)</th><th>Evidence and limits</th></tr></thead><tbody>${rows}</tbody></table></div></main></body></html>`;
}

export function renderCity(raw, config, {root=process.cwd(),templateRoot=root,now=Date.now(),publishedRef='HEAD'}={}) {
  const normalized=raw.translations?raw:normalizePacket(raw,config);
  const model=readModel(root),previous=readPublishedFeed(root,config.id,publishedRef);
  const {packet,publication}=filterForPublication(normalized,config,{now,model,publishedFeed:previous.feed,publishedCommit:previous.commit});
  const result=validatePacket(packet,config,{now,model});
  if(!result.ok)throw Error(`Refusing ${config.id}:\n${result.errors.join('\n')}`);
  const lang=config.interfaceLanguages.includes('ru')?'ru':'en';
  const template=path.join(templateRoot,'public',lang==='ru'?'':'en','vienna');
  const templateHTML=fs.readFileSync(path.join(template,'index.html'),'utf8');
  if(!templateHTML.includes('id="cityLayer"')||templateHTML.includes('id="placesLayer"'))throw Error('A verified two-mode Vienna template is required before rendering new cities.');
  const folder=path.join(root,'public',config.id);
  fs.mkdirSync(folder,{recursive:true});
  const points=packet.places.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  // Camera origin comes from actual sourced venues. It is never reused as a venue pin.
  const median=key=>points.map(p=>p[key]).sort((a,b)=>a-b)[Math.floor(points.length/2)];
  const center=[median('lat'),median('lng')];
  const preview=metadata(config,lang,'');
  const englishPreview=metadata(config,'en','');
  const reviewed=json(path.join(root,'data/i18n/english-reviewed.json'));
  Object.assign(reviewed,packet.translations||{});
  reviewed[preview.title]=englishPreview.title; reviewed[preview.description]=englishPreview.description;
  reviewed[config.name.ru]=config.name.en;
  reviewed['Справочник мест · источники в каждой карточке']='Venue directory · sources in every card';
  const ui=json(path.join(root,'scripts/interface-en.json'));
  Object.assign(ui,{[preview.title]:englishPreview.title,[preview.description]:englishPreview.description,[`Карта событий в ${config.name.ru}`]:`${config.name.en} event map`,'Справочник мест · источники в каждой карточке':'Venue directory · sources in every card'});
  ui['Найденный канал и загруженное событие — разные вещи. В полном каталоге показаны статусы проверки. Управление входом и синхронизацией планов доступно в профиле.']='Finding a source and importing an event are separate steps. The full catalogue shows review statuses. Manage sign-in and plan synchronization in your profile.';
  writeJSON(path.join(root,'scripts/interface-en.json'),ui);
  for(const [file,content] of [['index.html',templateHTML],['map.html',fs.readFileSync(path.join(template,'map.html'),'utf8')],...['app.js','discovery.js','style.css','map-layout.js'].map(name=>[name,fs.readFileSync(path.join(template,name),'utf8')])]){
    let s=content.replaceAll('Europe/Vienna',config.ianaTimezone).replaceAll('vienna',config.id).replaceAll('Vienna',config.name.en).replaceAll('Вена',config.name.ru).replaceAll('Вене',config.nameLocativeRu||config.name.ru).replaceAll('Вену',config.name.ru);
    if(file==='app.js'){
      if(config.defaultDateView==='week')s=s.replace('dates=[],day=0,','dates=[],day=-1,');
      // Optional event-language labels apply only to this city's generated UI.
      // They label verified record values; they never infer an event language.
      if(config.eventLanguages){
        const labels=Object.fromEntries(config.eventLanguages.map(entry=>[entry.code,lang==='ru'?({'EN':'Английский','RU':'Русский','DE':'Немецкий','FR':'Французский'}[entry.code]||entry.label):entry.label]));
        labels.oth='Language not listed';
        s=s.replace(/function languageLabel\(value\)\{[^\n]+\}/,`function languageLabel(value){return (${JSON.stringify(labels)})[value]||value;}`);
        const terms=Object.fromEntries(config.eventLanguages.map(entry=>[entry.code,[entry.code,...(entry.terms||[])]]));
        s=s.replace('const today=()=>',`const languageMatches=(value,code)=>(${JSON.stringify(terms)}[code]||[code]).some(term=>term===code?String(value||'').toUpperCase().split(/[^A-Z]+/).includes(code):String(value||'').toLocaleLowerCase().includes(term.toLocaleLowerCase()));\nconst today=()=>`);
      }
      s=s.replace(/position=\[\s*48\.20817\s*,\s*16\.37382\s*\]/g,'position='+JSON.stringify(center)).replaceAll(' EUR', ' '+config.currency);
      // New-city first entry shows the city's event selection. Existing saved
      // origins and explicit radius/deep links still restore the nearby circle.
      s=s.replace('radius=.5,limit=18',`radius=${config.defaultRadiusKm??0},limit=18`);
      s=s.replace('function restoreNear(){','let initialCityOverview=true;\nfunction restoreNear(){');
      s=s.replace('position=n.position;radius=','initialCityOverview=false;position=n.position;radius=');
      s=s.replace('position=values;radius=.5;','initialCityOverview=false;position=values;radius=.5;');
      s=s.replace('function fitMap(){',"function fitInitialCity(){const points=[...places,...events].filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng));if(map&&points.length)map.fitBounds(points.map(e=>[e.lat,e.lng]),{paddingTopLeft:[55,85],paddingBottomRight:[55,110],maxZoom:13});}\nfunction fitMap(){");
      const closed=lang==='ru'?'Закрыто':'Closed',days=lang==='ru'?['Вс','Пн','Вт','Ср','Чт','Пт','Сб']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      Object.assign(reviewed,{'Закрыто':'Closed','Вс':'Sun','Пн':'Mon','Вт':'Tue','Ср':'Wed','Чт':'Thu','Пт':'Fri','Сб':'Sat'});
      const aliases={};['sun','mon','tue','wed','thu','fri','sat'].forEach((k,i)=>aliases[k]=days[i]);['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].forEach((k,i)=>aliases[k]=days[i]);
      s=s.replace('const today=()=>',`const admissionText=e=>[e.admission,e.priceNote].filter(v=>typeof v==='string'&&v.trim()).filter((v,i,a)=>a.indexOf(v)===i).join(' ');\nconst formatVenueHours=value=>typeof value==='string'?value:value&&typeof value==='object'?Object.entries(value).map(([day,h])=>{const label=${JSON.stringify(aliases)}[day]||day;return h===null?label+': '+${JSON.stringify(closed)}:Array.isArray(h)&&h.length===2&&h.every(v=>typeof v==='string')?label+': '+h.join('–'):'';}).filter(Boolean).join('; '):'';\nconst today=()=>`);
      s=s.replaceAll('esc(e.priceNote||','esc(admissionText(e)||');


      s=s.replace("const today=()=>", "const eventDateLabel=e=>e.dateType==='published_interval'?dateLabel(e.intervalStartDate||e.date)+' – '+dateLabel(e.endDate):dateLabel(e.date);\nconst today=()=>");
      s=s.replaceAll('esc(dateLabel(e.date))','esc(eventDateLabel(e))');
      s=s.replace('const today=()=>',"const intervalTimeMatches=(e,days)=>e.dateType!=='published_interval'?null:!!e.visitSchedule&&days.some(d=>{const h=e.visitSchedule[d];return h&&NoreliDiscovery.availableOnDate(e,d)&&(time==='day'?h.start<'18:00':h.end>'18:00'||h.end<h.start);});\nconst today=()=>");
      s=s.replace("(time==='all'||(e.visitSchedule?","(time==='all'||(e.dateType==='published_interval'?intervalTimeMatches(e,day<0?dates:[dates[day]]):(e.visitSchedule?");
      s=s.replace("t>='18:00')))&&(language", "t>='18:00'))))&&(language");
      const unknown=lang==='ru'?'Время уточняется':'Time not listed',hoursUnknown=lang==='ru'?'Часы посещения не указаны':'Visiting hours not published',hoursLabel=lang==='ru'?'часы посещения':'visiting hours';
      reviewed['Часы посещения не указаны']='Visiting hours not published';reviewed['часы посещения']='visiting hours';
      s=s.replace('const today=()=>',`const eventTimeLabel=e=>e.dateType==='published_interval'?(e.visitSchedule&&e.time?e.time+(e.end?'–'+e.end:'')+' · '+${JSON.stringify(hoursLabel)}:${JSON.stringify(hoursUnknown)}):(e.time||${JSON.stringify(unknown)});\nconst today=()=>`);
      s=s.replace('return visit?{...e,date,time:visit.start||null,end:visit.end||null}:e;','return visit?{...e,intervalStartDate:e.date,date,time:visit.start||null,end:visit.end||null}:e;');
      for(const text of ['Время уточняется','время уточняется','Time not listed','time not listed'])s=s.replaceAll(`esc(e.time||'${text}')`,'esc(eventTimeLabel(e))');
      s=s.replaceAll("${e.end?'–'+esc(e.end):''}","${e.dateType==='published_interval'?'':e.end?'–'+esc(e.end):''}");
      s=s.replaceAll('Вход через Google/почту и публикация организаторами пока не подключены; планы сохраняются на этом устройстве.','Управление входом и синхронизацией планов доступно в профиле.');
      s=s.replaceAll('Google/email sign-in and organiser publishing are not connected; plans are saved on this device.','Manage sign-in and plan synchronization in your profile.');
      reviewed['Найденный канал и загруженное event — разные вещи. В полном каталоге показаны статусы проверки. Управление входом и синхронизацией планов доступно в профиле.']='Finding a source and importing an event are separate steps. The full catalogue shows review statuses. Manage sign-in and plan synchronization in your profile.';
      reviewed['Управление входом и синхронизацией планов доступно в профиле.']='Manage sign-in and plan synchronization in your profile.';

    }
    if(file==='discovery.js'){
      s=s.replace(/fetch\((['"])([^'"]*places\.json)\1\)/g,(_m,q,url)=>`fetch(${q}${url}${q},{cache:'no-store'})`);
      s=s.replaceAll("beer.currency==='RSD'?'RSD':'₾'","beer.currency||"+JSON.stringify(config.currency));
      s=s.replaceAll('esc(p.openingHours)','esc(formatVenueHours(p.openingHours))');
      s=s.replaceAll("${esc(p.description)}</p><div class=\"detail-facts\">","${esc(p.description)}</p>${admissionText(p)?`<p class=\"detail-description\">${esc(admissionText(p))}</p>`:''}<div class=\"detail-facts\">");
      s=s.replace('[p.website,p.sourceUrl,...(p.sourceURLs||[])]','[p.website,p.sourceUrl,p.openingHoursSource,p.visitScheduleSource,...(p.sourceURLs||[])]');

      s=s.replace("if(entry.get('radius')==='all'){radius=0;$('#radiusFilter').value='0';}","if(['all','0','0.5','.5','500'].includes(entry.get('radius'))){initialCityOverview=false;radius=['all','0'].includes(entry.get('radius'))?0:.5;$('#radiusFilter').value=String(radius);}");
      s=s.replace("if(map){if(radius&&layer!=='city')", "if(map){if(initialCityOverview&&!radius)fitInitialCity();else if(radius&&layer!=='city')");

      s=s.replace("(time==='all'||(e.visitSchedule?","(time==='all'||(e.dateType==='published_interval'?intervalTimeMatches(e,[d]):(e.visitSchedule?");
      s=s.replace(">='18:00')))&&(!freeOnly",">='18:00'))))&&(!freeOnly");
    }
    if(file.endsWith('.html')){
      if(config.eventLanguages){
        const options='<option value="all">'+(lang==='ru'?'Любой':'Any')+'</option>'+config.eventLanguages.map(entry=>`<option value="${esc(entry.code)}">${esc(lang==='ru'?({'EN':'Английский','RU':'Русский','DE':'Немецкий','FR':'Французский'}[entry.code]||entry.label):entry.label)}</option>`).join('');
        s=s.replace(/(<select id="languageFilter"[^>]*>)[\s\S]*?(<\/select>)/,(_,start,end)=>start+options+end);
      }
      s=s.replace(/<title>[\s\S]*?<\/title>\s*/,'').replace(/<meta\b[^>]*(?:name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>\s*/g,'').replace(/<link\b[^>]*rel="canonical"[^>]*>\s*/g,'');
      s=s.replace(/(<head>)/,'$1\n'+metadata(config,lang,file==='index.html'?'':file).html+'\n');
      s=s.replace(/(<span class="edition">)[^<]*(<\/span>)/,(_,a,b)=>a+esc(config.name.en.toUpperCase()+' · '+config.countryCode)+b);
      s=s.replace(/(<a class="data-credit"[^>]*>)[\s\S]*?(<\/a>)/,(_,a,b)=>a+(lang==='ru'?'Справочник мест · источники в каждой карточке':'Venue directory · sources in every card')+b);
      s=s.replace(/(src|href)="([^"<>]+\.(?:js|css))(?:\?[^"]*)?"/g,(_,attr,url)=>url.startsWith('http')?`${attr}="${url}"`:`${attr}="${url}?v=city-expansion-20261015"`);
    }
    if(config.eventLanguages&&['app.js','discovery.js'].includes(file))s=s.replaceAll("(e.language||'').includes(language)","languageMatches(e.language,language)");
    fs.writeFileSync(path.join(folder,file),s);
  }
  for(const route of ['invite.html','share.html']){
    const m=metadata(config,lang,route);
    const label=lang==='ru'?'Открыть карту':'Open map';
    fs.writeFileSync(path.join(folder,route),`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${m.html}<script src="/language-switch.js?v=city-expansion-20261015"></script></head><body><h1>${esc(m.title)}</h1><p>${esc(m.description)}</p><a href="/${config.id}/index.html">${label} →</a><script>location.replace('/${config.id}/index.html'+location.search+location.hash);</script></body></html>`);
  }
  const events=packet.events.map(e=>localizeRecord(e,lang)),places=packet.places.map(p=>localizeRecord(p,lang)),sources=packet.sources.map(s=>localizeRecord(s,lang));
  const dates=events.flatMap(e=>[e.date,e.endDate].filter(Boolean)).sort();
  const common={city:config.canonicalCity,cityId:config.id,timezone:config.ianaTimezone,currency:config.currency,generatedAt:packet.checkedAt,checkedAt:packet.checkedAt,coverage:packet.coverage};
  writeJSON(path.join(folder,'events.json'),{...common,startDate:packet.window?.startDate||dates[0],endDate:packet.window?.endDate&&packet.window.endDate<dates.at(-1)?packet.window.endDate:dates.at(-1),events,sourceRegistry:sources});
  writeJSON(path.join(folder,'places.json'),{...common,operatingStatusVerified:false,description:'Sourced venue selection. A directory entry does not confirm opening today; check the venue before visiting.',places});
  writeJSON(path.join(folder,'source-registry.json'),{city:config.canonicalCity,checkedAt:packet.checkedAt,sources,note:'Discovery, access checks and imported records are separate. No source parser or automatic refresh is implied.'});
  fs.writeFileSync(path.join(folder,'sources.html'),sourcePage(config,packet));
  // Each route keeps the established app metadata and owner/auth architecture.
  const appDir=path.join(root,'app',config.id);fs.mkdirSync(appDir,{recursive:true});
  const m=metadata(config,'en','');
  const appMeta={title:m.title,description:m.description,openGraph:{title:m.title,description:m.description,locale:'en_GB',images:[{url:m.image,width:1200,height:630,alt:m.alt}]},twitter:{title:m.title,description:m.description,card:'summary_large_image',images:[{url:m.image,alt:m.alt}]}};
  fs.writeFileSync(path.join(appDir,'page.tsx'),`import {redirect} from "next/navigation";\nexport const metadata=${JSON.stringify(appMeta,null,2)};\nexport default function Page(){redirect("/${config.id}/index.html");}\n`);
  writeJSON(path.join(root,'data/i18n/english-reviewed.json'),reviewed);
  writeJSON(path.join(root,'data/city-expansion/packets',config.id+'.json'),packet);
  if(!raw.translations)writeJSON(path.join(root,'data/city-expansion/research',config.id+'.json'),raw);
  const activePath=path.join(root,'data/city-expansion/launched.json');
  const active=fs.existsSync(activePath)?json(activePath):{cityIds:[]};
  if(!active.cityIds.includes(config.id))active.cityIds.push(config.id);
  writeJSON(activePath,active);
  const report={cityId:config.id,checkedAt:packet.checkedAt,publication,templateRoot,templateSHA256:crypto.createHash('sha256').update(templateHTML).digest('hex'),center, ...result};
  writeJSON(path.join(root,'data/city-expansion/reports',config.id+'.json'),report);
  syncRegistry(root);
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),get=flag=>args.includes(flag)?args[args.indexOf(flag)+1]:undefined;
  const packetFile=get('--packet');if(!packetFile)throw Error('Usage: node scripts/city-expansion/render-city.mjs --packet research.json [--template-root /path] [--published-ref HEAD-or-SHA] [--apply]');
  const raw=json(packetFile),registry=json('data/city-expansion/registry.json'),config=registry.newCities.find(c=>c.id===raw.cityId);
  if(!config)throw Error('Unapproved city '+raw.cityId);
  const packet=raw.translations?raw:normalizePacket(raw,config);
  if(args.includes('--apply'))console.log(JSON.stringify(renderCity(raw,config,{templateRoot:get('--template-root')||process.cwd(),publishedRef:get('--published-ref')||'HEAD'}),null,2));
  else {const report=validatePacket(packet,config);console.log(JSON.stringify({dryRun:true,...report},null,2));if(!report.ok)process.exitCode=1;}
}
