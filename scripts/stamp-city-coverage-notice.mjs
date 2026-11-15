// A visible coverage limitation, not a readiness promise or contact collection.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const copy={
 ru:{title:'Наполняем событиями',body:'Сейчас здесь только часть афиши. Полнота городской подборки ещё не подтверждена; карта и сохранение планов доступны.',sources:'Источники и проверка'},
 en:{title:'We’re adding events',body:'This is a partial event listing. City-wide coverage has not yet been confirmed; the map and saved plans remain available.',sources:'Sources and verification'},
 sr:{title:'Dodajemo događaje',body:'Ovo je delimičan izbor događaja. Potpunost ponude u gradu još nije potvrđena; mapa i čuvanje planova su dostupni.',sources:'Izvori i provera'},
 es:{title:'Estamos añadiendo eventos',body:'Esta es una selección parcial. La cobertura de toda la ciudad aún no está confirmada; el mapa y los planes guardados siguen disponibles.',sources:'Fuentes y verificación'},
 de:{title:'Wir ergänzen Veranstaltungen',body:'Dies ist eine Teilauswahl. Die stadtweite Abdeckung ist noch nicht bestätigt; Karte und gespeicherte Pläne bleiben verfügbar.',sources:'Quellen und Prüfung'},
 'pt-br':{title:'Estamos adicionando eventos',body:'Esta é uma seleção parcial. A cobertura de toda a cidade ainda não foi confirmada; o mapa e os planos salvos continuam disponíveis.',sources:'Fontes e verificação'},
 'fr-ca':{title:'Nous ajoutons des événements',body:'Cette sélection est partielle. La couverture de toute la ville n’est pas encore confirmée; la carte et les plans enregistrés restent accessibles.',sources:'Sources et vérification'}
};

export const statusCopy={
 ru:{partial:'Сегодня в подборке меньше 20 актуальных событий. Работаем над дополнением. Это не вся афиша города.',unknown:'Сегодняшнюю подборку пока не удалось подтвердить. Это не означает, что в городе нет событий.'},
 en:{partial:'Today’s listing has fewer than 20 current events. We’re working on adding more. This is not the city’s full programme.',unknown:'Today’s listing could not yet be confirmed. This does not mean there are no events in the city.'},
 sr:{partial:'Današnji izbor ima manje od 20 aktuelnih događaja. Radimo na dopuni. Ovo nije ceo program grada.',unknown:'Današnji izbor još nije potvrđen. To ne znači da u gradu nema događaja.'},
 es:{partial:'La selección de hoy incluye menos de 20 eventos vigentes. Estamos ampliándola. No es toda la agenda de la ciudad.',unknown:'Aún no se ha podido confirmar la selección de hoy. Esto no significa que no haya eventos en la ciudad.'},
 de:{partial:'Die heutige Auswahl enthält weniger als 20 aktuelle Veranstaltungen. Wir ergänzen sie. Dies ist nicht das gesamte Stadtprogramm.',unknown:'Die heutige Auswahl konnte noch nicht bestätigt werden. Das bedeutet nicht, dass es keine Veranstaltungen in der Stadt gibt.'},
 'pt-br':{partial:'A seleção de hoje tem menos de 20 eventos atuais. Estamos ampliando a lista. Esta não é toda a programação da cidade.',unknown:'Ainda não foi possível confirmar a seleção de hoje. Isso não significa que não haja eventos na cidade.'},
 'fr-ca':{partial:'La sélection du jour compte moins de 20 événements actuels. Nous la complétons. Ce n’est pas tout le programme de la ville.',unknown:'La sélection du jour n’a pas encore pu être confirmée. Cela ne signifie pas qu’il n’y a aucun événement en ville.'}
};

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function clean(html){return html.replace(/<!-- city-coverage-notice -->[\s\S]*?<!-- \/city-coverage-notice -->\s*/g,'').replace(/<script[^>]*src="\/assets\/city-coverage\.js(?:\?[^"<>]*)?"[^>]*>[\s\S]*?<\/script>\s*/g,'').replace(/<link[^>]*href="\/assets\/city-coverage\.css(?:\?[^"<>]*)?"[^>]*>\s*/g,'');}
export function pageIdentity(file,cities){
 const parts=file.replaceAll('\\','/').replace(/^public\//,'').split('/');
 const locale=Object.hasOwn(copy,parts[0])?parts.shift():'ru';
 const first=parts[0];const city=cities.has(first)?first:(['map.html','index.html'].includes(first)?'tbilisi':null);
 return {city,locale};
}
export function stampHtml(html,{city,locale,timezone},hash){
 html=clean(html);if(!city||city==='flensburg'||!html.includes('id="eventList"'))return html;
 const t=copy[locale]||copy.en;const messages=statusCopy[locale]||statusCopy.en;const sourcePath='/'+(locale==='ru'?'':locale+'/')+(city==='tbilisi'?'':city+'/')+'sources.html';
 const note=`<!-- city-coverage-notice --><aside id="cityCoverageNotice" class="city-coverage-notice" role="note" data-coverage-city="${esc(city)}" data-coverage-status="conditional" data-coverage-state="unknown" data-coverage-timezone="${esc(timezone||'')}" data-coverage-unknown="${esc(messages.unknown)}" data-coverage-partial="${esc(messages.partial)}" aria-labelledby="cityCoverageTitle"><div><strong id="cityCoverageTitle">${esc(t.title)}</strong><p data-coverage-body>${esc(messages.unknown)}</p></div><a href="${esc(sourcePath)}">${esc(t.sources)} ↗</a></aside><!-- /city-coverage-notice -->`;
 if(!/<main(?:\s[^>]*)?>/.test(html))throw Error('Map page has no main: '+city+'/'+locale);
 html=html.replace(/<main(?:\s[^>]*)?>/,m=>m+note);
 return html.replace('</head>',`<link rel="stylesheet" href="/assets/city-coverage.css?v=${hash}"><script defer src="/assets/city-coverage.js?v=${hash}"></script></head>`);
}
export function run(mode='stamp'){
 const picker=JSON.parse(fs.readFileSync('public/city-picker.json','utf8'));const cities=new Set(picker.cities.map(c=>c.id));
 const hash=crypto.createHash('sha256').update(fs.readFileSync('public/assets/city-coverage.css')).update(fs.readFileSync('public/assets/city-coverage.js')).digest('hex').slice(0,12);
 const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
 const zones=new Map();for(const city of cities){const source=fs.readFileSync('public/'+(city==='tbilisi'?'':city+'/')+'app.js','utf8');const match=source.match(/(?:setTimeZone\(|timeZone:)\s*['"]([^'"]+)['"]/);if(!match)throw Error('Missing city IANA timezone: '+city);new Intl.DateTimeFormat('en',{timeZone:match[1]});zones.set(city,match[1]);}const seen=new Set();let pages=0;
 for(const file of walk('public').filter(x=>x.endsWith('.html'))){
  const old=fs.readFileSync(file,'utf8'),id=pageIdentity(file,cities);
  id.timezone=zones.get(id.city);const html=mode==='clean'?clean(old):stampHtml(old,id,hash);
  if(html!==old)fs.writeFileSync(file,html);
  if(mode!=='clean'&&html.includes('id="cityCoverageNotice"')){seen.add(id.city);pages++;}
 }
 if(mode!=='clean'){
  const missing=[...cities].filter(c=>c!=='flensburg'&&!seen.has(c));if(missing.length)throw Error('Missing coverage notices: '+missing.join(','));
  fs.writeFileSync('public/city-coverage-status.json',JSON.stringify({policy:'Show the notice below 20 eligible events on the current local city date. 20 or more hides the notice but is not a claim of complete city coverage. Empty or unavailable data remains unknown.',contactCollectionEnabled:false,notificationDeliveryEnabled:false,cities:[...cities].map(city=>({city,noticeEnabled:city!=='flensburg',status:city==='flensburg'?'excluded':'evaluated_in_browser',threshold:20}))},null,2)+'\n');
 }
 console.log(JSON.stringify({mode,noticePages:pages,cities:seen.size,contactsCollected:false,notificationsPromised:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))run(process.argv.includes('--clean')?'clean':'stamp');
