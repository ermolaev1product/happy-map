(() => {
 const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cityInfo={tbilisi:{path:'/',map:'/map',tz:'Asia/Tbilisi',gap:"Coverage gap: cinema screenings dominate the listings. The priority is smaller venues, book clubs, games and bar programmes."},belgrade:{path:'/belgrade/',map:'/belgrade/',tz:'Europe/Belgrade',gap:"Coverage gap: the places catalogue is dominated by bars. Priorities include cinemas, markets, vintage shops, museums and neighbourhood cultural venues outside the centre."},moscow:{path:'/moscow/',map:'/moscow/',tz:'Europe/Moscow',gap:"Coverage gap: the dedicated places catalogue is still small. Neighbourhood cultural venues, markets and museums are the priority; citywide event listings cannot replace it."}};
 let priorities,cache=new Map(),request=0;
 const normalize=u=>{try{let x=new URL(u);return x.hostname.replace(/^www\./,'')+x.pathname.replace(/^\/s\//,'/').replace(/\/$/,'').toLowerCase();}catch{return '';}};
 function matches(url,rule){if(!url)return false;if(rule==='yandex'){try{return /^([^.]+\.)?yandex\./.test(new URL(url).hostname);}catch{return false;}}const a=normalize(url),b=normalize(rule);return a===b||a.startsWith(b+'/');}
 const links=p=>[p.sourceUrl,p.website,...(p.sourceURLs||[]),p.beerPrice?.sourceUrl,p.menuReference?.url].filter(Boolean);
 async function json(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('fetch');return r.json();}
 async function render(){
  const token=++request,key=$('#city').value,city=cityInfo[key];$('#status').textContent="Loading the published selection…";
  try{
   if(!cache.has(key)){const [catalog,raw]=await Promise.all([json(city.path+'events.json'),json(city.path+'places.json')]);cache.set(key,{catalog,places:Array.isArray(raw)?raw:raw.places});}
   if(token!==request)return;
   const {catalog,places}=cache.get(key),today=new Intl.DateTimeFormat('en-CA',{timeZone:city.tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),dates=Array.from({length:7},(_,i)=>new Date(Date.parse(today+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
   const active=e=>!e.cancelled&&e.status!=='cancelled'&&dates.some(d=>e.date<=d&&(e.endDate||e.date)>=d&&!(e.closedWeekdays||[]).includes(new Date(d+'T12:00:00Z').getUTCDay()));
   const week=catalog.events.filter(active),bars=places.filter(p=>p.category==='bar'||p.categories?.includes('bar')),priced=places.filter(p=>Number.isFinite(p.beerPrice?.min));
   $('#stats').innerHTML=[[week.length,"event listings this week"],[week.filter(e=>['film','cinema'].includes(e.category)).length,"of which are cinema screenings"],[places.length,"permanent places in the catalogue"],[bars.length,"of which are bars"],[priced.length,"places with a published beer price"]].map(([n,label])=>`<p><strong class="count">${n}</strong><br>${label}</p>`).join('');
   $('#gap').textContent=city.gap;$('#map').href=city.map;
   const q=$('#query').value.trim().toLocaleLowerCase();const rows=priorities.sources.filter(s=>s.city===key&&[s.name,s.type,s.scope,s.note].join(' ').toLocaleLowerCase().includes(q));
   $('#rows').innerHTML=rows.map(s=>{const all=catalog.events.filter(e=>matches(e.sourceUrl,s.match)),current=all.filter(active),ps=places.filter(p=>links(p).some(u=>matches(u,s.match)));return `<tr><td data-label="Source"><a class="title" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><p class="scope">${esc(s.type)} · ${esc(s.scope)}</p><span class="badge">${s.priority==='1'?"Top priority":"Next"}</span></td><td data-label="In the published catalogue"><p><strong>${current.length}</strong> events this week</p><p>${all.length} saved records in total</p><p>${ps.length} places with a link</p><small>${all.length||ps.length?"Partial data is available; completeness is not confirmed.":"No direct records were found for this URL."}</small></td><td data-label="What was checked / coverage gaps">${esc(s.note)}</td></tr>`;}).join('');
   $('#empty').hidden=rows.length>0;$('#method').textContent=priorities.method;
   $('#status').textContent=`${rows.length} sources · week ${dates[0]} — ${dates[6]} · selection file ${(catalog.generatedAt||'').slice(0,10)} · coverage within ${catalog.endDate}${today>catalog.endDate?" · selection is outdated":''}`;
  }catch{if(token===request){$('#stats').innerHTML='';$('#rows').innerHTML='';$('#status').textContent="Could not load the data. Refresh the page; missing values are not shown as zero.";}}
 }
 const initial=new URLSearchParams(location.search).get('city');if(cityInfo[initial])$('#city').value=initial;
 $('#city').onchange=()=>render();$('#query').oninput=()=>render();
 json('/en/source-priorities.json').then(d=>{priorities=d;render();}).catch(()=>{$('#status').textContent="Could not load the sources. Refresh the page.";});
})();
