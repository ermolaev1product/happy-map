(() => {
 const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cityInfo={tbilisi:{path:'/es/',map:'/es/map',tz:'Asia/Tbilisi',gap:"Carencia de cobertura: las proyecciones de cine dominan los anuncios. La prioridad son los locales pequeños, los clubes de lectura, los juegos y la programación de bares."},belgrade:{path:'/es/belgrade/',map:'/es/belgrade/',tz:'Europe/Belgrade',gap:"Carencia de cobertura: los bares dominan el catálogo de lugares. Las prioridades incluyen cines, mercados, tiendas de segunda mano y vintage, museos y espacios culturales de barrio fuera del centro."},moscow:{path:'/es/moscow/',map:'/es/moscow/',tz:'Europe/Moscow',gap:"Carencia de cobertura: el catálogo específico de lugares sigue siendo pequeño. La prioridad son los espacios culturales de barrio, los mercados y los museos; la agenda de eventos de toda la ciudad no puede sustituirlo."}};
 let priorities,cache=new Map(),request=0;
 const normalize=u=>{try{let x=new URL(u);return x.hostname.replace(/^www\./,'')+x.pathname.replace(/^\/s\//,'/es/').replace(/\/$/,'').toLowerCase();}catch{return '';}};
 function matches(url,rule){if(!url)return false;if(rule==='yandex'){try{return /^([^.]+\.)?yandex\./.test(new URL(url).hostname);}catch{return false;}}const a=normalize(url),b=normalize(rule);return a===b||a.startsWith(b+'/es/');}
 const links=p=>[p.sourceUrl,p.website,...(p.sourceURLs||[]),p.beerPrice?.sourceUrl,p.menuReference?.url].filter(Boolean);
 async function json(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('fetch');return r.json();}
 async function render(){
  const token=++request,key=$('#city').value,city=cityInfo[key];$('#status').textContent="Cargando la selección publicada…";
  try{
   if(!cache.has(key)){const [catalog,raw]=await Promise.all([json(city.path+'events.json'),json(city.path+'places.json')]);cache.set(key,{catalog,places:Array.isArray(raw)?raw:raw.places});}
   if(token!==request)return;
   const {catalog,places}=cache.get(key),today=new Intl.DateTimeFormat('en-CA',{timeZone:city.tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),dates=Array.from({length:7},(_,i)=>new Date(Date.parse(today+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
   const active=e=>!e.cancelled&&e.status!=='cancelled'&&dates.some(d=>e.date<=d&&(e.endDate||e.date)>=d&&!(e.closedWeekdays||[]).includes(new Date(d+'T12:00:00Z').getUTCDay()));
   const week=catalog.events.filter(active),bars=places.filter(p=>p.category==='bar'||p.categories?.includes('bar')),priced=places.filter(p=>Number.isFinite(p.beerPrice?.min));
   $('#stats').innerHTML=[[week.length,"anuncios de eventos esta semana"],[week.filter(e=>['film','cinema'].includes(e.category)).length,"de los cuales son proyecciones de cine"],[places.length,"lugares permanentes en el catálogo"],[bars.length,"de los cuales son bares"],[priced.length,"lugares con un precio de cerveza publicado"]].map(([n,label])=>`<p><strong class="count">${n}</strong><br>${label}</p>`).join('');
   $('#gap').textContent=city.gap;$('#map').href=city.map;
   const q=$('#query').value.trim().toLocaleLowerCase();const rows=priorities.sources.filter(s=>s.city===key&&[s.name,s.type,s.scope,s.note].join(' ').toLocaleLowerCase().includes(q));
   $('#rows').innerHTML=rows.map(s=>{const all=catalog.events.filter(e=>s.matchVenue?String(e.venue||'').toLowerCase().includes(String(s.matchVenue).toLowerCase()):matches(e.sourceUrl,s.match)),current=all.filter(active),ps=places.filter(p=>links(p).some(u=>matches(u,s.match)));return `<tr><td data-label="Source"><a class="title" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><p class="scope">${esc(s.type)} · ${esc(s.scope)}</p><span class="badge">${s.priority==='1'?"Máxima prioridad":"Siguiente"}</span></td><td data-label="In the published catalogue"><p><strong>${current.length}</strong> eventos esta semana</p><p>${all.length} registros guardados en total</p><p>${ps.length} lugares con enlace</p><small>${all.length||ps.length?"Hay datos parciales disponibles; no se ha confirmado que estén completos.":"No se encontraron registros directos para esta URL."}</small></td><td data-label="What was checked / coverage gaps">${esc(s.note)}</td></tr>`;}).join('');
   $('#empty').hidden=rows.length>0;$('#method').textContent=priorities.method;
   $('#status').textContent=`${rows.length} sources · week ${dates[0]} — ${dates[6]} · selection file ${(catalog.generatedAt||'').slice(0,10)} · coverage en un radio de ${catalog.endDate}${today>catalog.endDate?" · selection is outdated":''}`;
  }catch{if(token===request){$('#stats').innerHTML='';$('#rows').innerHTML='';$('#status').textContent="No se han podido cargar los datos. Actualiza la página; los valores que faltan no se muestran como cero.";}}
 }
 const initial=new URLSearchParams(location.search).get('city');if(cityInfo[initial])$('#city').value=initial;
 $('#city').onchange=()=>render();$('#query').oninput=()=>render();
 json('/en/source-priorities.json').then(d=>{priorities=d;render();}).catch(()=>{$('#status').textContent="No se han podido cargar las fuentes. Actualiza la página.";});
})();
