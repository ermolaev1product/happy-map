(() => {
 const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cityInfo={tbilisi:{path:'/',map:'/map',tz:'Asia/Tbilisi',gap:"Abdeckungslücke: Kinovorstellungen dominieren die Übersicht. Kleinere Veranstaltungsorte, Buchclubs, Spiele und Barprogramme haben Priorität."},belgrade:{path:'/belgrade/',map:'/belgrade/',tz:'Europe/Belgrade',gap:"Abdeckungslücke: Bars dominieren das Ortsverzeichnis. Kinos, Märkte, Vintage-Läden, Museen und Kulturorte in Stadtvierteln außerhalb des Zentrums haben Priorität."},moscow:{path:'/moscow/',map:'/moscow/',tz:'Europe/Moscow',gap:"Abdeckungslücke: Das eigene Ortsverzeichnis ist noch klein. Kulturorte in den Stadtvierteln, Märkte und Museen haben Priorität; eine stadtweite Veranstaltungsübersicht kann das Verzeichnis nicht ersetzen."}};
 let priorities,cache=new Map(),request=0;
 const normalize=u=>{try{let x=new URL(u);return x.hostname.replace(/^www\./,'')+x.pathname.replace(/^\/s\//,'/').replace(/\/$/,'').toLowerCase();}catch{return '';}};
 function matches(url,rule){if(!url)return false;if(rule==='yandex'){try{return /^([^.]+\.)?yandex\./.test(new URL(url).hostname);}catch{return false;}}const a=normalize(url),b=normalize(rule);return a===b||a.startsWith(b+'/');}
 const links=p=>[p.sourceUrl,p.website,...(p.sourceURLs||[]),p.beerPrice?.sourceUrl,p.menuReference?.url].filter(Boolean);
 async function json(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('fetch');return r.json();}
 async function render(){
  const token=++request,key=$('#city').value,city=cityInfo[key];$('#status').textContent="Veröffentlichte Auswahl wird geladen …";
  try{
   if(!cache.has(key)){const [catalog,raw]=await Promise.all([json(city.path+'events.json'),json(city.path+'places.json')]);cache.set(key,{catalog,places:Array.isArray(raw)?raw:raw.places});}
   if(token!==request)return;
   const {catalog,places}=cache.get(key),today=new Intl.DateTimeFormat('en-CA',{timeZone:city.tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),dates=Array.from({length:7},(_,i)=>new Date(Date.parse(today+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
   const active=e=>!e.cancelled&&e.status!=='cancelled'&&dates.some(d=>e.date<=d&&(e.endDate||e.date)>=d&&!(e.closedWeekdays||[]).includes(new Date(d+'T12:00:00Z').getUTCDay()));
   const week=catalog.events.filter(active),bars=places.filter(p=>p.category==='bar'||p.categories?.includes('bar')),priced=places.filter(p=>Number.isFinite(p.beerPrice?.min));
   $('#stats').innerHTML=[[week.length,"Veranstaltungseinträge diese Woche"],[week.filter(e=>['film','cinema'].includes(e.category)).length,"davon Kinovorstellungen"],[places.length,"dauerhafte Orte im Katalog"],[bars.length,"davon Bars"],[priced.length,"Orte mit veröffentlichtem Bierpreis"]].map(([n,label])=>`<p><strong class="count">${n}</strong><br>${label}</p>`).join('');
   $('#gap').textContent=city.gap;$('#map').href=city.map;
   const q=$('#query').value.trim().toLocaleLowerCase();const rows=priorities.sources.filter(s=>s.city===key&&[s.name,s.type,s.scope,s.note].join(' ').toLocaleLowerCase().includes(q));
   $('#rows').innerHTML=rows.map(s=>{const all=catalog.events.filter(e=>matches(e.sourceUrl,s.match)),current=all.filter(active),ps=places.filter(p=>links(p).some(u=>matches(u,s.match)));return `<tr><td data-label="Source"><a class="title" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><p class="scope">${esc(s.type)} · ${esc(s.scope)}</p><span class="badge">${s.priority==='1'?"Höchste Priorität":"Als Nächstes"}</span></td><td data-label="In the published catalogue"><p><strong>${current.length}</strong> Veranstaltungen diese Woche</p><p>${all.length} gespeicherte Datensätze insgesamt</p><p>${ps.length} Orte mit einem Link</p><small>${all.length||ps.length?"Teildaten sind vorhanden; Vollständigkeit ist nicht bestätigt.":"Für diese URL wurden keine direkten Einträge gefunden."}</small></td><td data-label="What was checked / coverage gaps">${esc(s.note)}</td></tr>`;}).join('');
   $('#empty').hidden=rows.length>0;$('#method').textContent=priorities.method;
   $('#status').textContent=`${rows.length} sources · week ${dates[0]} — ${dates[6]} · selection file ${(catalog.generatedAt||'').slice(0,10)} · coverage im Umkreis von ${catalog.endDate}${today>catalog.endDate?" · selection is outdated":''}`;
  }catch{if(token===request){$('#stats').innerHTML='';$('#rows').innerHTML='';$('#status').textContent="Die Daten konnten nicht geladen werden. Lade die Seite neu; fehlende Werte werden nicht als Null angezeigt.";}}
 }
 const initial=new URLSearchParams(location.search).get('city');if(cityInfo[initial])$('#city').value=initial;
 $('#city').onchange=()=>render();$('#query').oninput=()=>render();
 json('/en/source-priorities.json').then(d=>{priorities=d;render();}).catch(()=>{$('#status').textContent="Die Quellen konnten nicht geladen werden. Lade die Seite neu.";});
})();
