'use strict';
NoreliDiscovery.setTimeZone('Europe/Helsinki');
const $ = s => document.querySelector(s);
const icons = {
  spark:'<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6"/>',
  music:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
  talk:'<path d="M20 11a8 8 0 0 1-8 8H4l1.5-4A8 8 0 1 1 20 11Z"/><path d="M8 9h8M8 13h5"/>',
  film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  theatre:'<path d="M4 3l7 1v7a6 6 0 0 1-5 6 7 7 0 0 1-4-6V4Zm9 5 8-2v8a7 7 0 0 1-5 7 6 6 0 0 1-5-5"/><path d="M5 8h1M8 8h1M5 12q2 2 4 0M14 12h1M18 11h1M14 17q2-2 4-1"/>',
  games:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" stroke-width="3"/>',
  wine:'<path d="M8 3h8l1 6a5 5 0 0 1-10 0l1-6ZM12 14v7M8 21h8M7 8h10"/>',
  bookmark:'<path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4Z"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  sliders:'<path d="M4 7h4m4 0h8M4 17h8m4 0h4"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="17" r="2"/>',
  sort:'<path d="M4 5h12M4 10h8M4 15h4M17 8v12m-3-3 3 3 3-3"/>',
  focus:'<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ticket:'<path d="M3 7h18v4a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4Z"/><path d="M15 7v3m0 3v2m0 2v1"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
function hydrateIcons(){document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});}
const categories = [
  {id:'all',name:'Всё',icon:'spark'}, {id:'music',name:'Музыка',icon:'music',color:'#876ab2',bg:'#f0e8f8'},
  {id:'talk',name:'Лекции',icon:'talk',color:'#627fa8',bg:'#e9f0f8'}, {id:'film',name:'Кино',icon:'film',color:'#b29838',bg:'#f8f0d4'},
  {id:'theatre',name:'Театр',icon:'theatre',color:'#a6707c',bg:'#f4e6eb'}, {id:'games',name:'Игры',icon:'games',color:'#648d73',bg:'#e7f0e7'},
  {id:'city',name:'Город',icon:'wine',color:'#af8051',bg:'#f5edde'}
];
categories.push({id:'kids',name:'Детям',icon:'spark',color:'#96833e',bg:'#f8f0d4'},{id:'sport',name:'Спорт',icon:'spark',color:'#648d73',bg:'#e7f0e7'},{id:'workshop',name:'Практики',icon:'spark',color:'#627fa8',bg:'#e9f0f8'},{id:'other',name:'Другое',icon:'spark',color:'#777',bg:'#eee'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?esc(u.href):'';}catch{return '';}};
const dateLabel=d=>new Date(d+'T12:00:00Z').toLocaleDateString('ru',{day:'numeric',month:'long',weekday:'long',timeZone:'Europe/Helsinki'});
const languageMatches=(value,code)=>({"EN":["EN","English","английский"],"FI":["FI","Finnish","suomi","финский"],"SV":["SV","Swedish","Svenska","шведский"]}[code]||[code]).some(term=>term===code?String(value||'').toUpperCase().split(/[^A-Z]+/).includes(code):String(value||'').toLocaleLowerCase().includes(term.toLocaleLowerCase()));
const admissionText=e=>[e.admission,e.priceNote].filter(v=>typeof v==='string'&&v.trim()).filter((v,i,a)=>a.indexOf(v)===i).join(' ');
const formatVenueHours=value=>typeof value==='string'?value:value&&typeof value==='object'?Object.entries(value).map(([day,h])=>{const label={"sun":"Вс","mon":"Пн","tue":"Вт","wed":"Ср","thu":"Чт","fri":"Пт","sat":"Сб","Sunday":"Вс","Monday":"Пн","Tuesday":"Вт","Wednesday":"Ср","Thursday":"Чт","Friday":"Пт","Saturday":"Сб"}[day]||day;return h===null?label+': '+"Закрыто":Array.isArray(h)&&h.length===2&&h.every(v=>typeof v==='string')?label+': '+h.join('–'):'';}).filter(Boolean).join('; '):'';
const eventDateLabel=e=>e.dateType==='published_interval'?dateLabel(e.intervalStartDate||e.date)+' – '+dateLabel(e.endDate):dateLabel(e.date);
const intervalTimeMatches=(e,days)=>e.dateType!=='published_interval'?null:!!e.visitSchedule&&days.some(d=>{const h=e.visitSchedule[d];return h&&NoreliDiscovery.availableOnDate(e,d)&&(time==='day'?h.start<'18:00':h.end>'18:00'||h.end<h.start);});
const eventTimeLabel=e=>e.dateType==='published_interval'?(e.visitSchedule&&e.time?e.time+(e.end?'–'+e.end:'')+' · '+"часы посещения":"Часы посещения не указаны"):(e.time||"Время уточняется");
const today=()=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Helsinki',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=k=>parts.find(p=>p.type===k).value;return part('year')+'-'+part('month')+'-'+part('day');};
let events=[],catalog,dates=[],day=-1,category='all',freeOnly=false,time='all',language='all',view='explore',ascending=true,map,markers=[],position=[60.1737,24.946604],radius=0.5,limit=18,selectedId=null,planning=false;
let saved=[];try{saved=JSON.parse(localStorage.getItem('morrow-helsinki-plans-v1')||'[]');if(!Array.isArray(saved))saved=[];saved=saved.filter(e=>e&&typeof e.id==='string'&&typeof e.date==='string');}catch{saved=[];}
const nearKey='morrow-near-helsinki-v1';let positionLabel='Центр карты',distanceSort=true,originMarker,originCircle;
let places=[],savedPlaces=[],layer='events',placeCategory='all';try{savedPlaces=JSON.parse(localStorage.getItem(nearKey+'-places')||'[]');if(!Array.isArray(savedPlaces))savedPlaces=[];savedPlaces=savedPlaces.filter(p=>p&&typeof p.id==='string');}catch{}
categories.push({id:'bar',name:'Бары',icon:'wine',color:'#a5784b',bg:'#f5edde'},{id:'market',name:'Рынки и винтаж',icon:'spark',color:'#72885b',bg:'#eef3e8'},{id:'space',name:'Пространства',icon:'talk',color:'#6a83a6',bg:'#e9f0f8'});
const eventById=id=>events.find(e=>e.id===id)||places.find(e=>e.id===id)||saved.find(e=>e.id===id)||savedPlaces.find(e=>e.id===id);
const isSaved=id=>saved.some(e=>e.id===id);
const catOf=e=>categories.find(c=>c.id===e.category)||categories.at(-1);
const eventCount=n=>`${n} ${n%100>=11&&n%100<=14?'событий':n%10===1?'событие':n%10>=2&&n%10<=4?'события':'событий'}`;
const priceText=e=>e.priceLabel?esc(e.priceLabel):e.price==null?'Цена уточняется':e.price===0?'Бесплатно':`${e.min?'от ':''}${e.price} EUR`;
function distance(e){if(!position||!Number.isFinite(e.lat)||!Number.isFinite(e.lng))return Infinity;const r=Math.PI/180,a=(e.lat-position[0])*r,b=(e.lng-position[1])*r;return 6371*2*Math.asin(Math.sqrt(Math.sin(a/2)**2+Math.cos(e.lat*r)*Math.cos(position[0]*r)*Math.sin(b/2)**2));}
function poster(e){const image=safeUrl(e.imageUrl);return `<div class="poster real-poster" style="background:${catOf(e).bg};color:${catOf(e).color}">${icon(catOf(e).icon)}${image?`<img src="${image}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</div>`;}
// Show the selected visit, while keeping the stored exhibition's complete run intact.
function eventForSelectedVisit(e){
 if(!e.visitSchedule||!dates.length)return e;
 const visits=day<0?dates:[dates[day]];
 const date=visits.find(d=>e.visitSchedule[d]&&NoreliDiscovery.availableOnDate(e,d));
 const visit=e.visitSchedule[date];
 return visit?{...e,intervalStartDate:e.date,date,time:visit.start||null,end:visit.end||null}:e;
}
function visible(){if(layer==='city'){const pool=(view==='plans'?savedPlaces.map(p=>eventById(p.id)):places).filter(e=>e&&(!searchTerm||[e.title,e.address,e.description].join(' ').toLocaleLowerCase().includes(searchTerm)));return pool.filter(e=>view==='plans'||((NoreliDiscovery.hasCategory(e,placeCategory))&&(!radius||distance(e)<=radius))).sort((a,b)=>distance(a)-distance(b));}const pool=(view==='plans'?saved.map(e=>eventById(e.id)):events).filter(e=>e&&!e.cancelled&&e.status!=='cancelled'&&(!searchTerm||[e.title,e.venue,e.address,e.description].join(' ').toLocaleLowerCase().includes(searchTerm)));return pool.filter(e=>(day===-1?dates.some(d=>NoreliDiscovery.availableOnDate(e,d)):NoreliDiscovery.availableOnDate(e,dates[day]))&&(view==='plans'||((category==='all'||e.category===category)&&(!freeOnly||e.price===0)&&(time==='all'||(e.dateType==='published_interval'?intervalTimeMatches(e,day<0?dates:[dates[day]]):(e.visitSchedule?(day<0?dates:[dates[day]]).filter(d=>NoreliDiscovery.availableOnDate(e,d)).map(d=>e.visitSchedule[d]?.start):[e.time]).some(t=>t&&(time==='day'?t<'18:00':t>='18:00'))))&&(language==='all'||languageMatches(e.language,language))&&(!radius||distance(e)<=radius)))).sort((a,b)=>{if(day===-1&&a.date!==b.date)return a.date.localeCompare(b.date);if(view!=='plans'&&distanceSort){const da=distance(a),db=distance(b);if(da!==db)return da<db?-1:1;}return (view==='plans'||ascending?1:-1)*(a.time||'99').localeCompare(b.time||'99');});}
function bindCards(root){root.querySelectorAll('[data-place-save]').forEach(b=>b.onclick=()=>togglePlace(b.dataset.placeSave));root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openEvent(b.dataset.open));root.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>toggleSave(b.dataset.save));root.querySelectorAll('img').forEach(img=>img.onerror=()=>img.remove());}
function card(original){const e=eventForSelectedVisit(original);if(e.kind==='place')return placeCard(e);return `<article class="event-row"><button data-open="${esc(e.id)}" aria-label="${esc(e.title)}">${poster(e)}</button><div class="event-info"><div class="event-meta">${day===-1?esc(e.date.slice(8)+'.'+e.date.slice(5,7))+' · ':''}${esc(eventTimeLabel(e))} · ${esc(catOf(e).name)}${e.language?' · '+esc(languageLabel(e.language)):''}${e.soldOut?' · Нет билетов':''}${e.stale?' · Проверено ранее':''}</div><button class="event-title" data-open="${esc(e.id)}">${esc(e.title)}</button><span class="venue">${esc(e.venue)}${!Number.isFinite(e.lat)?' · место уточняется':''}${position&&Number.isFinite(distance(e))?` · ${distance(e)<1?Math.max(10,Math.round(distance(e)*1000/10)*10)+' м':distance(e).toFixed(1)+' км'} от точки`:''}</span><div class="event-bottom"><span class="price ${e.price===0?'free':''}">${priceText(e)}</span><span class="source-tag">${esc(e.source)}</span></div></div><button class="bookmark ${isSaved(e.id)?'saved':''}" data-save="${esc(e.id)}" aria-label="${isSaved(e.id)?'Убрать из плана':'В мой план'}: ${esc(e.title)}">${icon(isSaved(e.id)?'check':'bookmark')}</button></article>`;}
function render(){$('#mobileList').textContent=layer==='city'?'Места':'События';if(!catalog)return;
 const isPlaces=layer==='city'&&view==='plans';document.body.classList.toggle('places-view',isPlaces);document.body.classList.toggle('plan-view',view==='plans');
 $('#eventsLayer').classList.toggle('active',!isPlaces);$('#cityLayer').classList.toggle('active',isPlaces);$('#eventsLayer').setAttribute('aria-pressed',!isPlaces);$('#cityLayer').setAttribute('aria-pressed',isPlaces);
 $('.calendar-row').hidden=isPlaces;$('#calendar').innerHTML=dates.map((d,i)=>{const date=new Date(d+'T12:00:00Z'),label=date.toLocaleDateString('ru',{weekday:'short',timeZone:'UTC'});return `<button class="day ${i===day?'active':''}" data-day="${i}" aria-pressed="${i===day}"><span class="day-name">${label}</span><span class="day-num">${date.getUTCDate()}</span>${saved.some(e=>e.date===d)?'<span class="day-count">•</span>':''}</button>`;}).join('');
 document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{day=+b.dataset.day;limit=18;render();});
 const selectedCategory=isPlaces?placeCategory:category;const pool=isPlaces?places:events;
 $('#categories').innerHTML=categories.filter(c=>c.id==='all'||pool.some(e=>NoreliDiscovery.hasCategory(e,c.id))).map(c=>`<button class="category ${c.id===selectedCategory?'active':''}" data-category="${c.id}" aria-pressed="${c.id===selectedCategory}">${icon(c.icon)}${c.name}</button>`).join('');document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{if(isPlaces)placeCategory=b.dataset.category;else category=b.dataset.category;limit=18;render();});
 $('#planCount').textContent=saved.length+savedPlaces.length;$('#mobileCount').textContent=saved.length+savedPlaces.length;$('#freeFilter').hidden=isPlaces;$('#freeFilter').setAttribute('aria-pressed',freeOnly);
 $('#nearButton').setAttribute('aria-pressed',!!radius);$('#nearButton').textContent=radius?'Рядом · '+(radius<1?'500 м':radius+' км'):'Весь город';$('#nearButton').title=positionLabel;
 $('#sortButton').hidden=isPlaces;$('#sortButton').textContent=view==='plans'?'По времени':distanceSort?'Ближе':ascending?'Раньше':'Позже';$('#sortButton').setAttribute('aria-label','Сортировка: '+$('#sortButton').textContent);$('#radiusFilter').value=String(radius);
 for(const [id,on] of [['exploreTab',view==='explore'],['plansTab',view==='plans'],['mobileExplore',view==='explore'],['mobilePlans',view==='plans']])$('#'+id).classList.toggle('active',on);
 $('#filtersRow').hidden=view==='plans';$('#timeFilter').closest('label').hidden=isPlaces;$('#languageFilter').closest('label').hidden=isPlaces;if(view==='plans')$('#extraFilters').hidden=true;
 $('#mainTitle').textContent=view==='plans'?'Твои планы на неделю':'Что происходит в городе';
 const nearbyList=visible();const list=layer==='events'&&view!=='plans'&&!nearbyList.length?mapPlaces(nearbyList):nearbyList;$('#listTitle').textContent=isPlaces?(view==='plans'?'Сохранённые места':'Места, куда можно зайти'):day===-1?'Ближайшие семь дней':dateLabel(dates[day]);
 $('#resultCount').textContent=view==='plans'?`${list.length} сохранено на этом устройстве`:`${isPlaces?placeCount(list.length):eventCount(list.length)}${radius?` · ${radius<1?'500 м':radius+' км'} от точки, по прямой`:''}`;
 const emptyTitle=view==='plans'?(isPlaces?'Пока нет сохранённых мест':'На этот день ещё нет планов'):'По этому выбору ничего не нашлось';
 $('#eventList').innerHTML=list.length?list.slice(0,limit).map(card).join('')+(list.length>limit?`<button id="showMore" class="text-button">Показать ещё ${Math.min(18,list.length-limit)} из ${list.length-limit}</button>`:''):`<div class="empty"><span>✳</span><h3>${emptyTitle}</h3><p>${!isPlaces&&dates[day]>catalog.endDate?'Подборка на эту дату ещё не обновлена.':'Выбери другую категорию или расширь область поиска.'}</p><button id="emptyAction" class="text-button">${view==='plans'?'Открыть карту':radius?'Расширить поиск':'Сбросить фильтры'}</button></div>`;
 bindCards($('#eventList'));if($('#showMore'))$('#showMore').onclick=()=>{limit+=18;render();};if($('#emptyAction'))$('#emptyAction').onclick=expandSearch;
 const unknown=list.filter(e=>e.price==null).length;$('#planBudget').hidden=isPlaces||view!=='plans'||!list.length;$('#planBudget').innerHTML=`<div class="budget-label">Вход на одного<small>Без еды и дороги${unknown?` · ещё ${unknown} без цены`:''}<br>Добавление в план не бронирует место</small></div><strong class="budget-value">${budgetPrice(list)}</strong>`;
 $('#mapFeature').hidden=true;$('#mapPlanButton').hidden=isPlaces;$('#mapPlanTitle').textContent='События на неделю';$('#mapPlanSubtitle').textContent='Выбери дату и добавляй события в планы';
 const countLabel=isPlaces?placeCount(list.length):category==='film'?`${list.length} · кино`:eventCount(list.length);$('#mapLabel').textContent=(view==='plans'?'Сохранено · ':'')+countLabel+' · список →';
 const empty=$('#mapEmpty');empty.hidden=!!list.length;empty.innerHTML=`<strong>${emptyTitle}</strong><p>${isPlaces?'Это подборка мест, а не полный справочник города.':'Это подборка событий, а не вся афиша города.'}</p><button class="primary-button" id="mapEmptyAction">${view==='plans'?'Открыть карту':radius?('Показать весь город'):'Сбросить фильтры'}</button>`;if(!list.length)$('#mapEmptyAction').onclick=expandSearch;
 renderMap(nearbyList);
}
function expandSearch(){if(view==='plans'){view='explore';resetFilters();return;}if(radius){radius=0;persistNear();render();drawOrigin();}else resetFilters();}
function mapPlaces(list){
 if(!radius||view==='plans')return list;
 const savedRadius=radius;try{radius=0;return visible();}finally{radius=savedRadius;}
}
function renderMap(list){
 if(!map)return;markers.forEach(m=>m.remove());markers=[];
 const focused=new Set(list.filter(e=>!radius||distance(e)<=radius).map(e=>e.id)),context=!!radius&&view!=='plans';
 if(context){list=mapPlaces(list);$('#mapEmpty').hidden=list.length>0;
  $('#mapLabel').textContent=document.documentElement.lang==='ru'?`${list.length} на карте · ${focused.size} рядом`:`${list.length} on map · ${focused.size} nearby`;
  if(layer==='events')$('#resultCount').textContent=eventCount(list.length)+' · '+(document.documentElement.lang==='ru'?focused.size+' рядом':focused.size+' nearby');
 }
 const size=map.getSize();const points=list.filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng)).map(item=>{const p=map.latLngToContainerPoint([item.lat,item.lng]);return {x:p.x,y:p.y,item,focus:!context||focused.has(item.id)};}).filter(p=>p.x>=-60&&p.y>=-60&&p.x<=size.x+60&&p.y<=size.y+60);
 const groups=MorrowMapLayout(points,size.x,size.y,map.getZoom());
 for(const g of groups){if(g.x < -25||g.y < -25||g.x>size.x+25||g.y>size.y+25)continue;
 const e=g.items[0],c=catOf(e),count=g.items.length,title=count>1?`${layer!=='events'?placeCount(count):eventCount(count)} рядом · ${e.title}`:e.title;
 const label=g.labelSide?`<span class="compact-label ${g.labelSide}">${esc(e.title)}${count>1?' · +'+(count-1):''}</span>`:'';
 const html=`<button class="compact-pin ${context?(g.focus?'search-focus':'search-context'):''} ${count>1?'cluster':''}" style="--pin-bg:${c.bg};--pin-color:${c.color}" aria-label="${esc(title)}"><span class="compact-dot">${count>1?count:icon(c.icon)}</span>${label}</button>`;
 const marker=L.marker([e.lat,e.lng],{icon:L.divIcon({className:'pin-wrapper',html,iconSize:[44,44],iconAnchor:[22,22]}),keyboard:false}).addTo(map);
 marker.bindTooltip(esc(title)+(e.time?' · '+esc(e.time):''),{direction:'top',offset:[0,-15],className:'event-tooltip'});
 marker.on('click',()=>count===1?openEvent(e.id):showGroup(g.items));markers.push(marker);
 }
}
function fitInitialCity(){const points=[...places,...events].filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng));if(map&&points.length)map.fitBounds(points.map(e=>[e.lat,e.lng]),{paddingTopLeft:[55,85],paddingBottomRight:[55,110],maxZoom:13});}
function fitMap(){const list=mapPlaces(visible()).filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng));if(map&&list.length)map.fitBounds(list.map(e=>[e.lat,e.lng]),{paddingTopLeft:[55,85],paddingBottomRight:[55,110],maxZoom:15});}
function initMap(){if(typeof L==='undefined'){$('#mapFallback').hidden=false;return;}map=L.map('map',{scrollWheelZoom:true,minZoom:9,maxZoom:18}).setView(position,window.innerWidth<700?14:15);HappyMapBasemap.addTo(map);map.on('moveend',()=>{renderMap(visible());});new ResizeObserver(()=>{map.invalidateSize();renderMap(visible());}).observe($('#map'));$('#mapHome').onclick=fitMap;}
function showDialog(html){$('#eventDetails').innerHTML=html;bindCards($('#eventDetails'));if(!$('#eventDialog').open)$('#eventDialog').showModal();$('#eventDialog').scrollTop=0;$('#eventDetails').scrollTop=0;}
function showGroup(group){showDialog(`<div class="detail-content"><div class="eyebrow">В ЭТОЙ ЧАСТИ ГОРОДА</div><h2>${layer==='city'?placeCount(group.length):eventCount(group.length)} рядом</h2><p class="muted">${layer==='city'?'Интересные места':esc(dateLabel(group[0].date))} · увеличь карту, чтобы разделить площадки.</p>${group.map(card).join('')}</div>`);}
function openEvent(id){const original=eventById(id);if(!original)return;const e=eventForSelectedVisit(original);if(e.kind==='place'){openPlace(e);return;}selectedId=id;showDialog(`<div class="detail-hero">${poster(e)}</div><div class="detail-content"><div class="eyebrow">${esc(catOf(e).name)} · ${esc(e.date)}</div><h2>${esc(e.title)}</h2><div class="detail-facts"><div>${icon('clock')}${esc(eventDateLabel(e))}, ${esc(eventTimeLabel(e))}${e.dateType==='published_interval'?'':e.end?'–'+esc(e.end):''}</div><div>${icon('pin')}${esc(e.venue)}</div>${e.address?`<div>${esc(e.address)}</div>`:''}${e.language?`<div>${icon('talk')}${esc(languageLabel(e.language))}${e.format?' · '+esc(e.format):''}</div>`:''}<div>${icon('ticket')}${priceText(e)}${e.soldOut?' · Билеты закончились':''}</div></div>${e.timeNote?`<p class="detail-description">${esc(e.timeNote)}</p>`:''}<p class="detail-description">${e.stale?'Эту запись не удалось перепроверить при последнем обновлении. Открой источник перед посещением. ':''}${esc(e.description||'Подробности и условия участия — на странице источника.')}</p><div class="source-links">${(e.cinemaSession?[{name:'Билеты на этот сеанс',url:e.sourceUrl},...(e.sources||[])]:e.sources||[{name:e.source,url:e.sourceUrl}]).map(s=>`<a class="external-link" href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} · ${s.price==null?'подробности':priceText(s)} ↗</a>`).join('')}</div><p class="detail-disclaimer">${esc(admissionText(e)||'Условия участия уточняйте у организатора.')}</p><div class="detail-actions"><button id="detailSave" class="primary-button"></button><a class="external-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(Number.isFinite(e.lat)&&Number.isFinite(e.lng)?e.lat+','+e.lng:e.venue+', Helsinki')}" target="_blank" rel="noopener noreferrer">Место ↗</a></div><button class="detail-plan-link" id="openDayPlan">Посмотреть план на этот день →</button><p class="detail-disclaimer">${e.coordinatePrecision==='festival-area'?'Метка обозначает территорию фестиваля, а не конкретную сцену. ':''}Сохранение не является бронированием. ${e.end?'':'Время окончания не указано.'} Проверено ${esc(new Date(e.checkedAt).toLocaleString('ru',{timeZone:'Europe/Helsinki',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}))}.</p></div>`);updateDetailButton(id);$('#openDayPlan').onclick=()=>{const index=dates.indexOf(e.date);$('#eventDialog').close();setView('plans');if(index>=0){day=index;render();}};}
function updateDetailButton(id){const b=$('#detailSave');if(b){b.textContent=isSaved(id)?'✓ В твоём плане':'В мой план';b.onclick=()=>toggleSave(id);}}
function toggleSave(id){const had=isSaved(id);saved=had?saved.filter(e=>e.id!==id):[...saved,eventById(id)];try{localStorage.setItem('morrow-helsinki-plans-v1',JSON.stringify(saved));}catch{toast('Хранение отключено: план останется до закрытия вкладки.');}render();document.querySelectorAll('[data-save]').forEach(b=>{const savedNow=isSaved(b.dataset.save);b.classList.toggle('saved',savedNow);b.innerHTML=icon(savedNow?'check':'bookmark');b.setAttribute('aria-label',(savedNow?'Убрать из плана: ':'В мой план: ')+(eventById(b.dataset.save)?.title||''));b.setAttribute('aria-pressed',String(savedNow));});updateDetailButton(id);toast(had?'Убрано из плана':'Готово! Событие сохранено. Открой «Мои планы».');if(!had&&$('#journey')){$('#journey').hidden=false;$('#journey').innerHTML='✓ Событие в твоём плане. <a href="map.html?view=plans&date='+eventById(id).date+'">Посмотреть план →</a>';}}

function openPlanner(){
 if(!catalog){toast('Афиша ещё загружается. Попробуй снова.');return;}
 showDialog(`<div class="detail-content"><div class="eyebrow">ПЛАНЫ НА НЕДЕЛЮ</div><h2>Выбери день<br>на этой неделе</h2><p class="detail-description">Смотри события на ближайшие семь дней и добавляй интересное в свои планы.</p><div class="planner-days">${dates.map((d,i)=>`<button data-plan-day="${i}"><strong>${esc(dateLabel(d))}</strong><span>${eventCount(events.filter(e=>e.date===d).length)} в подборке · ${saved.filter(e=>e.date===d).length} в плане</span>${icon('arrow')}</button>`).join('')}</div></div>`);
 document.querySelectorAll('[data-plan-day]').forEach(b=>b.onclick=()=>{day=Number(b.dataset.planDay);layer='events';view='explore';planning=true;limit=18;resetFilters();$('#eventDialog').close();window.scrollTo({top:0,behavior:'smooth'});toast('Открой событие и нажми «В мой план».');});
}

function setView(v){view=v;if(v==='plans')day=-1;limit=18;render();window.scrollTo({top:0,behavior:'smooth'});}
function resetFilters(){searchTerm='';if($('#eventSearch'))$('#eventSearch').value='';placeCategory='all';category='all';freeOnly=false;time='all';language='all';$('#timeFilter').value='all';$('#languageFilter').value='all';$('#radiusFilter').value=String(radius);render();}
let toastTimer;function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function persistNear(){try{localStorage.setItem(nearKey,JSON.stringify({position,radius,label:positionLabel,radiusVersion:1}));}catch{}}
let initialCityOverview=true;
function restoreNear(){try{const n=JSON.parse(localStorage.getItem(nearKey)||'null');if(n&&Array.isArray(n.position)&&n.position.length===2&&n.position.every(Number.isFinite)&&Math.abs(n.position[0])<=90&&Math.abs(n.position[1])<=180){initialCityOverview=false;position=n.position;radius=n.radiusVersion===1&&n.radius===0?0:.5;positionLabel=n.label==='Моя геопозиция'?n.label:'Выбранная точка';}}catch{}const h=new URLSearchParams(location.hash.slice(1));const values=(h.get('near')||'').split(',').map(Number);if(values.length===2&&values.every(Number.isFinite)&&Math.abs(values[0])<=90&&Math.abs(values[1])<=180){initialCityOverview=false;position=values;radius=.5;positionLabel='Выбранная точка';persistNear();history.replaceState(null,'',location.pathname+location.search);}}
function drawOrigin(){
 if(!map)return;originMarker?.remove();originCircle?.remove();
 const origin=HappyMapSearch.origin(map,position,radius,point=>{
  position=point;positionLabel=document.documentElement.lang==='ru'?'Выбранная точка':'Selected point';
  if(!radius)radius=.5;distanceSort=true;limit=18;
  persistNear();render();
  if(!originCircle)drawOrigin();
 });
 originMarker=origin.marker;originCircle=origin.circle;
}
function choosePoint(point,label){position=point;positionLabel=label;radius=.5;distanceSort=true;view='explore';persistNear();render();drawOrigin();if(map)map.setView(position,15);toast('Круг: 500 м от центра, 1 км в диаметре.');}
function locate(){if(!navigator.geolocation){toast('Геолокация недоступна. Выбери точку на карте.');return;}navigator.geolocation.getCurrentPosition(p=>{choosePoint([p.coords.latitude,p.coords.longitude],'Моя геопозиция');},()=>{toast('Не удалось определить место. В кнопке «Рядом» можно выбрать точку на карте.');},{timeout:10000,maximumAge:300000});}
function nearOptions(){showDialog(`<div class="detail-content"><div class="eyebrow">СОБЫТИЯ ПОБЛИЗОСТИ</div><h2>Откуда ищем?</h2><p class="detail-description">${esc(positionLabel)}. Расстояния — по прямой, а не длина пешего маршрута. Точка сохраняется только на этом устройстве.</p><div class="near-options"><button class="primary-button" id="useGps">Определить, где я</button><button id="useMapCenter">От центра текущей карты</button><button id="pickOnMap">Выбрать точку на карте</button><button id="useWholeCity">Показать весь город</button></div><p class="detail-description">Круг: 500 м от центра, 1 км в диаметре.</p></div>`);$('#useGps').onclick=()=>{$('#eventDialog').close();locate();};$('#useMapCenter').onclick=()=>{$('#eventDialog').close();if(map){const c=map.getCenter();choosePoint([c.lat,c.lng],'Выбранная точка');}};$('#pickOnMap').onclick=()=>{$('#eventDialog').close();$('.map-shell').scrollIntoView({behavior:'smooth',block:'center'});if(!map)return;toast('Нажми на своё место на карте.');map.once('click',e=>choosePoint([e.latlng.lat,e.latlng.lng],'Выбранная точка'));};$('#useWholeCity').onclick=()=>{$('#eventDialog').close();radius=0;persistNear();render();drawOrigin();};}
$('#nearButton').onclick=nearOptions;$('#radiusFilter').onchange=e=>{radius=+e.target.value;persistNear();render();drawOrigin();};
$('#exploreTab').onclick=()=>setView('explore');$('#plansTab').onclick=()=>setView('plans');$('#mobileExplore').onclick=()=>setView('explore');$('#mobilePlans').onclick=()=>setView('plans');$('#mapPlanButton').onclick=openPlanner;$('#mobileList').onclick=()=>{$('.events-panel').scrollIntoView({behavior:'smooth',block:'start'});};
$('#freeFilter').onclick=()=>{freeOnly=!freeOnly;render();};$('#filtersButton').onclick=()=>{$('#extraFilters').hidden=!$('#extraFilters').hidden;$('#filtersButton').setAttribute('aria-expanded',!$('#extraFilters').hidden);};$('#timeFilter').onchange=e=>{time=e.target.value;render();};$('#languageFilter').onchange=e=>{language=e.target.value;render();};$('#resetFilters').onclick=resetFilters;$('#sortButton').onclick=()=>{if(view==='plans'){toast('План показан по времени начала.');return;}if(distanceSort){distanceSort=false;ascending=true;}else if(ascending){ascending=false;}else distanceSort=true;render();toast(distanceSort?'Сначала ближайшие к выбранной точке':ascending?'Сначала ранние события':'Сначала поздние события');};
$('#closeEvent').onclick=()=>$('#eventDialog').close();$('#closeOrganizer').onclick=()=>$('#organizerDialog').close();
$('#sourcesButton').onclick=showSources;
$('#visitorButton').textContent='Мой профиль';
$('#visitorButton').onclick=()=>($('.more-menu').open=false,showDialog('<div class="detail-content"><div class="eyebrow">ТВОЙ NORELI</div><h2>Планы начинаются<br>с одного «хочу».</h2><p class="detail-description">Сохраняй события закладкой — план уже работает в этом браузере. Вход через Google или почту пока не подключён. Сейчас план хранится только на этом устройстве; регистрации и синхронизации ещё нет.</p><button class="primary-button" id="visitorPlans">Открыть мои планы ↗</button></div>'))||($('#visitorPlans').onclick=()=>{$('#eventDialog').close();setView('plans');});
$('#organizerButton').onclick=()=>{$('.more-menu').open=false;$('#organizerForm').hidden=false;$('#organizerPreview').hidden=true;$('#organizerDialog').showModal();};$('#organizerForm').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target);$('#organizerPreview').innerHTML=`<strong>${esc(d.get('title'))}</strong><p>${esc(d.get('day'))} · ${esc(d.get('time'))}<br>${esc(d.get('venue'))}</p><p>Предпросмотр анонса. В этой версии публикация и кабинет организатора ещё не подключены.</p>`;e.target.hidden=true;$('#organizerPreview').hidden=false;};
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
document.querySelectorAll('.wordmark').forEach(a=>a.onclick=e=>{e.preventDefault();setView('explore');});document.querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{document.body.dataset.palette=b.dataset.palette;document.querySelectorAll('.swatch').forEach(s=>{s.classList.toggle('selected',s===b);s.setAttribute('aria-pressed',s===b);});});
async function start(){hydrateIcons();for(const id of ['eventsLayer','cityLayer'])$('#'+id).disabled=true;$('#mapLabel').textContent='Загружаем карту…';try{catalog=await loadCatalog();try{places=(await loadPlaces()).map(p=>({...p,kind:'place'}));}catch{}events=catalog.events.map(e=>({...e,category:({cinema:'film',concert:'music',concerts:'music',festival:'city',lecture:'talk',classical:'music',party:'music'})[e.category]||e.category}));const start=today();dates=Array.from({length:7},(_,i)=>new Date(Date.parse(start+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));$('.month-label').innerHTML=new Date(start+'T12:00:00Z').toLocaleDateString('ru',{month:'long'})+' <span>'+start.slice(0,4)+'</span><span class="week-caption">Твоя ближайшая неделя</span>';$('#sourcesButton').textContent='Хельсинки · источники и дата обновления ↗';$('#organizerDay').innerHTML=dates.map(d=>`<option>${d}</option>`).join('');const entry=new URLSearchParams(location.search);if(dates.includes(entry.get('date')))day=dates.indexOf(entry.get('date'));if(categories.some(c=>c.id===entry.get('category')))category=entry.get('category');if(entry.get('view')==='plans'){view='plans';day=dates.includes(entry.get('date'))?dates.indexOf(entry.get('date')):-1;}restoreNear();initMap();render();drawOrigin();if(entry.get('organizer')==='1')$('#organizerButton').click();}catch{$('#eventList').innerHTML='<div class="empty"><h3>Не удалось загрузить афишу</h3><p>Обнови страницу, чтобы попробовать ещё раз.</p></div>';$('#sourcesButton').textContent='Афиша недоступна';$('#sourcesButton').disabled=true;}finally{for(const id of ['eventsLayer','cityLayer'])$('#'+id).disabled=false;}}

function placeCount(n){return `${n} ${n%100>=11&&n%100<=14?'мест':n%10===1?'место':n%10>=2&&n%10<=4?'места':'мест'}`;}
function setLayer(value){
 layer=value;limit=18;
 // A venue-only category must not silently empty the Events tab.
 if(value==='events'&&category!=='all'&&!events.some(e=>e.category===category))category='all';
 render();
}
function placeCard(e){const kept=savedPlaces.some(p=>p.id===e.id);return `<article class="event-row place-row"><button data-open="${esc(e.id)}" aria-label="${esc(e.title)}">${poster(e)}</button><div class="event-info"><div class="event-meta">${esc(catOf(e).name)} · Место</div><button class="event-title" data-open="${esc(e.id)}">${esc(e.title)}</button><p class="place-summary">${esc(e.description)}</p><span class="venue">${Number.isFinite(distance(e))?(distance(e)<1?Math.round(distance(e)*1000/10)*10+' м':distance(e).toFixed(1)+' км')+' от точки':'Адрес — в карточке'}</span></div><button class="bookmark ${kept?'saved':''}" data-place-save="${esc(e.id)}" aria-label="${kept?'Убрать место':'Сохранить место'}: ${esc(e.title)}">${icon(kept?'check':'bookmark')}</button></article>`;}
function openPlace(e){showDialog(`<div class="detail-content"><div class="eyebrow">${esc(catOf(e).name)} · ИНТЕРЕСНОЕ МЕСТО</div><h2>${esc(e.title)}</h2><p class="detail-description">${e.stale?'Эту запись не удалось перепроверить при последнем обновлении. Открой источник перед посещением. ':''}${esc(e.description)}</p><div class="detail-facts"><div>${icon('pin')}${esc(e.address||e.venue||'Адрес уточняется')}</div></div><p class="detail-description">${esc(e.openingNote||'Проверь часы работы на странице площадки перед визитом.')}</p><p class="detail-disclaimer">Это место, а не событие с назначенным временем. Стоимость посещения и меню уточняй у площадки.</p><div class="source-links"><a class="external-link" href="${safeUrl(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(e.source)} ↗</a><a class="external-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(Number.isFinite(e.lat)&&Number.isFinite(e.lng)?e.lat+','+e.lng:(e.address||e.title))}" target="_blank" rel="noopener noreferrer">Показать адрес ↗</a></div><button class="primary-button" id="placeSave">${savedPlaces.some(x=>x.id===e.id)?'✓ Место сохранено':'Сохранить место'}</button><p class="detail-disclaimer">Сохранённые места доступны в «Мои планы» → «Сохранённые места». Проверено ${esc((e.checkedAt||'').slice(0,10))}.</p></div>`);$('#placeSave').onclick=()=>togglePlace(e.id);}
function togglePlace(id){const e=eventById(id);if(!e)return;const had=savedPlaces.some(p=>p.id===id);savedPlaces=had?savedPlaces.filter(p=>p.id!==id):[...savedPlaces,e];let stored=true;try{localStorage.setItem(nearKey+'-places',JSON.stringify(savedPlaces));}catch{stored=false;}render();if($('#placeSave'))$('#placeSave').textContent=had?'Сохранить место':'✓ Место сохранено';toast(stored?(had?'Место убрано':'Место сохранено в «Мои планы»'):'Хранение отключено: место сохранено до закрытия вкладки.');}
function showSources(){const sources=catalog.sourceRegistry||catalog.sources||[];showDialog(`<div class="detail-content"><div class="eyebrow">ИСТОЧНИКИ И ОБНОВЛЕНИЕ</div><h2>Откуда события<br>и места</h2><p class="detail-description">${esc(catalog.coverage)}</p><p class="detail-description">События на ${esc(catalog.startDate)} — ${esc(catalog.endDate)}. Это сохранённая подборка; автоматическое ежедневное обновление пока не включено.</p><div class="source-registry">${sources.map(s=>`<div><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><small>${s.status==='blocked'?'Автозагрузка недоступна':s.status==='reviewed'?'Проверен как дополнительный источник':s.type==='telegram'?'Публичные анонсы':'Использован в подборке'}${Number.isFinite(s.count)?' · записей: '+s.count:''}</small><p>${esc(s.publicNote||s.note||'')}</p></div>`).join('')}</div><p class="detail-disclaimer">Полнота афиши не гарантируется. Публичные Telegram-каналы перечислены отдельно; ссылка на канал не означает, что все его посты загружены. Цены, отмены и часы работы проверь у организатора перед выходом.</p></div>`);}

$('#eventsLayer').onclick=()=>setLayer('events');$('#cityLayer').onclick=()=>setLayer('city');



// Noreli 2.1: retain legacy storage keys so an APK update preserves plans.
let searchTerm='';
let catalogOrigin='bundled';
function budgetPrice(list){const known=list.filter(e=>typeof e.price==='number'),missing=known.length!==list.length;if(!known.length)return 'Уточняется';const sum=Math.round(known.reduce((s,e)=>s+e.price,0)*100)/100;if(sum===0&&!missing)return 'Бесплатно';return `${missing||known.some(e=>e.min)?'от ':''}${priceText({price:sum||0}).replace('Бесплатно',priceText({price:1}).replace('1','0'))}${missing?' + уточнения':''}`;}
const isAndroid=location.hostname==='appassets.androidplatform.net';
const cityFolder='helsinki/';
const sourcesPath='sources.html';
function validCatalog(d){return d&&/^\d{4}-\d{2}-\d{2}$/.test(d.startDate)&&/^\d{4}-\d{2}-\d{2}$/.test(d.endDate)&&Array.isArray(d.events)&&d.events.length<20000&&d.events.every(e=>e&&typeof e.id==='string'&&typeof e.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&(!e.sourceUrl||safeUrl(e.sourceUrl)));}
async function readCatalog(url){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),4500);try{const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('Unavailable');const d=await r.json();if(!validCatalog(d))throw Error('Invalid catalogue');return d;}finally{clearTimeout(timer);}}
async function loadCatalog(){
 catalogOrigin=isAndroid?'bundled':'website';
 let local=await readCatalog('events.json');
 if(!isAndroid){catalogOrigin='website';return local;}
 try{const cached=JSON.parse(localStorage.getItem(nearKey+'-catalog'));if(validCatalog(cached)&&(cached.generatedAt||'')>(local.generatedAt||'')){local=cached;catalogOrigin='cache';}}catch{}
 try{const remote=await readCatalog('/live/'+cityFolder+'events.json');if((remote.generatedAt||'')>=(local.generatedAt||'')){try{localStorage.setItem(nearKey+'-catalog',JSON.stringify(remote));}catch{}catalogOrigin='website';return remote;}}catch{}
 return local;
}
const renderOriginal=render;
render=function(){renderOriginal();if(!catalog)return;
 $('#wholeWeek').classList.toggle('active',day===-1);$('#wholeWeek').setAttribute('aria-pressed',day===-1);
 const stale=today()>catalog.endDate;
 const date=(catalog.generatedAt||'').slice(0,10).split('-').reverse().join('.');
 const label=isAndroid?(catalogOrigin==='website'?'Подборка с сайта':'Сохранённая подборка'):'Подборка событий';
 $('#catalogStatus').classList.toggle('is-old',stale);
 $('#catalogStatus').innerHTML=`<span>${stale?'Нужны свежие анонсы. ':''}${esc(label)} · ${esc(date)}<br>Покрытие до ${esc(catalog.endDate.split('-').reverse().join('.'))} · ${isAndroid?'проверяем сайт при запуске':'обновляется редакционно'}</span><button id="sourceStatus">Источники ↗</button>`;
 $('#sourceStatus').onclick=showSources;
 if(!visible().length&&view!=='plans'&&layer==='events'){
  const inDate=events.filter(e=>day===-1?dates.some(d=>NoreliDiscovery.availableOnDate(e,d)):NoreliDiscovery.availableOnDate(e,dates[day]));
  const reason=stale||day!==-1&&dates[day]>catalog.endDate?'На эту дату ещё нет обновлённой подборки. Это не значит, что в городе нет событий.':inDate.length?`В городе есть ${eventCount(inDate.length)} на выбранный период. Попробуй расширить расстояние или убрать фильтры.`:'Проверенные анонсы на эту дату пока не найдены. Посмотри всю неделю или открой источники.';
  const empty=$('#eventList .empty p');if(empty)empty.textContent=reason;
  const mapEmpty=$('#mapEmpty p');if(mapEmpty)mapEmpty.textContent=reason;
 }
};
const bindCardsOriginal=bindCards;
bindCards=function(root){bindCardsOriginal(root);root.querySelectorAll('.event-row').forEach(row=>{
 const opener=row.querySelector('[data-open]');if(!opener)return;
 row.onclick=e=>{if(!e.target.closest('button,a,input,select'))openEvent(opener.dataset.open);};
});};
showSources=function(){
 const entries=catalog.sourceRegistry||[];
 const used=entries.filter(s=>s.status==='imported');
 showDialog(`<div class="detail-content"><div class="eyebrow">Happy Map · ИСТОЧНИКИ</div><h2>Откуда события</h2><p class="detail-description">${esc(catalog.coverage)}</p><p class="detail-description">${isAndroid?'Приложение проверяет опубликованную подборку при запуске. Без сети использует сохранённую копию. ':''}Дата проверки и доступность каждого источника указаны в каталоге. Это проверенная подборка, а не полная афиша города.</p><a class="primary-button" href="${sourcesPath}">Открыть весь каталог источников →</a><h3>Использованы в этой подборке</h3><div class="source-registry">${used.map(s=>`<div><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><p>${esc(s.publicNote||s.note||'Ссылка на первоисточник есть в карточке события.')}</p></div>`).join('')}</div><p class="detail-disclaimer">Найденный канал и загруженное событие — разные вещи. В полном каталоге показаны статусы проверки. Управление входом и синхронизацией планов доступно в профиле.</p><button class="text-button" id="reloadCatalog">Проверить опубликованную подборку</button></div>`);
 $('#reloadCatalog').onclick=()=>location.reload();
};
$('#wholeWeek').onclick=()=>{day=-1;limit=18;render();};
$('#eventSearch').oninput=e=>{searchTerm=e.target.value.trim().toLocaleLowerCase();limit=18;render();};

// Noreli 2.2 — every map control has an explicit action.
function languageLabel(value){return ({"EN":"Английский","FI":"Финский","SV":"Шведский","oth":"Language not listed"})[value]||value;}
function categoryArrows(){const el=$('#categories');if(!el)return;const max=el.scrollWidth-el.clientWidth;$('#categoryPrev').disabled=el.scrollLeft<3;$('#categoryNext').disabled=el.scrollLeft>=max-3;$('.category-scroll').classList.toggle('can-scroll',max>3);}
$('#categories').addEventListener('scroll',categoryArrows,{passive:true});
$('#categoryPrev').onclick=()=>$('#categories').scrollBy({left:-Math.max(160,$('#categories').clientWidth*.75),behavior:'smooth'});
$('#categoryNext').onclick=()=>$('#categories').scrollBy({left:Math.max(160,$('#categories').clientWidth*.75),behavior:'smooth'});
new ResizeObserver(categoryArrows).observe($('#categories'));
function showResults(unknownOnly=false,shown=30){
 const all=mapPlaces(visible()),missing=all.filter(e=>!Number.isFinite(e.lat)||!Number.isFinite(e.lng));const list=unknownOnly?missing:all;
 showDialog(`<div class="detail-content results-detail"><div class="eyebrow">${layer==='city'?'МЕСТА':'СОБЫТИЯ'} · ТЕКУЩИЙ ВЫБОР</div><h2>${unknownOnly?'Без точной метки':layer==='city'?'Места списком':'События списком'}</h2><p class="detail-description">${list.length} в списке.${missing.length?` У ${missing.length} пока нет точных координат: адрес и источник доступны в карточке.`:''}</p>${missing.length?`<div class="result-tabs"><button id="resultsAll" aria-pressed="${!unknownOnly}">Все · ${all.length}</button><button id="resultsUnknown" aria-pressed="${unknownOnly}">Без метки · ${missing.length}</button></div>`:''}<div>${list.slice(0,shown).map(card).join('')||'<p>Список пуст. Измени дату или фильтры.</p>'}</div>${list.length>shown?`<button class="primary-button" id="resultsMore">Показать ещё ${Math.min(30,list.length-shown)}</button>`:''}</div>`);
 if($('#resultsAll'))$('#resultsAll').onclick=()=>showResults(false);
 if($('#resultsUnknown'))$('#resultsUnknown').onclick=()=>showResults(true);
 if($('#resultsMore'))$('#resultsMore').onclick=()=>showResults(unknownOnly,shown+30);
}
$('#mapResults').onclick=()=>showResults();
const render22=render;
render=function(){render22();requestAnimationFrame(categoryArrows);
 $('#mapResults').setAttribute('aria-label','Открыть список: '+$('#mapLabel').textContent);
 let info=$('#cinemaInfo');if(!info){info=document.createElement('div');info.id='cinemaInfo';info.className='cinema-info';$('.list-heading').after(info);}
 info.hidden=view==='plans'||layer!=='events'||category!=='film'||cityFolder!=='';
 if(!info.hidden){const date=day===-1?'':dates[day];const n=date?(catalog.cinemaCoverage?.dailyCounts?.[date]||0):null;info.innerHTML=`<strong>Кинотеатры и киноклубы</strong><p>${n===0?'На эту дату ещё нет загруженного расписания обычных киносеансов.':n===1?'На эту дату опубликована пока только часть репертуара.':'Выбирай конкретный сеанс: время, язык и билет указаны в карточке.'}</p><a href="https://kinoafisha.ge/sessions?lang=eng${date?'&date='+date.split('-').reverse().join('-'):''}" target="_blank" rel="noopener noreferrer">Полное расписание кинотеатров ↗</a>`;}
};
const oldOpenPlace22=openPlace;
openPlace=function(e){
 oldOpenPlace22(e);
 const body=$('#eventDetails .detail-content');const facts=document.createElement('div');facts.className='place-guide';
 facts.innerHTML=`${e.highlights?.length?`<h3>Что здесь есть</h3><ul>${e.highlights.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${e.bestFor?`<h3>Когда выбрать это место</h3><p>${esc(e.bestFor)}</p>`:''}${e.phone?`<a class="external-link" href="tel:${esc(e.phone.replace(/[^+\d]/g,''))}">Позвонить · ${esc(e.phone)}</a>`:''}`;
 body.querySelector('.detail-actions,.source-links').before(facts);
 const related=events.filter(x=>dates.includes(x.date)&&!x.cancelled&&(x.venueId===e.venueId&&e.venueId||x.venue?.toLowerCase().includes(e.matchVenue||e.title.toLowerCase())));
 if(related.length){const section=document.createElement('div');section.className='place-program';section.innerHTML='<h3>Ближайшие события здесь</h3>'+related.slice(0,8).map(x=>`<button data-open="${esc(x.id)}"><span>${esc(x.date.slice(8)+'.'+x.date.slice(5,7))} · ${esc(x.time||'')}</span>${esc(x.title)} →</button>`).join('');body.append(section);bindCards(section);}
};

// Startup is performed by discovery.js after all map extensions are registered.
