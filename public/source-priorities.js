(() => {
 const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cityInfo={tbilisi:{path:'/',map:'/map',tz:'Asia/Tbilisi',gap:'Пробел: киносеансы преобладают над остальными событиями. Приоритет — небольшие площадки, книжные встречи, игры и программы баров.'},belgrade:{path:'/belgrade/',map:'/belgrade/',tz:'Europe/Belgrade',gap:'Пробел: каталог постоянных мест смещён к барам. Приоритет — кино, рынки и винтаж, музеи и районные культурные площадки, в том числе вне центра.'},moscow:{path:'/moscow/',map:'/moscow/',tz:'Europe/Moscow',gap:'Пробел: самостоятельный каталог мест пока очень мал. Приоритет — районные культурные площадки, рынки и музеи; одна общегородская афиша его не заменит.'}};
 let priorities,cache=new Map(),request=0;
 const normalize=u=>{try{let x=new URL(u);return x.hostname.replace(/^www\./,'')+x.pathname.replace(/^\/s\//,'/').replace(/\/$/,'').toLowerCase();}catch{return '';}};
 function matches(url,rule){if(!url)return false;if(rule==='yandex'){try{return /^([^.]+\.)?yandex\./.test(new URL(url).hostname);}catch{return false;}}const a=normalize(url),b=normalize(rule);return a===b||a.startsWith(b+'/');}
 const links=p=>[p.sourceUrl,p.website,...(p.sourceURLs||[]),p.beerPrice?.sourceUrl,p.menuReference?.url].filter(Boolean);
 async function json(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('fetch');return r.json();}
 async function render(){
  const token=++request,key=$('#city').value,city=cityInfo[key];$('#status').textContent='Загружаем опубликованную подборку…';
  try{
   if(!cache.has(key)){const [catalog,raw]=await Promise.all([json(city.path+'events.json'),json(city.path+'places.json')]);cache.set(key,{catalog,places:Array.isArray(raw)?raw:raw.places});}
   if(token!==request)return;
   const {catalog,places}=cache.get(key),today=new Intl.DateTimeFormat('en-CA',{timeZone:city.tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),dates=Array.from({length:7},(_,i)=>new Date(Date.parse(today+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
   const active=e=>!e.cancelled&&e.status!=='cancelled'&&dates.some(d=>e.date<=d&&(e.endDate||e.date)>=d&&!(e.closedWeekdays||[]).includes(new Date(d+'T12:00:00Z').getUTCDay()));
   const week=catalog.events.filter(active),bars=places.filter(p=>p.category==='bar'||p.categories?.includes('bar')),priced=places.filter(p=>Number.isFinite(p.beerPrice?.min));
   $('#stats').innerHTML=[[week.length,'записей событий за неделю'],[week.filter(e=>['film','cinema'].includes(e.category)).length,'из них киносеансы'],[places.length,'постоянных мест в каталоге'],[bars.length,'из них бары'],[priced.length,'мест с опубликованной ценой пива']].map(([n,label])=>`<p><strong class="count">${n}</strong><br>${label}</p>`).join('');
   $('#gap').textContent=city.gap;$('#map').href=city.map;
   const q=$('#query').value.trim().toLocaleLowerCase();const rows=priorities.sources.filter(s=>s.city===key&&[s.name,s.type,s.scope,s.note].join(' ').toLocaleLowerCase().includes(q));
   $('#rows').innerHTML=rows.map(s=>{const all=catalog.events.filter(e=>matches(e.sourceUrl,s.match)),current=all.filter(active),ps=places.filter(p=>links(p).some(u=>matches(u,s.match)));return `<tr><td data-label="Источник"><a class="title" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><p class="scope">${esc(s.type)} · ${esc(s.scope)}</p><span class="badge">${s.priority==='1'?'Основной приоритет':'Следом'}</span></td><td data-label="В опубликованной базе"><p><strong>${current.length}</strong> событий за неделю</p><p>${all.length} сохранённых записей всего</p><p>${ps.length} мест со ссылкой</p><small>${all.length||ps.length?'Есть выборочные данные; полнота не подтверждена.':'Прямых записей по этому URL не найдено.'}</small></td><td data-label="Что проверено / чего не хватает">${esc(s.note)}</td></tr>`;}).join('');
   $('#empty').hidden=rows.length>0;$('#method').textContent=priorities.method;
   $('#status').textContent=`${rows.length} источников · неделя ${dates[0]} — ${dates[6]} · файл подборки ${(catalog.generatedAt||'').slice(0,10)} · покрытие до ${catalog.endDate}${today>catalog.endDate?' · подборка устарела':''}`;
  }catch{if(token===request){$('#stats').innerHTML='';$('#rows').innerHTML='';$('#status').textContent='Не удалось загрузить данные. Обнови страницу; нулевые значения не подставляем.';}}
 }
 const initial=new URLSearchParams(location.search).get('city');if(cityInfo[initial])$('#city').value=initial;
 $('#city').onchange=()=>render();$('#query').oninput=()=>render();
 json('/source-priorities.json').then(d=>{priorities=d;render();}).catch(()=>{$('#status').textContent='Не удалось загрузить список источников. Обнови страницу.';});
})();
