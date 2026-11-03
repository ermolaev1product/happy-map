// Two map modes: dated events and the whole city. Places never become fabricated events.
categories.push({id:'art',name:"Kunst & Ausstellungen",icon:'spark',color:'#ad7955',bg:'#f8edde'},
 {id:'bakery',name:"Bäckereien",icon:'wine',color:'#a47a50',bg:'#f5edde'},
 {id:'cafe',name:"Cafés",icon:'wine',color:'#9b7652',bg:'#f4eee6'},
 {id:'food',name:"Essen",icon:'wine',color:'#a47a50',bg:'#f5edde'},
 {id:'nightlife',name:"Nachtleben",icon:'music',color:'#876ab2',bg:'#f0e8f8'},
 {id:'books',name:"Bücher",icon:'talk',color:'#648d73',bg:'#e7f0e7'},
 {id:'park',name:"Draußen",icon:'spark',color:'#648d73',bg:'#e7f0e7'});
let venueIndex=null,withProgram=false,programMemo=new Map();
const selectedDays=selectedCityDates;
const programFor=p=>programMemo.get(p.id)||[];
const weekProgram=p=>NoreliDiscovery.program(p.id,venueIndex?.programmes||new Map(),catalogDates);
const distanceLabel=e=>{const d=distance(e);return Number.isFinite(d)?(d<1?Math.max(10,Math.round(d*1000/10)*10)+' m':d.toFixed(1)+' km')+" Luftlinie":"Adresse nicht bestätigt";};
const shortWhen=e=>e.endDate?"Po "+shortDate(e.endDate):e.date===today()?"Heute":e.date===dates[1]?"Morgen":shortDate(e.date);
function programmeLine(e){return `${shortWhen(e)}${e.time?' · '+timeLabel(e.time):''} — ${e.title}`;}
async function loadPlaces(){
 const unpack=d=>Array.isArray(d)?d:d.places;
 const valid=d=>Array.isArray(d)&&d.length<150000&&d.every(p=>p&&typeof p.id==='string'&&typeof p.title==='string');
 let local=unpack(await (await fetch('/de/flensburg/places.json',{cache:'no-store'})).json());if(!valid(local))local=[];
 if(!isAndroid)return local;
 let cached;try{cached=JSON.parse(localStorage.getItem(nearKey+'-places-catalog'));}catch{}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
 try{const r=await fetch('/live/'+cityFolder+'places.json',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const remote=unpack(await r.json());if(!valid(remote)||remote.length<local.length/2)throw Error();try{localStorage.setItem(nearKey+'-places-catalog',JSON.stringify({places:remote,version:'2.3'}));}catch{}return remote;}catch{return cached?.version==='2.3'&&valid(cached.places)&&cached.places.length>=local.length?cached.places:local;}finally{clearTimeout(timer);}
}
const initMapBeforeDiscovery=initMap;
initMap=function(){
 venueIndex=NoreliDiscovery.connect(places,events);places=venueIndex.places;for(const p of places){if(p.fromEvents){const e=(venueIndex.programmes.get(p.id)||[])[0];p.description="A venue ab the events calendar. Its verified programme with dates is shown below.";p.coordinatePrecision=e?.coordinatePrecision;p.website=e?.primarySourceUrl||e?.sourceUrl;p.currency='EUR';}if(p.coordinatePrecision==='postcode-centroid')p.openingNote="The point marks a postcode area, not a verified entrance. Use the listed address and confirm opening hours with the venue.";}
 const entry=new URLSearchParams(location.search);
 layer=['city','places','nearby'].includes(entry.get('layer'))||entry.has('place')?'city':'events';
 if(categories.some(c=>c.id===entry.get('category')))placeCategory=entry.get('category');
 if(view==='plans')layer='events';
 if(cityFolder===''){
  let remembered=false;try{remembered=!!localStorage.getItem(nearKey);}catch{}
  if(!remembered){position=[41.7011268,44.7962925];positionLabel="Opera district";radius=1;}
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
 const statusText=$('#catalogStatus span');statusText.textContent="Veranstaltungen · "+(catalog.generatedAt||'').slice(0,10).split('-').reverse().join('.')+(today()>catalog.endDate?" · new announcements needed":'');statusText.title="Termine bis "+catalog.endDate+"; loads the published selection on startup";
 const nearby=layer==='city'&&view!=='plans',list=visible();document.body.classList.toggle('nearby-view',nearby);
 for(const [id,on] of [['eventsLayer',layer==='events'],['cityLayer',layer==='city']]){
  $('#'+id).classList.toggle('active',on);$('#'+id).setAttribute('aria-pressed',String(on));
 }
 const ruMenu=document.documentElement.lang==='ru';
 const modeCopy=false?{city:'Ganze Stadt',saved:'Gespeicherte Orte',description:'Alle Orte und Veranstaltungen der Stadt'}:true?{city:"Ganze Stadt",saved:"Gespeicherte Orte",description:"Alle Orte und Veranstaltungen der Stadt"}:{city:"Ganze Stadt",saved:"Gespeicherte Orte",description:"Alle Orte und Veranstaltungen der Stadt"};
 $('#cityLayer').textContent=view==='plans'?modeCopy.saved:modeCopy.city;
 $('#cityLayer').title=view==='plans'?modeCopy.saved:modeCopy.description;
 $('#programOnly').hidden=!nearby;
 $('#programOnly').setAttribute('aria-pressed',String(withProgram));
 $('#mobileList').textContent=nearby?"Liste":layer==='city'?"Orte":"Veranstaltungen";
 if(nearby){
  const pool=[...places,...events];
  const order=['all','bar','film','music','theatre','art','cafe','bakery','food','nightlife','games','books','market','park','talk','space','kids','sport','workshop','city','other'];
  $('#categories').innerHTML=order.map(id=>categories.find(c=>c.id===id)).filter(c=>c&&(c.id==='all'||pool.some(p=>NoreliDiscovery.hasCategory(p,c.id)))).map(c=>`<button class="category ${c.id===category?'active':''}" data-category="${c.id}" aria-pressed="${c.id===category}">${icon(c.icon)}${c.name}</button>`).join('');
  $('#categories').querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;limit=18;render();});
  $('#listTitle').textContent=withProgram?"Orte mit Veranstaltungen":"Wohin gehen?";
  const scheduled=list.filter(p=>programFor(p).length).length;
  $('#resultCount').textContent=`${placeCount(list.filter(p=>p.kind==='place').length)} · ${scheduled} mit Veranstaltungen${list.some(p=>p.kind!=='place')?' · '+eventCount(list.filter(p=>p.kind!=='place').length):''}`;
  if(!radius)$('#mapLabel').textContent=`${placeCount(list.length)} · list →`;
  $('#mapResults').setAttribute('aria-label',"Liste öffnen: "+placeCount(list.length));
  $('#mapPlanButton').hidden=true;$('#sortButton').hidden=true;
  $('#mapEmpty').querySelector('p').textContent="Wähle einen anderen Tag oder eine andere Kategorie.";
 }
 const note=$('#discoveryNote');note.hidden=view==='plans'||layer==='events';
 note.textContent=nearby?(ruMenu?"Orte und Veranstaltungen zusammen. Orte mit Veranstaltungen an den gewählten Tagen stehen zuerst. Der Kreis hebt nahe Orte hervor.":"Orte und Veranstaltungen zusammen. Orte mit Veranstaltungen an den gewählten Tagen stehen zuerst. Der Kreis hebt nahe Orte hervor."):(ruMenu?"Cafés, Bars und andere Orte, unabhängig vom Veranstaltungsdatum.":"Cafés, Bars und andere Orte, unabhängig vom Veranstaltungsdatum.");
 if(!list.length&&view!=='plans'){
  const sourceCity=cityFolder==='belgrade/'?'belgrade':cityFolder==='moscow/'?'moscow':cityFolder==='flensburg/'?'flensburg':'tbilisi';
  const alternatives=`<div class="empty-alternatives">${layer==='events'?"<button type=\"button\" class=\"text-button\" data-empty-places>Orte dieser Kategorie in der ganzen Stadt →</button>":''}${layer==='events'&&day!==-1?"<button type=\"button\" class=\"text-button\" data-empty-week>View all event dates →</button>":''}<a class="text-button" href="/de/flensburg/sources.html">Lokale Quellen prüfen ↗</a></div>`;
  for(const box of [$('#eventList .empty'),$('#mapEmpty')]){
   if(!box)continue;box.insertAdjacentHTML('beforeend',alternatives);
   const placesButton=box.querySelector("[data-empty-Orte]");
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
 return `<article class="event-row place-row"><button data-open="${esc(p.id)}" aria-label="${esc(p.title)}">${poster(p)}</button><div class="event-info"><div class="event-meta">${esc(p.placeType||catOf(p).name)} · ${esc(distanceLabel(p))}</div><button class="event-title" data-open="${esc(p.id)}">${esc(p.title)}</button><p class="place-summary">${esc(p.description)}</p>${beer?`<span class="beer-price">${esc(beer)}</span>`:''}${first&&layer==='city'?`<p class="venue-program has-program">${esc(programmeLine(first))+(program.length>1?` · weitere ${program.length-1}`:'')}</p>`:''}</div><button class="bookmark ${kept?'saved':''}" data-place-save="${esc(p.id)}" aria-label="${kept?"Ort entfernen":"Ort speichern"}: ${esc(p.title)}">${icon(kept?'check':'bookmark')}</button></article>`;
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
 showDialog(`<div class="detail-content"><div class="eyebrow">${esc(p.placeType||catOf(p).name)} · ${esc(distanceLabel(p))}</div><h2>${esc(p.title)}</h2><p class="detail-description">${esc(p.description)}</p><div class="detail-facts"><div>${icon('pin')}${esc(p.address||"The place is marked on the map; no street address is provided.")}</div></div>${p.openingHours?`<p class="detail-description"><strong>Angegebene Öffnungszeiten:</strong> ${esc(p.openingHours)}</p>`:''}<p class="detail-disclaimer">${esc(p.openingNote||"Check opening hours and admission conditions before visiting.")}</p>
 ${p.menuReference?`<p class="detail-description">${esc(p.menuReference.text)} <a href="${safeUrl(p.menuReference.url)}" target="_blank" rel="noopener noreferrer">${esc(p.menuReference.source)} ↗</a></p>`:''}${NoreliDiscovery.hasCategory(p,'bar')||beer?`<div class="drink-budget"><strong>Bier ${beerText?'— '+esc(beerText):"an diesem Ort; Preis nicht angegeben"}</strong>${beer?`<p>${esc(beer.unit||"One glass; volume not specified")}${beer.menuDate?" · menu ab "+esc(beer.menuDate):''} · estimate based on the source, not a guaranteed menu price.</p><a href="${safeUrl(beer.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(beer.source)} ↗</a><small>Geprüft ${esc(beer.checkedAt.slice(0,10).split('-').reverse().join('.'))}. Tickets und Getränke werden separat bezahlt.</small>`:''}</div>`:''}
 <div class="source-links">${sourceLinks(p)}</div><div class="detail-actions"><button id="placeSave" class="primary-button">${savedPlaces.some(x=>x.id===p.id)?"✓ Ort gespeichert":"Ort speichern"}</button><a class="external-link" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(NoreliDiscovery.hasPoint(p)&&p.coordinatePrecision!=='postcode-centroid'?p.lat+','+p.lng:[p.title,p.address].filter(Boolean).join(', '))}&travelmode=walking" target="_blank" rel="noopener noreferrer">Walking directions ↗</a></div>
 ${program.length||weekly.length?`<section class="place-program">${program.length?`<h3>${showWeek?"Programm für verfügbare Termine":day===-1?"Programm für verfügbare Termine":"Programme · "+esc(dateLabel(dates[day]))}</h3>`:''}${program.length?program.slice(0,shown).map(e=>`<button data-open="${esc(e.id)}"><span>${esc(shortWhen(e))} · ${esc(timeLabel(e.time)||"Uhrzeit nicht bestätigt")} · ${priceText(e)}${e.soldOut?" · tickets ausverkauft":''}</span>${esc(e.title)} →</button>`).join(''):''}${program.length>shown?"<button id=\"moreProgramme\" class=\"text-button\">Mehr Veranstaltungen anzeigen</button>":''}${!showWeek&&day!==-1&&weekly.length?`<button id="weekProgramme" class="text-button">Full programme for the week · ${weekly.length} →</button>`:''}</section>`:''}
 <p class="detail-disclaimer">${p.provenance==='openstreetmap'?"This place comes ab OpenStreetMap. A point on the map does not confirm that the venue is open today. ":''}${p.sourceCheckedAt?"Letzte Verzeichnisprüfung: "+esc(p.sourceCheckedAt)+'. ':''}Entfernungen werden als Luftlinie gemessen. Der Fußweg kann länger sein.</p></div>`);
 $('#placeSave').onclick=()=>togglePlace(p.id);if($('#weekProgramme'))$('#weekProgramme').onclick=()=>openPlace(p,true);
 if($('#moreProgramme'))$('#moreProgramme').onclick=()=>openPlace(p,showWeek,shown+20);
};
showGroup=function(group){
 const isVenues=group.every(e=>e.kind==='place');showDialog(`<div class="detail-content"><div class="eyebrow">IN DIESEM BEREICH</div><h2>${isVenues?placeCount(group.length):eventCount(group.length)} in der Nähe</h2><p class="muted">Wähle einen Ort oder vergrößere die Karte.</p>${group.map(card).join('')}</div>`);
};
const showResultsBeforeDiscovery=showResults;
showResults=function(unknownOnly=false,shown=30){showResultsBeforeDiscovery(unknownOnly,shown);if(layer==='city'){$('#eventDetails .eyebrow').textContent="ORTE UND VERANSTALTUNGEN";$('#eventDetails h2').textContent="Wohin gehen?";}};
function showPeace(){
 $('.more-menu').open=false;
 showDialog("<div class=\"detail-content peace-note\"><div class=\"eyebrow\">OUR POSITION</div><h2>Für Frieden.</h2><p>We oppose war. We stand for human life, freedom and the chance bis live without fear.</p><p>This project helps people meet, enjoy music and films, and discover their city. Everyone should have the opportunity bis make peaceful plans.</p></div>");
}
document.querySelectorAll('[data-peace]').forEach(b=>b.onclick=showPeace);
const sourcesBeforeDiscovery=showSources;
showSources=function(){sourcesBeforeDiscovery();};
$('#sourcesButton').onclick=showSources;
start().then(()=>{const id=new URLSearchParams(location.search).get('place');const p=id&&places.find(p=>p.id===id);if(p&&map){if(NoreliDiscovery.hasPoint(p))map.setView([p.lat,p.lng],16);openPlace(p);}});
