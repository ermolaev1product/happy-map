'use strict';
NoreliDiscovery.setTimeZone('Europe/Vienna');
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
  {id:'all',name:'All',icon:'spark'}, {id:'music',name:'Music',icon:'music',color:'#876ab2',bg:'#f0e8f8'},
  {id:'talk',name:'Talks',icon:'talk',color:'#627fa8',bg:'#e9f0f8'}, {id:'film',name:'Cinema',icon:'film',color:'#b29838',bg:'#f8f0d4'},
  {id:'theatre',name:'Theatre',icon:'theatre',color:'#a6707c',bg:'#f4e6eb'}, {id:'games',name:'Games',icon:'games',color:'#648d73',bg:'#e7f0e7'},
  {id:'city',name:'City',icon:'wine',color:'#af8051',bg:'#f5edde'}
];
categories.push({id:'kids',name:'Family',icon:'spark',color:'#96833e',bg:'#f8f0d4'},{id:'sport',name:'Sport',icon:'spark',color:'#648d73',bg:'#e7f0e7'},{id:'workshop',name:'Workshops',icon:'spark',color:'#627fa8',bg:'#e9f0f8'},{id:'other',name:'Other',icon:'spark',color:'#777',bg:'#eee'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?esc(u.href):'';}catch{return '';}};
const dateLabel=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',weekday:'long',timeZone:'Europe/Vienna'});
const today=()=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=k=>parts.find(p=>p.type===k).value;return part('year')+'-'+part('month')+'-'+part('day');};
let events=[],catalog,dates=[],day=0,category='all',freeOnly=false,time='all',language='all',view='explore',ascending=true,map,markers=[],position=[48.20817, 16.37382],radius=.5,limit=18,selectedId=null,planning=false;
let saved=[];try{saved=JSON.parse(localStorage.getItem('morrow-vienna-plans-v1')||'[]');if(!Array.isArray(saved))saved=[];saved=saved.filter(e=>e&&typeof e.id==='string'&&typeof e.date==='string');}catch{saved=[];}
const nearKey='morrow-near-vienna-v1';let positionLabel='Map centre',distanceSort=true,originMarker,originCircle;
let places=[],savedPlaces=[],layer='events',placeCategory='all';try{savedPlaces=JSON.parse(localStorage.getItem(nearKey+'-places')||'[]');if(!Array.isArray(savedPlaces))savedPlaces=[];savedPlaces=savedPlaces.filter(p=>p&&typeof p.id==='string');}catch{}
categories.push({id:'bar',name:'Bars',icon:'wine',color:'#a5784b',bg:'#f5edde'},{id:'market',name:'Markets & vintage',icon:'spark',color:'#72885b',bg:'#eef3e8'},{id:'space',name:'Spaces',icon:'talk',color:'#6a83a6',bg:'#e9f0f8'});
const eventById=id=>events.find(e=>e.id===id)||places.find(e=>e.id===id)||saved.find(e=>e.id===id)||savedPlaces.find(e=>e.id===id);
const isSaved=id=>saved.some(e=>e.id===id);
const catOf=e=>categories.find(c=>c.id===e.category)||categories.at(-1);
const eventCount=n=>`${n} ${n%100>=11&&n%100<=14?'events':n%10===1?'event':n%10>=2&&n%10<=4?'events':'events'}`;
const priceText=e=>e.priceLabel?esc(e.priceLabel):e.price==null?'Price not listed':e.price===0?'Free':`${e.min?'from ':''}${e.price} EUR`;
function distance(e){if(!position||!Number.isFinite(e.lat)||!Number.isFinite(e.lng))return Infinity;const r=Math.PI/180,a=(e.lat-position[0])*r,b=(e.lng-position[1])*r;return 6371*2*Math.asin(Math.sqrt(Math.sin(a/2)**2+Math.cos(e.lat*r)*Math.cos(position[0]*r)*Math.sin(b/2)**2));}
function poster(e){const image=safeUrl(e.imageUrl);return `<div class="poster real-poster" style="background:${catOf(e).bg};color:${catOf(e).color}">${icon(catOf(e).icon)}${image?`<img src="${image}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</div>`;}
// Show the selected visit, while keeping the stored exhibition's complete run intact.
function eventForSelectedVisit(e){
 if(!e.visitSchedule||!dates.length)return e;
 const visits=day<0?dates:[dates[day]];
 const date=visits.find(d=>e.visitSchedule[d]&&NoreliDiscovery.availableOnDate(e,d));
 const visit=e.visitSchedule[date];
 return visit?{...e,date,time:visit.start||null,end:visit.end||null}:e;
}
function visible(){if(layer==='city'){const pool=(view==='plans'?savedPlaces.map(p=>eventById(p.id)):places).filter(e=>e&&(!searchTerm||[e.title,e.address,e.description].join(' ').toLocaleLowerCase().includes(searchTerm)));return pool.filter(e=>view==='plans'||((NoreliDiscovery.hasCategory(e,placeCategory))&&(!radius||distance(e)<=radius))).sort((a,b)=>distance(a)-distance(b));}const pool=(view==='plans'?saved.map(e=>eventById(e.id)):events).filter(e=>e&&!e.cancelled&&e.status!=='cancelled'&&(!searchTerm||[e.title,e.venue,e.address,e.description].join(' ').toLocaleLowerCase().includes(searchTerm)));return pool.filter(e=>(day===-1?dates.some(d=>NoreliDiscovery.availableOnDate(e,d)):NoreliDiscovery.availableOnDate(e,dates[day]))&&(view==='plans'||((category==='all'||e.category===category)&&(!freeOnly||e.price===0)&&(time==='all'||(e.visitSchedule?(day<0?dates:[dates[day]]).filter(d=>NoreliDiscovery.availableOnDate(e,d)).map(d=>e.visitSchedule[d]?.start):[e.time]).some(t=>t&&(time==='day'?t<'18:00':t>='18:00')))&&(language==='all'||(e.language||'').includes(language))&&(!radius||distance(e)<=radius)))).sort((a,b)=>{if(day===-1&&a.date!==b.date)return a.date.localeCompare(b.date);if(view!=='plans'&&distanceSort){const da=distance(a),db=distance(b);if(da!==db)return da<db?-1:1;}return (view==='plans'||ascending?1:-1)*(a.time||'99').localeCompare(b.time||'99');});}
function bindCards(root){root.querySelectorAll('[data-place-save]').forEach(b=>b.onclick=()=>togglePlace(b.dataset.placeSave));root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openEvent(b.dataset.open));root.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>toggleSave(b.dataset.save));root.querySelectorAll('img').forEach(img=>img.onerror=()=>img.remove());}
function card(original){const e=eventForSelectedVisit(original);if(e.kind==='place')return placeCard(e);return `<article class="event-row"><button data-open="${esc(e.id)}" aria-label="${esc(e.title)}">${poster(e)}</button><div class="event-info"><div class="event-meta">${day===-1?esc(e.date.slice(8)+'.'+e.date.slice(5,7))+' · ':''}${esc(e.time||'Time not listed')} · ${esc(catOf(e).name)}${e.language?' · '+esc(languageLabel(e.language)):''}${e.soldOut?' · Sold out':''}${e.stale?' · Previously checked':''}</div><button class="event-title" data-open="${esc(e.id)}">${esc(e.title)}</button><span class="venue">${esc(e.venue)}${!Number.isFinite(e.lat)?' · location not confirmed':''}${position&&Number.isFinite(distance(e))?` · ${distance(e)<1?Math.max(10,Math.round(distance(e)*1000/10)*10)+' m':distance(e).toFixed(1)+' km'} from your point`:''}</span><div class="event-bottom"><span class="price ${e.price===0?'free':''}">${priceText(e)}</span><span class="source-tag">${esc(e.source)}</span></div></div><button class="bookmark ${isSaved(e.id)?'saved':''}" data-save="${esc(e.id)}" aria-label="${isSaved(e.id)?'Remove from plan':'Add to my plan'}: ${esc(e.title)}">${icon(isSaved(e.id)?'check':'bookmark')}</button></article>`;}
function render(){$('#mobileList').textContent=layer==='city'?'Places':'Events';if(!catalog)return;
 const isPlaces=layer==='city'&&view==='plans';document.body.classList.toggle('places-view',isPlaces);document.body.classList.toggle('plan-view',view==='plans');
 $('#eventsLayer').classList.toggle('active',!isPlaces);$('#cityLayer').classList.toggle('active',isPlaces);$('#eventsLayer').setAttribute('aria-pressed',!isPlaces);$('#cityLayer').setAttribute('aria-pressed',isPlaces);
 $('.calendar-row').hidden=isPlaces;$('#calendar').innerHTML=dates.map((d,i)=>{const date=new Date(d+'T12:00:00Z'),label=date.toLocaleDateString('en-GB',{weekday:'short',timeZone:'UTC'});return `<button class="day ${i===day?'active':''}" data-day="${i}" aria-pressed="${i===day}"><span class="day-name">${label}</span><span class="day-num">${date.getUTCDate()}</span>${saved.some(e=>e.date===d)?'<span class="day-count">•</span>':''}</button>`;}).join('');
 document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{day=+b.dataset.day;limit=18;render();});
 const selectedCategory=isPlaces?placeCategory:category;const pool=isPlaces?places:events;
 $('#categories').innerHTML=categories.filter(c=>c.id==='all'||pool.some(e=>NoreliDiscovery.hasCategory(e,c.id))).map(c=>`<button class="category ${c.id===selectedCategory?'active':''}" data-category="${c.id}" aria-pressed="${c.id===selectedCategory}">${icon(c.icon)}${c.name}</button>`).join('');document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{if(isPlaces)placeCategory=b.dataset.category;else category=b.dataset.category;limit=18;render();});
 $('#planCount').textContent=saved.length+savedPlaces.length;$('#mobileCount').textContent=saved.length+savedPlaces.length;$('#freeFilter').hidden=isPlaces;$('#freeFilter').setAttribute('aria-pressed',freeOnly);
 $('#nearButton').setAttribute('aria-pressed',!!radius);$('#nearButton').textContent=radius?'Nearby · '+(radius<1?'500 m':radius+' km'):'Whole city';$('#nearButton').title=positionLabel;
 $('#sortButton').hidden=isPlaces;$('#sortButton').textContent=view==='plans'?'By time':distanceSort?'Closer':ascending?'Earlier':'Later';$('#sortButton').setAttribute('aria-label','Sort: '+$('#sortButton').textContent);$('#radiusFilter').value=String(radius);
 for(const [id,on] of [['exploreTab',view==='explore'],['plansTab',view==='plans'],['mobileExplore',view==='explore'],['mobilePlans',view==='plans']])$('#'+id).classList.toggle('active',on);
 $('#filtersRow').hidden=view==='plans';$('#timeFilter').closest('label').hidden=isPlaces;$('#languageFilter').closest('label').hidden=isPlaces;if(view==='plans')$('#extraFilters').hidden=true;
 $('#mainTitle').textContent=view==='plans'?'Your weekly plan':'What’s happening in the city';
 const nearbyList=visible();const list=layer==='events'&&view!=='plans'&&!nearbyList.length?mapPlaces(nearbyList):nearbyList;$('#listTitle').textContent=isPlaces?(view==='plans'?'Saved places':'Places to visit'):day===-1?'The next seven days':dateLabel(dates[day]);
 $('#resultCount').textContent=view==='plans'?`${list.length} saved on this device`:`${isPlaces?placeCount(list.length):eventCount(list.length)}${radius?` · ${radius<1?'500 m':radius+' km'} from your point, straight-line`:''}`;
 const emptyTitle=view==='plans'?(isPlaces?'No saved places yet':'No plans for this day yet'):'No matches for these filters';
 $('#eventList').innerHTML=list.length?list.slice(0,limit).map(card).join('')+(list.length>limit?`<button id="showMore" class="text-button">Show more ${Math.min(18,list.length-limit)} of ${list.length-limit}</button>`:''):`<div class="empty"><span>✳</span><h3>${emptyTitle}</h3><p>${!isPlaces&&dates[day]>catalog.endDate?'Listings for this date have not been updated yet.':'Try another category or a wider area.'}</p><button id="emptyAction" class="text-button">${view==='plans'?'Open map':radius?'Expand search':'Reset filters'}</button></div>`;
 bindCards($('#eventList'));if($('#showMore'))$('#showMore').onclick=()=>{limit+=18;render();};if($('#emptyAction'))$('#emptyAction').onclick=expandSearch;
 const unknown=list.filter(e=>e.price==null).length;$('#planBudget').hidden=isPlaces||view!=='plans'||!list.length;$('#planBudget').innerHTML=`<div class="budget-label">Entry per person<small>Excludes food and travel${unknown?` · more ${unknown} price unknown`:''}<br>Adding to your plan does not reserve a place</small></div><strong class="budget-value">${budgetPrice(list)}</strong>`;
 $('#mapFeature').hidden=true;$('#mapPlanButton').hidden=isPlaces;$('#mapPlanTitle').textContent='This week’s events';$('#mapPlanSubtitle').textContent='Choose a date and save events to your plan';
 const countLabel=isPlaces?placeCount(list.length):category==='film'?`${list.length} · cinema`:eventCount(list.length);$('#mapLabel').textContent=(view==='plans'?'Saved · ':'')+countLabel+' · list →';
 const empty=$('#mapEmpty');empty.hidden=!!list.length;empty.innerHTML=`<strong>${emptyTitle}</strong><p>${isPlaces?'A selection of places, not a complete city directory.':'A selection of events, not a complete city listing.'}</p><button class="primary-button" id="mapEmptyAction">${view==='plans'?'Open map':radius?('Show whole city'):'Reset filters'}</button>`;if(!list.length)$('#mapEmptyAction').onclick=expandSearch;
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
  $('#mapLabel').textContent=document.documentElement.lang==='ru'?`${list.length} on map · ${focused.size} nearby`:`${list.length} on map · ${focused.size} nearby`;
  if(layer==='events')$('#resultCount').textContent=eventCount(list.length)+' · '+(document.documentElement.lang==='ru'?focused.size+' nearby':focused.size+' nearby');
 }
 const size=map.getSize();const points=list.filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng)).map(item=>{const p=map.latLngToContainerPoint([item.lat,item.lng]);return {x:p.x,y:p.y,item,focus:!context||focused.has(item.id)};}).filter(p=>p.x>=-60&&p.y>=-60&&p.x<=size.x+60&&p.y<=size.y+60);
 const groups=MorrowMapLayout(points,size.x,size.y,map.getZoom());
 for(const g of groups){if(g.x < -25||g.y < -25||g.x>size.x+25||g.y>size.y+25)continue;
 const e=g.items[0],c=catOf(e),count=g.items.length,title=count>1?`${layer!=='events'?placeCount(count):eventCount(count)} nearby · ${e.title}`:e.title;
 const label=g.labelSide?`<span class="compact-label ${g.labelSide}">${esc(e.title)}${count>1?' · +'+(count-1):''}</span>`:'';
 const html=`<button class="compact-pin ${context?(g.focus?'search-focus':'search-context'):''} ${count>1?'cluster':''}" style="--pin-bg:${c.bg};--pin-color:${c.color}" aria-label="${esc(title)}"><span class="compact-dot">${count>1?count:icon(c.icon)}</span>${label}</button>`;
 const marker=L.marker([e.lat,e.lng],{icon:L.divIcon({className:'pin-wrapper',html,iconSize:[44,44],iconAnchor:[22,22]}),keyboard:false}).addTo(map);
 marker.bindTooltip(esc(title)+(e.time?' · '+esc(e.time):''),{direction:'top',offset:[0,-15],className:'event-tooltip'});
 marker.on('click',()=>count===1?openEvent(e.id):showGroup(g.items));markers.push(marker);
 }
}
function fitMap(){const list=mapPlaces(visible()).filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng));if(map&&list.length)map.fitBounds(list.map(e=>[e.lat,e.lng]),{paddingTopLeft:[55,85],paddingBottomRight:[55,110],maxZoom:15});}
function initMap(){if(typeof L==='undefined'){$('#mapFallback').hidden=false;return;}map=L.map('map',{scrollWheelZoom:true,minZoom:9,maxZoom:18}).setView(position,window.innerWidth<700?14:15);HappyMapBasemap.addTo(map);map.on('moveend',()=>{renderMap(visible());});new ResizeObserver(()=>{map.invalidateSize();renderMap(visible());}).observe($('#map'));$('#mapHome').onclick=fitMap;}
function showDialog(html){$('#eventDetails').innerHTML=html;bindCards($('#eventDetails'));if(!$('#eventDialog').open)$('#eventDialog').showModal();$('#eventDialog').scrollTop=0;$('#eventDetails').scrollTop=0;}
function showGroup(group){showDialog(`<div class="detail-content"><div class="eyebrow">IN THIS AREA</div><h2>${layer==='city'?placeCount(group.length):eventCount(group.length)} nearby</h2><p class="muted">${layer==='city'?'Places to explore':esc(dateLabel(group[0].date))} · zoom in to separate venues.</p>${group.map(card).join('')}</div>`);}
function openEvent(id){const original=eventById(id);if(!original)return;const e=eventForSelectedVisit(original);if(e.kind==='place'){openPlace(e);return;}selectedId=id;showDialog(`<div class="detail-hero">${poster(e)}</div><div class="detail-content"><div class="eyebrow">${esc(catOf(e).name)} · ${esc(e.date)}</div><h2>${esc(e.title)}</h2><div class="detail-facts"><div>${icon('clock')}${esc(dateLabel(e.date))}, ${esc(e.time||'time not listed')}${e.end?'–'+esc(e.end):''}</div><div>${icon('pin')}${esc(e.venue)}</div>${e.address?`<div>${esc(e.address)}</div>`:''}${e.language?`<div>${icon('talk')}${esc(languageLabel(e.language))}${e.format?' · '+esc(e.format):''}</div>`:''}<div>${icon('ticket')}${priceText(e)}${e.soldOut?' · Sold out':''}</div></div>${e.timeNote?`<p class="detail-description">${esc(e.timeNote)}</p>`:''}<p class="detail-description">${e.stale?'This listing could not be rechecked during the latest update. Visit the source before going. ':''}${esc(e.description||'See the source for details and entry conditions.')}</p><div class="source-links">${(e.cinemaSession?[{name:'Tickets for this screening',url:e.sourceUrl},...(e.sources||[])]:e.sources||[{name:e.source,url:e.sourceUrl}]).map(s=>`<a class="external-link" href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} · ${s.price==null?'details':priceText(s)} ↗</a>`).join('')}</div><p class="detail-disclaimer">${esc(e.priceNote||'Contact the organiser for entry conditions.')}</p><div class="detail-actions"><button id="detailSave" class="primary-button"></button><a class="external-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(Number.isFinite(e.lat)&&Number.isFinite(e.lng)?e.lat+','+e.lng:e.venue+', Vienna')}" target="_blank" rel="noopener noreferrer">View location ↗</a></div><button class="detail-plan-link" id="openDayPlan">View this day’s plan →</button><p class="detail-disclaimer">${e.coordinatePrecision==='festival-area'?'The marker shows the festival grounds, not a specific stage. ':''}Saving does not make a booking. ${e.end?'':'End time not listed.'} Checked ${esc(new Date(e.checkedAt).toLocaleString('en-GB',{timeZone:'Europe/Vienna',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}))}.</p></div>`);updateDetailButton(id);$('#openDayPlan').onclick=()=>{const index=dates.indexOf(e.date);$('#eventDialog').close();setView('plans');if(index>=0){day=index;render();}};}
function updateDetailButton(id){const b=$('#detailSave');if(b){b.textContent=isSaved(id)?'✓ In your plan':'Add to my plan';b.onclick=()=>toggleSave(id);}}
function toggleSave(id){const had=isSaved(id);saved=had?saved.filter(e=>e.id!==id):[...saved,eventById(id)];try{localStorage.setItem('morrow-vienna-plans-v1',JSON.stringify(saved));}catch{toast('Storage is disabled: your plan will last until this tab closes.');}render();document.querySelectorAll('[data-save]').forEach(b=>{const savedNow=isSaved(b.dataset.save);b.classList.toggle('saved',savedNow);b.innerHTML=icon(savedNow?'check':'bookmark');b.setAttribute('aria-label',(savedNow?'Remove from plan: ':'Add to my plan: ')+(eventById(b.dataset.save)?.title||''));b.setAttribute('aria-pressed',String(savedNow));});updateDetailButton(id);toast(had?'Removed from plan':'Event saved! Open “My plans”.');if(!had&&$('#journey')){$('#journey').hidden=false;$('#journey').innerHTML='✓ Event is in your plan. <a href="map.html?view=plans&date='+eventById(id).date+'">View plan →</a>';}}

function openPlanner(){
 if(!catalog){toast('Listings are still loading. Try again.');return;}
 showDialog(`<div class="detail-content"><div class="eyebrow">WEEKLY PLANS</div><h2>Choose a day<br>this week</h2><p class="detail-description">Explore the next seven days and save events to your plan.</p><div class="planner-days">${dates.map((d,i)=>`<button data-plan-day="${i}"><strong>${esc(dateLabel(d))}</strong><span>${eventCount(events.filter(e=>e.date===d).length)} in listings · ${saved.filter(e=>e.date===d).length} in your plan</span>${icon('arrow')}</button>`).join('')}</div></div>`);
 document.querySelectorAll('[data-plan-day]').forEach(b=>b.onclick=()=>{day=Number(b.dataset.planDay);layer='events';view='explore';planning=true;limit=18;resetFilters();$('#eventDialog').close();window.scrollTo({top:0,behavior:'smooth'});toast('Open an event and tap “Add to my plan”.');});
}

function setView(v){view=v;if(v==='plans')day=-1;limit=18;render();window.scrollTo({top:0,behavior:'smooth'});}
function resetFilters(){searchTerm='';if($('#eventSearch'))$('#eventSearch').value='';placeCategory='all';category='all';freeOnly=false;time='all';language='all';$('#timeFilter').value='all';$('#languageFilter').value='all';$('#radiusFilter').value=String(radius);render();}
let toastTimer;function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function persistNear(){try{localStorage.setItem(nearKey,JSON.stringify({position,radius,label:positionLabel,radiusVersion:1}));}catch{}}
function restoreNear(){try{const n=JSON.parse(localStorage.getItem(nearKey)||'null');if(n&&Array.isArray(n.position)&&n.position.length===2&&n.position.every(Number.isFinite)&&Math.abs(n.position[0])<=90&&Math.abs(n.position[1])<=180){position=n.position;radius=n.radiusVersion===1&&n.radius===0?0:.5;positionLabel=n.label==='My location'?n.label:'Selected point';}}catch{}const h=new URLSearchParams(location.hash.slice(1));const values=(h.get('near')||'').split(',').map(Number);if(values.length===2&&values.every(Number.isFinite)&&Math.abs(values[0])<=90&&Math.abs(values[1])<=180){position=values;radius=.5;positionLabel='Selected point';persistNear();history.replaceState(null,'',location.pathname+location.search);}}
function drawOrigin(){
 if(!map)return;originMarker?.remove();originCircle?.remove();
 const origin=HappyMapSearch.origin(map,position,radius,point=>{
  position=point;positionLabel=document.documentElement.lang==='ru'?'Selected point':'Selected point';
  if(!radius)radius=.5;distanceSort=true;limit=18;
  persistNear();render();
  if(!originCircle)drawOrigin();
 });
 originMarker=origin.marker;originCircle=origin.circle;
}
function choosePoint(point,label){position=point;positionLabel=label;radius=.5;distanceSort=true;view='explore';persistNear();render();drawOrigin();if(map)map.setView(position,15);toast("Search circle: 500 m from the centre, 1 km across.");}
function locate(){if(!navigator.geolocation){toast('Location is unavailable. Select a point on the map.');return;}navigator.geolocation.getCurrentPosition(p=>{choosePoint([p.coords.latitude,p.coords.longitude],'My location');},()=>{toast('Could not find your location. Use Nearby to select a point on the map.');},{timeout:10000,maximumAge:300000});}
function nearOptions(){showDialog(`<div class="detail-content"><div class="eyebrow">NEARBY EVENTS</div><h2>Where should we search?</h2><p class="detail-description">${esc(positionLabel)}. Distances are straight-line estimates, not walking routes. The point is saved only on this device.</p><div class="near-options"><button class="primary-button" id="useGps">Find my location</button><button id="useMapCenter">Use current map centre</button><button id="pickOnMap">Choose a point on the map</button><button id="useWholeCity">Show whole city</button></div><p class="detail-description">Search circle: 500 m from the centre, 1 km across.</p></div>`);$('#useGps').onclick=()=>{$('#eventDialog').close();locate();};$('#useMapCenter').onclick=()=>{$('#eventDialog').close();if(map){const c=map.getCenter();choosePoint([c.lat,c.lng],'Selected point');}};$('#pickOnMap').onclick=()=>{$('#eventDialog').close();$('.map-shell').scrollIntoView({behavior:'smooth',block:'center'});if(!map)return;toast('Tap your location on the map.');map.once('click',e=>choosePoint([e.latlng.lat,e.latlng.lng],'Selected point'));};$('#useWholeCity').onclick=()=>{$('#eventDialog').close();radius=0;persistNear();render();drawOrigin();};}
$('#nearButton').onclick=nearOptions;$('#radiusFilter').onchange=e=>{radius=+e.target.value;persistNear();render();drawOrigin();};
$('#exploreTab').onclick=()=>setView('explore');$('#plansTab').onclick=()=>setView('plans');$('#mobileExplore').onclick=()=>setView('explore');$('#mobilePlans').onclick=()=>setView('plans');$('#mapPlanButton').onclick=openPlanner;$('#mobileList').onclick=()=>{$('.events-panel').scrollIntoView({behavior:'smooth',block:'start'});};
$('#freeFilter').onclick=()=>{freeOnly=!freeOnly;render();};$('#filtersButton').onclick=()=>{$('#extraFilters').hidden=!$('#extraFilters').hidden;$('#filtersButton').setAttribute('aria-expanded',!$('#extraFilters').hidden);};$('#timeFilter').onchange=e=>{time=e.target.value;render();};$('#languageFilter').onchange=e=>{language=e.target.value;render();};$('#resetFilters').onclick=resetFilters;$('#sortButton').onclick=()=>{if(view==='plans'){toast('Plan sorted by start time.');return;}if(distanceSort){distanceSort=false;ascending=true;}else if(ascending){ascending=false;}else distanceSort=true;render();toast(distanceSort?'Nearest to the selected point first':ascending?'Earlier events first':'Later events first');};
$('#closeEvent').onclick=()=>$('#eventDialog').close();$('#closeOrganizer').onclick=()=>$('#organizerDialog').close();
$('#sourcesButton').onclick=showSources;
$('#visitorButton').textContent='My profile';
$('#visitorButton').onclick=()=>($('.more-menu').open=false,showDialog('<div class="detail-content"><div class="eyebrow">YOUR HAPPY MAP</div><h2>Plans start<br>with one “I want to”.</h2><p class="detail-description">Bookmark events to plan in this browser. Google and email sign-in are not connected yet. Plans are stored on this device only, without account synchronisation.</p><button class="primary-button" id="visitorPlans">Open my plans ↗</button></div>'))||($('#visitorPlans').onclick=()=>{$('#eventDialog').close();setView('plans');});
$('#organizerButton').onclick=()=>{$('.more-menu').open=false;$('#organizerForm').hidden=false;$('#organizerPreview').hidden=true;$('#organizerDialog').showModal();};$('#organizerForm').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target);$('#organizerPreview').innerHTML=`<strong>${esc(d.get('title'))}</strong><p>${esc(d.get('day'))} · ${esc(d.get('time'))}<br>${esc(d.get('venue'))}</p><p>Event preview. Publishing and organiser accounts are not connected in this version.</p>`;e.target.hidden=true;$('#organizerPreview').hidden=false;};
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
document.querySelectorAll('.wordmark').forEach(a=>a.onclick=e=>{e.preventDefault();setView('explore');});document.querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{document.body.dataset.palette=b.dataset.palette;document.querySelectorAll('.swatch').forEach(s=>{s.classList.toggle('selected',s===b);s.setAttribute('aria-pressed',s===b);});});
async function start(){hydrateIcons();for(const id of ['eventsLayer','cityLayer'])$('#'+id).disabled=true;$('#mapLabel').textContent="Loading the map…";try{catalog=await loadCatalog();try{places=(await loadPlaces()).map(p=>({...p,kind:'place'}));}catch{}events=catalog.events.map(e=>({...e,category:({cinema:'film',concert:'music',concerts:'music',festival:'city',lecture:'talk',classical:'music',party:'music'})[e.category]||e.category}));const start=today();dates=Array.from({length:7},(_,i)=>new Date(Date.parse(start+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));$('.month-label').innerHTML=new Date(start+'T12:00:00Z').toLocaleDateString('en-GB',{month:'long'})+' <span>'+start.slice(0,4)+'</span><span class="week-caption">Your week ahead</span>';$('#sourcesButton').textContent="Vienna · sources and last update ↗";$('#organizerDay').innerHTML=dates.map(d=>`<option>${d}</option>`).join('');const entry=new URLSearchParams(location.search);if(dates.includes(entry.get('date')))day=dates.indexOf(entry.get('date'));if(categories.some(c=>c.id===entry.get('category')))category=entry.get('category');if(entry.get('view')==='plans'){view='plans';day=dates.includes(entry.get('date'))?dates.indexOf(entry.get('date')):-1;}restoreNear();initMap();render();drawOrigin();if(entry.get('organizer')==='1')$('#organizerButton').click();}catch{$('#eventList').innerHTML='<div class="empty"><h3>Could not load events</h3><p>Refresh the page to try again.</p></div>';$('#sourcesButton').textContent='Listings unavailable';$('#sourcesButton').disabled=true;}finally{for(const id of ['eventsLayer','cityLayer'])$('#'+id).disabled=false;}}

function placeCount(n){return `${n} ${n%100>=11&&n%100<=14?'places':n%10===1?'place':n%10>=2&&n%10<=4?'places':'places'}`;}
function setLayer(value){
 layer=value;limit=18;
 // A venue-only category must not silently empty the Events tab.
 if(value==='events'&&category!=='all'&&!events.some(e=>e.category===category))category='all';
 render();
}
function placeCard(e){const kept=savedPlaces.some(p=>p.id===e.id);return `<article class="event-row place-row"><button data-open="${esc(e.id)}" aria-label="${esc(e.title)}">${poster(e)}</button><div class="event-info"><div class="event-meta">${esc(catOf(e).name)} · Place</div><button class="event-title" data-open="${esc(e.id)}">${esc(e.title)}</button><p class="place-summary">${esc(e.description)}</p><span class="venue">${Number.isFinite(distance(e))?(distance(e)<1?Math.round(distance(e)*1000/10)*10+' m':distance(e).toFixed(1)+' km')+' from your point':'See card for address'}</span></div><button class="bookmark ${kept?'saved':''}" data-place-save="${esc(e.id)}" aria-label="${kept?'Remove place':'Save place'}: ${esc(e.title)}">${icon(kept?'check':'bookmark')}</button></article>`;}
function openPlace(e){showDialog(`<div class="detail-content"><div class="eyebrow">${esc(catOf(e).name)} · PLACE TO EXPLORE</div><h2>${esc(e.title)}</h2><p class="detail-description">${e.stale?'This listing could not be rechecked during the latest update. Visit the source before going. ':''}${esc(e.description)}</p><div class="detail-facts"><div>${icon('pin')}${esc(e.address||e.venue||'Address not listed')}</div></div><p class="detail-description">${esc(e.openingNote||'Check the venue’s opening hours before visiting.')}</p><p class="detail-disclaimer">This is a place, not a scheduled event. Check prices and menus with the venue.</p><div class="source-links"><a class="external-link" href="${safeUrl(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(e.source)} ↗</a><a class="external-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(Number.isFinite(e.lat)&&Number.isFinite(e.lng)?e.lat+','+e.lng:(e.address||e.title))}" target="_blank" rel="noopener noreferrer">Show address ↗</a></div><button class="primary-button" id="placeSave">${savedPlaces.some(x=>x.id===e.id)?'✓ Place saved':'Save place'}</button><p class="detail-disclaimer">Saved places are available in “My plans» → «Saved places». Checked ${esc((e.checkedAt||'').slice(0,10))}.</p></div>`);$('#placeSave').onclick=()=>togglePlace(e.id);}
function togglePlace(id){const e=eventById(id);if(!e)return;const had=savedPlaces.some(p=>p.id===id);savedPlaces=had?savedPlaces.filter(p=>p.id!==id):[...savedPlaces,e];let stored=true;try{localStorage.setItem(nearKey+'-places',JSON.stringify(savedPlaces));}catch{stored=false;}render();if($('#placeSave'))$('#placeSave').textContent=had?'Save place':'✓ Place saved';toast(stored?(had?'Place removed':'Place saved to My plans'):'Storage is disabled. This place will stay saved until you close the tab.');}
function showSources(){const sources=catalog.sourceRegistry||catalog.sources||[];showDialog(`<div class="detail-content"><div class="eyebrow">SOURCES AND UPDATES</div><h2>Event sources<br>and places</h2><p class="detail-description">${esc(catalog.coverage)}</p><p class="detail-description">Events from ${esc(catalog.startDate)} — ${esc(catalog.endDate)}. These are saved listings; automatic daily updates are not enabled yet.</p><div class="source-registry">${sources.map(s=>`<div><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><small>${s.status==='blocked'?'Automatic loading unavailable':s.status==='reviewed'?'Checked as an additional source':s.type==='telegram'?'Public announcements':'Used in these listings'}${Number.isFinite(s.count)?' · listings: '+s.count:''}</small><p>${esc(s.publicNote||s.note||'')}</p></div>`).join('')}</div><p class="detail-disclaimer">Listings are not guaranteed to be complete. Public Telegram channels are listed separately; a channel link does not mean all posts were imported. Check prices, cancellations and opening hours with organisers before visiting.</p></div>`);}

$('#eventsLayer').onclick=()=>setLayer('events');$('#cityLayer').onclick=()=>setLayer('city');



// Noreli 2.1: retain legacy storage keys so an APK update preserves plans.
let searchTerm='';
let catalogOrigin='bundled';
function budgetPrice(list){const known=list.filter(e=>typeof e.price==='number'),missing=known.length!==list.length;if(!known.length)return 'Not listed';const sum=Math.round(known.reduce((s,e)=>s+e.price,0)*100)/100;if(sum===0&&!missing)return 'Free';return `${missing||known.some(e=>e.min)?'from ':''}${priceText({price:sum||0}).replace('Free',priceText({price:1}).replace('1','0'))}${missing?' + unconfirmed prices':''}`;}
const isAndroid=location.hostname==='appassets.androidplatform.net';
const cityFolder='vienna/';
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
 const label=isAndroid?(catalogOrigin==='website'?'Online listings':'Saved listings'):'Event listings';
 $('#catalogStatus').classList.toggle('is-old',stale);
 $('#catalogStatus').innerHTML=`<span>${stale?'Fresh listings needed. ':''}${esc(label)} · ${esc(date)}<br>Coverage through ${esc(catalog.endDate.split('-').reverse().join('.'))} · ${isAndroid?'checked online at launch':'editorially updated'}</span><button id="sourceStatus">Sources ↗</button>`;
 $('#sourceStatus').onclick=showSources;
 if(!visible().length&&view!=='plans'&&layer==='events'){
  const inDate=events.filter(e=>day===-1?dates.some(d=>NoreliDiscovery.availableOnDate(e,d)):NoreliDiscovery.availableOnDate(e,dates[day]));
  const reason=stale||day!==-1&&dates[day]>catalog.endDate?'No updated listings for this date yet. This does not mean there are no events in the city.':inDate.length?`The city has ${eventCount(inDate.length)} for this period. Try a wider area or fewer filters.`:'No verified listings found for this date yet. Try the full week or browse sources.';
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
 showDialog(`<div class="detail-content"><div class="eyebrow">Happy Map · SOURCES</div><h2>Event sources</h2><p class="detail-description">${esc(catalog.coverage)}</p><p class="detail-description">${isAndroid?'The app checks published listings at launch. Offline, it uses a saved copy. ':''}Check dates and source availability are listed in the catalogue. This is a verified selection, not the complete city calendar.</p><a class="primary-button" href="${sourcesPath}">Open source directory →</a><h3>Used in these listings</h3><div class="source-registry">${used.map(s=>`<div><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><p>${esc(s.publicNote||s.note||'The original source is linked in the event card.')}</p></div>`).join('')}</div><p class="detail-disclaimer">Discovering a channel does not mean its events have been imported. Review statuses appear in the source directory. Google/email sign-in and organiser publishing are not connected; plans are saved on this device.</p><button class="text-button" id="reloadCatalog">Check published listings</button></div>`);
 $('#reloadCatalog').onclick=()=>location.reload();
};
$('#wholeWeek').onclick=()=>{day=-1;limit=18;render();};
$('#eventSearch').oninput=e=>{searchTerm=e.target.value.trim().toLocaleLowerCase();limit=18;render();};

// Noreli 2.2 — every map control has an explicit action.
function languageLabel(value){return ({EN:'EN',KA:'KA',RU:'RU',oth:'Language not listed'})[value]||value;}
function categoryArrows(){const el=$('#categories');if(!el)return;const max=el.scrollWidth-el.clientWidth;$('#categoryPrev').disabled=el.scrollLeft<3;$('#categoryNext').disabled=el.scrollLeft>=max-3;$('.category-scroll').classList.toggle('can-scroll',max>3);}
$('#categories').addEventListener('scroll',categoryArrows,{passive:true});
$('#categoryPrev').onclick=()=>$('#categories').scrollBy({left:-Math.max(160,$('#categories').clientWidth*.75),behavior:'smooth'});
$('#categoryNext').onclick=()=>$('#categories').scrollBy({left:Math.max(160,$('#categories').clientWidth*.75),behavior:'smooth'});
new ResizeObserver(categoryArrows).observe($('#categories'));
function showResults(unknownOnly=false,shown=30){
 const all=mapPlaces(visible()),missing=all.filter(e=>!Number.isFinite(e.lat)||!Number.isFinite(e.lng));const list=unknownOnly?missing:all;
 showDialog(`<div class="detail-content results-detail"><div class="eyebrow">${layer==='city'?'PLACES':'EVENTS'} · CURRENT SELECTION</div><h2>${unknownOnly?'No exact location':layer==='city'?'Place list':'Event list'}</h2><p class="detail-description">${list.length} in the list.${missing.length?` For ${missing.length} have no exact coordinates: see the card for address and source.`:''}</p>${missing.length?`<div class="result-tabs"><button id="resultsAll" aria-pressed="${!unknownOnly}">All · ${all.length}</button><button id="resultsUnknown" aria-pressed="${unknownOnly}">No location · ${missing.length}</button></div>`:''}<div>${list.slice(0,shown).map(card).join('')||'<p>No results. Try another date or different filters.</p>'}</div>${list.length>shown?`<button class="primary-button" id="resultsMore">Show more ${Math.min(30,list.length-shown)}</button>`:''}</div>`);
 if($('#resultsAll'))$('#resultsAll').onclick=()=>showResults(false);
 if($('#resultsUnknown'))$('#resultsUnknown').onclick=()=>showResults(true);
 if($('#resultsMore'))$('#resultsMore').onclick=()=>showResults(unknownOnly,shown+30);
}
$('#mapResults').onclick=()=>showResults();
const render22=render;
render=function(){render22();requestAnimationFrame(categoryArrows);
 $('#mapResults').setAttribute('aria-label','Open list: '+$('#mapLabel').textContent);
 let info=$('#cinemaInfo');if(!info){info=document.createElement('div');info.id='cinemaInfo';info.className='cinema-info';$('.list-heading').after(info);}
 info.hidden=view==='plans'||layer!=='events'||category!=='film'||cityFolder!=='';
 if(!info.hidden){const date=day===-1?'':dates[day];const n=date?(catalog.cinemaCoverage?.dailyCounts?.[date]||0):null;info.innerHTML=`<strong>Cinemas and film clubs</strong><p>${n===0?'No regular cinema schedule has been loaded for this date yet.':n===1?'Only part of the programme is listed for this date.':'Choose a screening: its card shows the time, language and ticket link.'}</p><a href="https://kinoafisha.ge/sessions?lang=eng${date?'&date='+date.split('-').reverse().join('-'):''}" target="_blank" rel="noopener noreferrer">Full cinema schedules ↗</a>`;}
};
const oldOpenPlace22=openPlace;
openPlace=function(e){
 oldOpenPlace22(e);
 const body=$('#eventDetails .detail-content');const facts=document.createElement('div');facts.className='place-guide';
 facts.innerHTML=`${e.highlights?.length?`<h3>What is here</h3><ul>${e.highlights.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${e.bestFor?`<h3>When to visit</h3><p>${esc(e.bestFor)}</p>`:''}${e.phone?`<a class="external-link" href="tel:${esc(e.phone.replace(/[^+\d]/g,''))}">Call · ${esc(e.phone)}</a>`:''}`;
 body.querySelector('.detail-actions,.source-links').before(facts);
 const related=events.filter(x=>dates.includes(x.date)&&!x.cancelled&&(x.venueId===e.venueId&&e.venueId||x.venue?.toLowerCase().includes(e.matchVenue||e.title.toLowerCase())));
 if(related.length){const section=document.createElement('div');section.className='place-program';section.innerHTML='<h3>Upcoming events here</h3>'+related.slice(0,8).map(x=>`<button data-open="${esc(x.id)}"><span>${esc(x.date.slice(8)+'.'+x.date.slice(5,7))} · ${esc(x.time||'')}</span>${esc(x.title)} →</button>`).join('');body.append(section);bindCards(section);}
};

// Startup is performed by discovery.js after all map extensions are registered.
