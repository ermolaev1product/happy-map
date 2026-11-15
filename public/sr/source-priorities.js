(() => {
 const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cityInfo={tbilisi:{path:'/sr/',map:'/sr/map',tz:'Asia/Tbilisi',gap:"Nedostatak u obuhvatu: bioskopske projekcije dominiraju objavama. Prioritet su manji prostori, čitalački klubovi, igre i programi barova."},belgrade:{path:'/sr/belgrade/',map:'/sr/belgrade/',tz:'Europe/Belgrade',gap:"Nedostatak u obuhvatu: barovi dominiraju katalogom mesta. Prioriteti uključuju bioskope, pijace, prodavnice vintidž robe, muzeje i lokalne kulturne prostore van centra."},moscow:{path:'/sr/moscow/',map:'/sr/moscow/',tz:'Europe/Moscow',gap:"Nedostatak u obuhvatu: poseban katalog mesta još je mali. Prioritet su lokalni kulturni prostori, pijace i muzeji; objave događaja za ceo grad ne mogu ga zameniti."}};
 let priorities,cache=new Map(),request=0;
 const normalize=u=>{try{let x=new URL(u);return x.hostname.replace(/^www\./,'')+x.pathname.replace(/^\/s\//,'/sr/').replace(/\/$/,'').toLowerCase();}catch{return '';}};
 function matches(url,rule){if(!url)return false;if(rule==='yandex'){try{return /^([^.]+\.)?yandex\./.test(new URL(url).hostname);}catch{return false;}}const a=normalize(url),b=normalize(rule);return a===b||a.startsWith(b+'/sr/');}
 const links=p=>[p.sourceUrl,p.website,...(p.sourceURLs||[]),p.beerPrice?.sourceUrl,p.menuReference?.url].filter(Boolean);
 async function json(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('fetch');return r.json();}
 async function render(){
  const token=++request,key=$('#city').value,city=cityInfo[key];$('#status').textContent="Učitavanje objavljenog izbora…";
  try{
   if(!cache.has(key)){const [catalog,raw]=await Promise.all([json(city.path+'events.json'),json(city.path+'places.json')]);cache.set(key,{catalog,places:Array.isArray(raw)?raw:raw.places});}
   if(token!==request)return;
   const {catalog,places}=cache.get(key),today=new Intl.DateTimeFormat('en-CA',{timeZone:city.tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),dates=Array.from({length:7},(_,i)=>new Date(Date.parse(today+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
   const active=e=>!e.cancelled&&e.status!=='cancelled'&&dates.some(d=>e.date<=d&&(e.endDate||e.date)>=d&&!(e.closedWeekdays||[]).includes(new Date(d+'T12:00:00Z').getUTCDay()));
   const week=catalog.events.filter(active),bars=places.filter(p=>p.category==='bar'||p.categories?.includes('bar')),priced=places.filter(p=>Number.isFinite(p.beerPrice?.min));
   $('#stats').innerHTML=[[week.length,"najava događaja ove nedelje"],[week.filter(e=>['film','cinema'].includes(e.category)).length,"od kojih su bioskopske projekcije"],[places.length,"stalnih mesta u katalogu"],[bars.length,"od kojih su barovi"],[priced.length,"mesta sa objavljenom cenom piva"]].map(([n,label])=>`<p><strong class="count">${n}</strong><br>${label}</p>`).join('');
   $('#gap').textContent=city.gap;$('#map').href=city.map;
   const q=$('#query').value.trim().toLocaleLowerCase();const rows=priorities.sources.filter(s=>s.city===key&&[s.name,s.type,s.scope,s.note].join(' ').toLocaleLowerCase().includes(q));
   $('#rows').innerHTML=rows.map(s=>{const all=catalog.events.filter(e=>s.matchVenue?String(e.venue||'').toLowerCase().includes(String(s.matchVenue).toLowerCase()):matches(e.sourceUrl,s.match)),current=all.filter(active),ps=places.filter(p=>links(p).some(u=>matches(u,s.match)));return `<tr><td data-label="Source"><a class="title" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><p class="scope">${esc(s.type)} · ${esc(s.scope)}</p><span class="badge">${s.priority==='1'?"Najviši prioritet":"Sledeće"}</span></td><td data-label="In the published catalogue"><p><strong>${current.length}</strong> događaja ove nedelje</p><p>${all.length} ukupno sačuvanih zapisa</p><p>${ps.length} mesta sa linkom</p><small>${all.length||ps.length?"Dostupni su delimični podaci; potpunost nije potvrđena.":"Nisu pronađeni direktni zapisi za ovaj URL."}</small></td><td data-label="What was checked / coverage gaps">${esc(s.note)}</td></tr>`;}).join('');
   $('#empty').hidden=rows.length>0;$('#method').textContent=priorities.method;
   $('#status').textContent=`${rows.length} sources · week ${dates[0]} — ${dates[6]} · selection file ${(catalog.generatedAt||'').slice(0,10)} · coverage u krugu od ${catalog.endDate}${today>catalog.endDate?" · selection is outdated":''}`;
  }catch{if(token===request){$('#stats').innerHTML='';$('#rows').innerHTML='';$('#status').textContent="Nije moguće učitati podatke. Osvežite stranicu; nedostajuće vrednosti ne prikazuju se kao nula.";}}
 }
 const initial=new URLSearchParams(location.search).get('city');if(cityInfo[initial])$('#city').value=initial;
 $('#city').onchange=()=>render();$('#query').oninput=()=>render();
 json('/en/source-priorities.json').then(d=>{priorities=d;render();}).catch(()=>{$('#status').textContent="Nije moguće učitati izvore. Osvežite stranicu.";});
})();
