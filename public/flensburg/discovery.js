// Two map modes: dated events and the whole city. Places never become fabricated events.
categories.push({id:'art',name:"Искусство и выставки",icon:'spark',color:'#ad7955',bg:'#f8edde'},
 {id:'bakery',name:"Пекарни",icon:'wine',color:'#a47a50',bg:'#f5edde'},
 {id:'cafe',name:"Кофе",icon:'wine',color:'#9b7652',bg:'#f4eee6'},
 {id:'food',name:"Поесть",icon:'wine',color:'#a47a50',bg:'#f5edde'},
 {id:'nightlife',name:"Ночная жизнь",icon:'music',color:'#876ab2',bg:'#f0e8f8'},
 {id:'books',name:"Книги",icon:'talk',color:'#648d73',bg:'#e7f0e7'},
 {id:'park',name:"На свежем воздухе",icon:'spark',color:'#648d73',bg:'#e7f0e7'});
let venueIndex=null,withProgram=false,programMemo=new Map();
const selectedDays=selectedCityDates;
const programFor=p=>programMemo.get(p.id)||[];
const weekProgram=p=>NoreliDiscovery.program(p.id,venueIndex?.programmes||new Map(),catalogDates);
const distanceLabel=e=>{const d=distance(e);return Number.isFinite(d)?(d<1?Math.max(10,Math.round(d*1000/10)*10)+' m':d.toFixed(1)+' km')+" расстояние по прямой":"Адрес не подтверждён";};
const shortWhen=e=>e.endDate?"По "+shortDate(e.endDate):e.date===today()?"Сегодня":e.date===dates[1]?"Завтра":shortDate(e.date);
function programmeLine(e){return `${shortWhen(e)}${e.time?' · '+timeLabel(e.time):''} — ${e.title}`;}
async function loadPlaces(){
 const unpack=d=>Array.isArray(d)?d:d.places;
 const valid=d=>Array.isArray(d)&&d.length<150000&&d.every(p=>p&&typeof p.id==='string'&&typeof p.title==='string');
 let local=unpack(await (await fetch('/flensburg/places.json',{cache:'no-store'})).json());if(!valid(local))local=[];
 if(!isAndroid)return local;
 let cached;try{cached=JSON.parse(localStorage.getItem(nearKey+'-places-catalog'));}catch{}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
 try{const r=await fetch('/live/'+cityFolder+'places.json',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const remote=unpack(await r.json());if(!valid(remote)||remote.length<local.length/2)throw Error();try{localStorage.setItem(nearKey+'-places-catalog',JSON.stringify({places:remote,version:'2.3'}));}catch{}return remote;}catch{return cached?.version==='2.3'&&valid(cached.places)&&cached.places.length>=local.length?cached.places:local;}finally{clearTimeout(timer);}
}
const initMapBeforeDiscovery=initMap;
initMap=function(){
 venueIndex=NoreliDiscovery.connect(places,events);places=venueIndex.places;for(const p of places){if(p.fromEvents){const e=(venueIndex.programmes.get(p.id)||[])[0];p.description="Площадка из афиши событий. Ниже показана её проверенная программа с датами.";p.coordinatePrecision=e?.coordinatePrecision;p.website=e?.primarySourceUrl||e?.sourceUrl;p.currency='EUR';}if(p.coordinatePrecision==='postcode-centroid')p.openingNote="Точка обозначает зону почтового индекса, а не проверенный вход. Используйте указанный адрес и уточняйте часы работы у площадки.";}
 const entry=new URLSearchParams(location.search);
 layer=['city','places','nearby'].includes(entry.get('layer'))||entry.has('place')?'city':'events';
 if(categories.some(c=>c.id===entry.get('category')))placeCategory=entry.get('category');
 if(view==='plans')layer='events';
 if(cityFolder===''){
  let remembered=false;try{remembered=!!localStorage.getItem(nearKey);}catch{}
  if(!remembered){position=[41.7011268,44.7962925];positionLabel="Район Оперы";radius=1;}
 }
 if(entry.get('radius')==='all'){radius=0;$('#radiusFilter').value='0';}
 initMapBeforeDiscovery();
 if(map&&layer!=='city')map.setZoom(15);
};
const visibleBeforeDiscovery=visible;
visible=function(){
 if(layer!=='city'||view==='plans')return visibleBeforeDiscovery();
 const venues=places.filter(p=>{
  const program=programFor(p);
  const text=[p.title,p.address,p.description,...(p.aliases||[]),...program.map(e=>e.title)].join(' ').toLocaleLowerCase();
  return (!searchTerm||text.includes(searchTerm))&&
   (NoreliDiscovery.hasCategory(p,category)||program.some(e=>e.category===category))&&
   (!(withProgram||freeOnly||time!=='all'||language!=='all')||program.length>0);
 }).sort((a,b)=>Number(programFor(b).length>0)-Number(programFor(a).length>0)||distance(a)-distance(b));
 // Keep real events without a matched venue discoverable, including unknown coordinates.
 const previousLayer=layer,previousRadius=radius;
 try{layer='events';radius=0;return [...venues,...visibleBeforeDiscovery().filter(e=>!venueIndex?.links.has(e.id))];}
 finally{layer=previousLayer;radius=previousRadius;}
};
const renderBeforeDiscovery=render;
render=function(){
 if(venueIndex){
  programMemo=new Map();
  for(const [id,program] of venueIndex.programmes){
   const filtered=program.filter(e=>selectedDays().some(d=>NoreliDiscovery.availableOnDate(e,d))&&accessMatches(e)&&(!freeOnly||e.price===0)&&
    (time==='all'||e.time&&(time==='day'?e.time<'18:00':e.time>='18:00'))&&(language==='all'||String(e.language||'').toUpperCase().includes(language)));
   programMemo.set(id,filtered);
  }
 }
 renderBeforeDiscovery();if(!catalog)return;
 const statusText=$('#catalogStatus span');statusText.textContent="События · "+(catalog.generatedAt||'').slice(0,10).split('-').reverse().join('.')+(today()>catalog.endDate?" · нужны новые анонсы":'');statusText.title="Покрытие до "+catalog.endDate+"; загружает опубликованную подборку при запуске";
 const nearby=layer==='city'&&view!=='plans',list=visible();document.body.classList.toggle('nearby-view',nearby);
 for(const [id,on] of [['eventsLayer',layer==='events'],['cityLayer',layer==='city']]){
  $('#'+id).classList.toggle('active',on);$('#'+id).setAttribute('aria-pressed',String(on));
 }
 const ruMenu=document.documentElement.lang==='ru';
 const modeCopy=false?{city:'Ganze Stadt',saved:'Gespeicherte Orte',description:'Alle Orte und Veranstaltungen der Stadt'}:true?{city:"Весь город",saved:"Сохранённые места",description:"Все места города и их события"}:{city:"Весь город",saved:"Сохранённые места",description:"Все места города и их события"};
 $('#cityLayer').textContent=view==='plans'?modeCopy.saved:modeCopy.city;
 $('#cityLayer').title=view==='plans'?modeCopy.saved:modeCopy.description;
 $('#programOnly').hidden=!nearby;
 $('#programOnly').setAttribute('aria-pressed',String(withProgram));
 $('#mobileList').textContent=nearby?"Списком":layer==='city'?"Места":"События";
 if(nearby){
  const pool=[...places,...events];
  const order=['all','bar','film','music','theatre','art','cafe','bakery','food','nightlife','games','books','market','park','talk','space','kids','sport','workshop','city','other'];
  $('#categories').innerHTML=order.map(id=>categories.find(c=>c.id===id)).filter(c=>c&&(c.id==='all'||pool.some(p=>NoreliDiscovery.hasCategory(p,c.id)))).map(c=>`<button class="category ${c.id===category?'active':''}" data-category="${c.id}" aria-pressed="${c.id===category}">${icon(c.icon)}${c.name}</button>`).join('');
  $('#categories').querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;limit=18;render();});
  $('#listTitle').textContent=withProgram?"Места с событиями":"Куда можно пойти";
  const scheduled=list.filter(p=>programFor(p).length).length;
  $('#resultCount').textContent=`${placeCount(list.filter(p=>p.kind==='place').length)} · ${scheduled} с событиями${list.some(p=>p.kind!=='place')?' · '+eventCount(list.filter(p=>p.kind!=='place').length):''}`;
  if(!radius)$('#mapLabel').textContent=`${placeCount(list.length)} · список →`;
  $('#mapResults').setAttribute('aria-label',"Открыть список: "+placeCount(list.length));
  $('#mapPlanButton').hidden=true;$('#sortButton').hidden=true;
  $('#mapEmpty').querySelector('p').textContent="Попробуй другой день или категорию.";
 }
 const note=$('#discoveryNote');note.hidden=view==='plans'||layer==='events';
 note.textContent=nearby?(ruMenu?"Места и афиша вместе. Сначала — места с событиями на выбранные даты. Круг выделяет то, что рядом.":"Места и афиша вместе. Сначала — места с событиями на выбранные даты. Круг выделяет то, что рядом."):(ruMenu?"Каталог кафе, баров и других мест — без привязки к дате.":"Каталог кафе, баров и других мест — без привязки к дате.");
 if(!list.length&&view!=='plans'){
  const sourceCity=cityFolder==='belgrade/'?'belgrade':cityFolder==='moscow/'?'moscow':cityFolder==='flensburg/'?'flensburg':'tbilisi';
  const alternatives=`<div class="empty-alternatives">${layer==='events'?"<button type=\"button\" class=\"text-button\" data-empty-places>Места этой категории по всему городу →</button>":''}${layer==='events'&&day!==-1?"<button type=\"button\" class=\"text-button\" data-empty-week>Посмотреть все даты событий →</button>":''}<a class="text-button" href="/flensburg/sources.html">Проверить местные источники ↗</a></div>`;
  for(const box of [$('#eventList .empty'),$('#mapEmpty')]){
   if(!box)continue;box.insertAdjacentHTML('beforeend',alternatives);
   const placesButton=box.querySelector('[data-empty-places]');
   if(placesButton)placesButton.onclick=()=>{setLayer('city');};
   const weekButton=box.querySelector('[data-empty-week]');
   if(weekButton)weekButton.onclick=()=>{day=-1;limit=18;render();};
  }
 }
 requestAnimationFrame(categoryArrows);
};
const setLayerBeforeDiscovery=setLayer;
setLayer=function(value){
 const next=['city','nearby','places'].includes(value)?'city':'events',changed=layer!==next;
 if(next==='events'&&category!=='all'&&!events.some(e=>e.category===category))category='all';
 setLayerBeforeDiscovery(next);
 if(changed&&next==='city'&&view!=='plans')fitMap();
};
$('#cityLayer').onclick=()=>setLayer('city');
$('#programOnly').onclick=()=>{withProgram=!withProgram;limit=18;render();};
const setViewBeforeDiscovery=setView;
setView=function(value){if(value!==view)layer='events';setViewBeforeDiscovery(value);};
const resetBeforeDiscovery=resetFilters;
resetFilters=function(){withProgram=false;resetBeforeDiscovery();};
placeCard=function(p){
 const kept=savedPlaces.some(x=>x.id===p.id),program=programFor(p),first=program.find(e=>!e.soldOut)||program[0];
 const beer=NoreliDiscovery.beerLabel(p);
 return `<article class="event-row place-row"><button data-open="${esc(p.id)}" aria-label="${esc(p.title)}">${poster(p)}</button><div class="event-info"><div class="event-meta">${esc(p.placeType||catOf(p).name)} · ${esc(distanceLabel(p))}</div><button class="event-title" data-open="${esc(p.id)}">${esc(p.title)}</button><p class="place-summary">${esc(p.description)}</p>${beer?`<span class="beer-price">${esc(beer)}</span>`:''}${first&&layer==='city'?`<p class="venue-program has-program">${esc(programmeLine(first))+(program.length>1?` · ещё ${program.length-1}`:'')}</p>`:''}</div><button class="bookmark ${kept?'saved':''}" data-place-save="${esc(p.id)}" aria-label="${kept?"Убрать место":"Сохранить место"}: ${esc(p.title)}">${icon(kept?'check':'bookmark')}</button></article>`;
};
function sourceLinks(p){
 return [...new Set([p.website,p.sourceUrl,...(p.sourceURLs||[])].filter(Boolean))].filter(u=>safeUrl(u)).slice(0,6).map(u=>{
  let name;try{name=new URL(u).hostname.replace(/^www\./,'');}catch{return '';}
  return `<a class="external-link" href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a>`;
 }).join('');
}
openPlace=function(p,showWeek=false,shown=12){
 const daily=programFor(p),weekly=weekProgram(p),program=showWeek?weekly:daily,beer=p.beerPrice;
 const beerText=beer?`${beer.min}${beer.max?'–'+beer.max:'+'} ${beer.currency||'EUR'}`:null;
 showDialog(`<div class="detail-content"><div class="eyebrow">${esc(p.placeType||catOf(p).name)} · ${esc(distanceLabel(p))}</div><h2>${esc(p.title)}</h2><p class="detail-description">${esc(p.description)}</p><div class="detail-facts"><div>${icon('pin')}${esc(p.address||"Место отмечено на карте; почтовый адрес не указан.")}</div></div>${p.openingHours?`<p class="detail-description"><strong>Указанные часы работы:</strong> ${esc(p.openingHours)}</p>`:''}<p class="detail-disclaimer">${esc(p.openingNote||"Перед посещением проверьте часы работы и условия входа.")}</p>
 ${p.menuReference?`<p class="detail-description">${esc(p.menuReference.text)} <a href="${safeUrl(p.menuReference.url)}" target="_blank" rel="noopener noreferrer">${esc(p.menuReference.source)} ↗</a></p>`:''}${NoreliDiscovery.hasCategory(p,'bar')||beer?`<div class="drink-budget"><strong>Пиво ${beerText?'— '+esc(beerText):"на этой площадке — цена не указана"}</strong>${beer?`<p>${esc(beer.unit||"Один бокал; объём не указан")}${beer.menuDate?" · меню от "+esc(beer.menuDate):''} · оценка по источнику, а не гарантированная цена меню.</p><a href="${safeUrl(beer.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(beer.source)} ↗</a><small>Проверено ${esc(beer.checkedAt.slice(0,10).split('-').reverse().join('.'))}. Билеты и напитки оплачиваются отдельно.</small>`:''}</div>`:''}
 <div class="source-links">${sourceLinks(p)}</div><div class="detail-actions"><button id="placeSave" class="primary-button">${savedPlaces.some(x=>x.id===p.id)?"✓ Место сохранено":"Сохранить место"}</button><a class="external-link" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(NoreliDiscovery.hasPoint(p)&&p.coordinatePrecision!=='postcode-centroid'?p.lat+','+p.lng:[p.title,p.address].filter(Boolean).join(', '))}&travelmode=walking" target="_blank" rel="noopener noreferrer">Пеший маршрут ↗</a></div>
 ${program.length||weekly.length?`<section class="place-program">${program.length?`<h3>${showWeek?"Программа на доступные даты":day===-1?"Программа на доступные даты":"Программа · "+esc(dateLabel(dates[day]))}</h3>`:''}${program.length?program.slice(0,shown).map(e=>`<button data-open="${esc(e.id)}"><span>${esc(shortWhen(e))} · ${esc(timeLabel(e.time)||"Время не подтверждено")} · ${priceText(e)}${e.soldOut?" · билеты распроданы":''}</span>${esc(e.title)} →</button>`).join(''):''}${program.length>shown?"<button id=\"moreProgramme\" class=\"text-button\">Показать ещё события</button>":''}${!showWeek&&day!==-1&&weekly.length?`<button id="weekProgramme" class="text-button">Полная программа на неделю · ${weekly.length} →</button>`:''}</section>`:''}
 <p class="detail-disclaimer">${p.provenance==='openstreetmap'?"Это место взято из OpenStreetMap. Точка на карте не подтверждает, что заведение открыто сегодня. ":''}${p.sourceCheckedAt?"Последняя отметка проверки в справочнике: "+esc(p.sourceCheckedAt)+'. ':''}Расстояние измеряется по прямой. Пешеходный маршрут может быть длиннее.</p></div>`);
 $('#placeSave').onclick=()=>togglePlace(p.id);if($('#weekProgramme'))$('#weekProgramme').onclick=()=>openPlace(p,true);
 if($('#moreProgramme'))$('#moreProgramme').onclick=()=>openPlace(p,showWeek,shown+20);
};
showGroup=function(group){
 const isVenues=group.every(e=>e.kind==='place');showDialog(`<div class="detail-content"><div class="eyebrow">В ЭТОЙ ЧАСТИ ГОРОДА</div><h2>${isVenues?placeCount(group.length):eventCount(group.length)} рядом</h2><p class="muted">Выбери место или увеличь карту.</p>${group.map(card).join('')}</div>`);
};
const showResultsBeforeDiscovery=showResults;
showResults=function(unknownOnly=false,shown=30){showResultsBeforeDiscovery(unknownOnly,shown);if(layer==='city'){$('#eventDetails .eyebrow').textContent="МЕСТА И СОБЫТИЯ";$('#eventDetails h2').textContent="Куда можно пойти";}};
function showPeace(){
 $('.more-menu').open=false;
 showDialog("<div class=\"detail-content peace-note\"><div class=\"eyebrow\">НАША ПОЗИЦИЯ</div><h2>За мир.</h2><p>Мы против войны. За человеческую жизнь, свободу и возможность жить без страха.</p><p>Этот проект помогает людям встречаться, слушать музыку, смотреть кино и узнавать свой город. Для нас важно, чтобы у каждого была возможность строить мирные планы.</p></div>");
}
document.querySelectorAll('[data-peace]').forEach(b=>b.onclick=showPeace);
const sourcesBeforeDiscovery=showSources;
showSources=function(){sourcesBeforeDiscovery();};
$('#sourcesButton').onclick=showSources;
start().then(()=>{const id=new URLSearchParams(location.search).get('place');const p=id&&places.find(p=>p.id===id);if(p&&map){if(NoreliDiscovery.hasPoint(p))map.setView([p.lat,p.lng],16);openPlace(p);}});
