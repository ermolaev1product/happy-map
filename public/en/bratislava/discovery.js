// Two map modes: dated events and the whole city. Places never become fabricated events.
categories.push({id:'art',name:'Exhibitions',icon:'spark',color:'#ad7955',bg:'#f8edde'},
 {id:'cafe',name:'Coffee',icon:'wine',color:'#9b7652',bg:'#f4eee6'},
 {id:'food',name:'Food',icon:'wine',color:'#a47a50',bg:'#f5edde'},
 {id:'nightlife',name:'Clubs',icon:'music',color:'#876ab2',bg:'#f0e8f8'},
 {id:'books',name:'Books',icon:'talk',color:'#648d73',bg:'#e7f0e7'},
 {id:'park',name:'Walks',icon:'spark',color:'#648d73',bg:'#e7f0e7'});
let venueIndex=null,withProgram=false,programMemo=new Map();
const selectedDays=()=>day===-1?dates:[dates[day]];
const programFor=p=>programMemo.get(p.id)||[];
const weekProgram=p=>NoreliDiscovery.program(p.id,venueIndex?.programmes||new Map(),dates);
const distanceLabel=e=>{const d=distance(e);return Number.isFinite(d)?(d<1?Math.max(10,Math.round(d*1000/10)*10)+' m':d.toFixed(1)+' km')+' straight-line':'Address not listed';};
const shortWhen=e=>e.endDate?'Through '+e.endDate.slice(8)+'.'+e.endDate.slice(5,7):e.date===today()?'Today':e.date===dates[1]?'Tomorrow':e.date.slice(8)+'.'+e.date.slice(5,7);
function programmeLine(e){return `${shortWhen(e)}${e.time?' · '+e.time:''} — ${e.title}`;}
async function loadPlaces(){
 const unpack=d=>Array.isArray(d)?d:d.places;
 const valid=d=>Array.isArray(d)&&d.length<150000&&d.every(p=>p&&typeof p.id==='string'&&typeof p.title==='string');
 let local=unpack(await (await fetch('places.json',{cache:'no-store'})).json());if(!valid(local))local=[];
 if(!isAndroid)return local;
 let cached;try{cached=JSON.parse(localStorage.getItem(nearKey+'-places-catalog'));}catch{}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
 try{const r=await fetch('/live/'+cityFolder+'places.json',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const remote=unpack(await r.json());if(!valid(remote)||remote.length<local.length/2)throw Error();try{localStorage.setItem(nearKey+'-places-catalog',JSON.stringify({places:remote,version:'2.3'}));}catch{}return remote;}catch{return cached?.version==='2.3'&&valid(cached.places)&&cached.places.length>=local.length?cached.places:local;}finally{clearTimeout(timer);}
}
const initMapBeforeDiscovery=initMap;
initMap=function(){
 venueIndex=NoreliDiscovery.connect(places,events);places=venueIndex.places;
 const entry=new URLSearchParams(location.search);
 layer=['city','places','nearby'].includes(entry.get('layer'))||entry.has('place')?'city':'events';
 if(categories.some(c=>c.id===entry.get('category')))placeCategory=entry.get('category');
 if(view==='plans')layer='events';
 if(cityFolder===''){
  let remembered=false;try{remembered=!!localStorage.getItem(nearKey);}catch{}
  if(!remembered){position=[41.7011268,44.7962925];positionLabel='Opera district';radius=.5;}
 }
 if(['all','0','0.5','.5','500'].includes(entry.get('radius'))){initialCityOverview=false;radius=['all','0'].includes(entry.get('radius'))?0:.5;$('#radiusFilter').value=String(radius);}
 initMapBeforeDiscovery();
 if(map){if(initialCityOverview&&!radius)fitInitialCity();else if(radius&&layer!=='city')map.fitBounds(L.latLng(position).toBounds(1000),{padding:[40,40],maxZoom:15,animate:false});else fitMap();}
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
   const filtered=program.filter(e=>selectedDays().some(d=>NoreliDiscovery.availableOnDate(e,d)&&(time==='all'||(e.dateType==='published_interval'?intervalTimeMatches(e,[d]):(e.visitSchedule?e.visitSchedule[d]?.start:e.time)&&(time==='day'?(e.visitSchedule?e.visitSchedule[d]?.start:e.time)<'18:00':(e.visitSchedule?e.visitSchedule[d]?.start:e.time)>='18:00'))))&&(!freeOnly||e.price===0)&&(language==='all'||languageMatches(e.language,language)));
   programMemo.set(id,filtered);
  }
 }
 renderBeforeDiscovery();if(!catalog)return;
 const statusText=$('#catalogStatus span');statusText.textContent='Listings · '+(catalog.generatedAt||'').slice(0,10).split('-').reverse().join('.')+(today()>catalog.endDate?' · fresh listings needed':'');statusText.title='Coverage through '+catalog.endDate+'; published listings checked at launch';
 const nearby=layer==='city'&&view!=='plans',list=visible();document.body.classList.toggle('nearby-view',nearby);
 for(const [id,on] of [['eventsLayer',layer==='events'],['cityLayer',layer==='city']]){
  $('#'+id).classList.toggle('active',on);$('#'+id).setAttribute('aria-pressed',String(on));
 }
 const ruMenu=document.documentElement.lang==='ru';
 const modeCopy=document.documentElement.lang==='de'?{city:'Ganze Stadt',saved:'Gespeicherte Orte',description:'Alle Orte und Veranstaltungen der Stadt'}:document.documentElement.lang==='en'?{city:'Whole city',saved:'Saved places',description:'All city places and their events'}:{city:'Whole city',saved:'Saved places',description:'All city places and their events'};
 $('#cityLayer').textContent=view==='plans'?modeCopy.saved:modeCopy.city;
 $('#cityLayer').title=view==='plans'?modeCopy.saved:modeCopy.description;
 $('#programOnly').hidden=!nearby;
 $('#programOnly').setAttribute('aria-pressed',String(withProgram));
 $('#mobileList').textContent=nearby?'List':layer==='city'?'Places':'Events';
 if(nearby){
  const pool=[...places,...events];
  const order=['all','bar','film','music','theatre','art','cafe','food','nightlife','games','books','market','park','talk','space','kids','sport','workshop','city','other'];
  $('#categories').innerHTML=order.map(id=>categories.find(c=>c.id===id)).filter(c=>c&&(c.id==='all'||pool.some(p=>NoreliDiscovery.hasCategory(p,c.id)))).map(c=>`<button class="category ${c.id===category?'active':''}" data-category="${c.id}" aria-pressed="${c.id===category}">${icon(c.icon)}${c.name}</button>`).join('');
  $('#categories').querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;limit=18;render();});
  $('#listTitle').textContent=withProgram?'Places with a programme':'Where to go';
  const scheduled=list.filter(p=>programFor(p).length).length;
  $('#resultCount').textContent=`${placeCount(list.filter(p=>p.kind==='place').length)} · ${scheduled} with a programme${list.some(p=>p.kind!=='place')?' · '+eventCount(list.filter(p=>p.kind!=='place').length):''}`;
  if(!radius)$('#mapLabel').textContent=`${placeCount(list.length)} · list →`;
  $('#mapResults').setAttribute('aria-label','Open list: '+placeCount(list.length));
  $('#mapPlanButton').hidden=true;$('#sortButton').hidden=true;
  $('#mapEmpty').querySelector('p').textContent='Try another day or category.';
 }
 const note=$('#discoveryNote');note.hidden=view==='plans'||layer==='events';
 note.textContent=nearby?(ruMenu?"Places and events together. Venues with events on your dates come first. The circle highlights nearby places.":'Places and events together. Venues with events on your dates come first. The circle highlights nearby places.'):(ruMenu?"Cafés, bars and other places, independent of event dates.":'Cafés, bars and other places, independent of event dates.');
 if(!list.length&&view!=='plans'&&!mapPlaces(list).length){
  const sourceCity=cityFolder==='belgrade/'?'belgrade':cityFolder==='moscow/'?'moscow':'tbilisi';
  const alternatives=`<div class="empty-alternatives">${layer==='events'?'<button type="button" class="text-button" data-empty-places>Places in this category across the city →</button>':''}${layer==='events'&&day!==-1?'<button type="button" class="text-button" data-empty-week>Browse all event dates →</button>':''}<a class="text-button" href="sources.html">Check city sources ↗</a></div>`;
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
 return `<article class="event-row place-row"><button data-open="${esc(p.id)}" aria-label="${esc(p.title)}">${poster(p)}</button><div class="event-info"><div class="event-meta">${esc(p.placeType||catOf(p).name)} · ${esc(distanceLabel(p))}</div><button class="event-title" data-open="${esc(p.id)}">${esc(p.title)}</button><p class="place-summary">${esc(p.description)}</p>${beer?`<span class="beer-price">${esc(beer)}</span>`:''}${first&&layer==='city'?`<p class="venue-program has-program">${esc(programmeLine(first))+(program.length>1?` · more ${program.length-1}`:'')}</p>`:''}</div><button class="bookmark ${kept?'saved':''}" data-place-save="${esc(p.id)}" aria-label="${kept?'Remove place':'Save place'}: ${esc(p.title)}">${icon(kept?'check':'bookmark')}</button></article>`;
};
function sourceLinks(p){
 return [...new Set([p.website,p.sourceUrl,p.openingHoursSource,p.visitScheduleSource,...(p.sourceURLs||[])].filter(Boolean))].filter(u=>safeUrl(u)).slice(0,6).map(u=>{
  let name;try{name=new URL(u).hostname.replace(/^www\./,'');}catch{return '';}
  return `<a class="external-link" href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a>`;
 }).join('');
}
openPlace=function(p,showWeek=false,shown=12){
 const daily=programFor(p),weekly=weekProgram(p),program=showWeek?weekly:daily,beer=p.beerPrice;
 const beerText=beer?`${beer.min}${beer.max?'–'+beer.max:'+'} ${beer.currency||"EUR"}`:null;
 showDialog(`<div class="detail-content"><div class="eyebrow">${esc(p.placeType||catOf(p).name)} · ${esc(distanceLabel(p))}</div><h2>${esc(p.title)}</h2><p class="detail-description">${esc(p.description)}</p>${admissionText(p)?`<p class="detail-description">${esc(admissionText(p))}</p>`:''}<div class="detail-facts"><div>${icon('pin')}${esc(p.address||'Location is marked on the map; street address is not listed.')}</div></div>${p.openingHours?`<p class="detail-description"><strong>Directory opening hours:</strong> ${esc(formatVenueHours(p.openingHours))}</p>`:''}<p class="detail-disclaimer">${esc(p.openingNote||'Check opening hours and entry conditions before visiting.')}</p>
 ${p.menuReference?`<p class="detail-description">${esc(p.menuReference.text)} <a href="${safeUrl(p.menuReference.url)}" target="_blank" rel="noopener noreferrer">${esc(p.menuReference.source)} ↗</a></p>`:''}${NoreliDiscovery.hasCategory(p,'bar')||beer?`<div class="drink-budget"><strong>Beer ${beerText?'— '+esc(beerText):'at the venue — price not listed'}</strong>${beer?`<p>${esc(beer.unit||'Glass; serving size not listed')}${beer.menuDate?' · menu dated '+esc(beer.menuDate):''} · source estimate, not a guaranteed menu price.</p><a href="${safeUrl(beer.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(beer.source)} ↗</a><small>Checked ${esc(beer.checkedAt.slice(0,10).split('-').reverse().join('.'))}. Tickets and drinks are charged separately.</small>`:''}</div>`:''}
 <div class="source-links">${sourceLinks(p)}</div><div class="detail-actions"><button id="placeSave" class="primary-button">${savedPlaces.some(x=>x.id===p.id)?'✓ Place saved':'Save place'}</button><a class="external-link" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(NoreliDiscovery.hasPoint(p)?p.lat+','+p.lng:[p.title,p.address].filter(Boolean).join(', '))}&travelmode=walking" target="_blank" rel="noopener noreferrer">Walking directions ↗</a></div>
 ${program.length||weekly.length?`<section class="place-program">${program.length?`<h3>${showWeek?'Weekly programme':day===-1?'Weekly programme':'Programme · '+esc(dateLabel(dates[day]))}</h3>`:''}${program.length?program.slice(0,shown).map(e=>`<button data-open="${esc(e.id)}"><span>${esc(shortWhen(e))} · ${esc(e.time||'Time not listed')} · ${priceText(e)}${e.soldOut?' · sold out':''}</span>${esc(e.title)} →</button>`).join(''):''}${program.length>shown?'<button id="moreProgramme" class="text-button">Show more events</button>':''}${!showWeek&&day!==-1&&weekly.length?`<button id="weekProgramme" class="text-button">Full weekly programme · ${weekly.length} →</button>`:''}</section>`:''}
 <p class="detail-disclaimer">${p.provenance==='openstreetmap'?'Place from OpenStreetMap. A map listing does not confirm that it is open today. ':''}${p.sourceCheckedAt?'Last directory check: '+esc(p.sourceCheckedAt)+'. ':''}Straight-line distance. Your route may be longer.</p></div>`);
 $('#placeSave').onclick=()=>togglePlace(p.id);if($('#weekProgramme'))$('#weekProgramme').onclick=()=>openPlace(p,true);
 if($('#moreProgramme'))$('#moreProgramme').onclick=()=>openPlace(p,showWeek,shown+20);
};
showGroup=function(group){
 const isVenues=group.every(e=>e.kind==='place');showDialog(`<div class="detail-content"><div class="eyebrow">IN THIS AREA</div><h2>${isVenues?placeCount(group.length):eventCount(group.length)} nearby</h2><p class="muted">Choose a place or zoom in.</p>${group.map(card).join('')}</div>`);
};
const showResultsBeforeDiscovery=showResults;
showResults=function(unknownOnly=false,shown=30){showResultsBeforeDiscovery(unknownOnly,shown);if(layer==='city'){$('#eventDetails .eyebrow').textContent='PLACES AND PROGRAMMES';$('#eventDetails h2').textContent='Where to go';}};
function showPeace(){
 $('.more-menu').open=false;
 showDialog('<div class="detail-content peace-note"><div class="eyebrow">OUR POSITION</div><h2>For peace.</h2><p>We oppose war. We stand for human life, freedom and the chance to live without fear.</p><p>This project helps people meet, enjoy music and films, and discover their city. Everyone should have the opportunity to make peaceful plans.</p></div>');
}
document.querySelectorAll('[data-peace]').forEach(b=>b.onclick=showPeace);
const sourcesBeforeDiscovery=showSources;
showSources=function(){sourcesBeforeDiscovery();if(cityFolder!=='moscow/'&&cityFolder!=='bratislava/'){const section=document.createElement('section');section.className='place-program';section.innerHTML='<h3>Place and price sources</h3><p>Places: © OpenStreetMap contributors, supplemented by venue listings. Beer prices come from venue menus, public Yandex Maps listings and PoštoPiće. Source, serving size and check date appear in the card.</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap terms · ODbL ↗</a> · <a href="'+(cityFolder?'../downloads/noreli-osm-belgrade-2026-10-08.json':'downloads/noreli-osm-tbilisi-2026-10-08.json')+'" download>Download the open places dataset</a>';$('#eventDetails .detail-content').append(section);}};
$('#sourcesButton').onclick=showSources;
start().then(()=>{const id=new URLSearchParams(location.search).get('place');const p=id&&places.find(p=>p.id===id);if(p&&map){if(NoreliDiscovery.hasPoint(p))map.setView([p.lat,p.lng],16);openPlace(p);}});
