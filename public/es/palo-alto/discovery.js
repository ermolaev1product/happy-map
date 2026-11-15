// Two map modes: dated events and the whole city. Places never become fabricated events.
categories.push({id:'art',name:"Arte y exposiciones",icon:'spark',color:'#ad7955',bg:'#f8edde'},
 {id:'cafe',name:"Cafeterías",icon:'wine',color:'#9b7652',bg:'#f4eee6'},
 {id:'food',name:"Comida",icon:'wine',color:'#a47a50',bg:'#f5edde'},
 {id:'nightlife',name:"Vida nocturna",icon:'music',color:'#876ab2',bg:'#f0e8f8'},
 {id:'books',name:"Libros",icon:'talk',color:'#648d73',bg:'#e7f0e7'},
 {id:'park',name:"Al aire libre",icon:'spark',color:'#648d73',bg:'#e7f0e7'});
let venueIndex=null,withProgram=false,programMemo=new Map();
const selectedDays=selectedPaloDates;
const programFor=p=>programMemo.get(p.id)||[];
const weekProgram=p=>NoreliDiscovery.program(p.id,venueIndex?.programmes||new Map(),catalogDates);
const distanceLabel=e=>{const d=distance(e);return Number.isFinite(d)?(d<1?Math.max(10,Math.round(d*1000/10)*10)+' m':d.toFixed(1)+' km')+" distancia en línea recta":"Dirección sin confirmar";};
const shortWhen=e=>e.endDate?"Hasta "+shortDate(e.endDate):e.date===today()?"Hoy":e.date===dates[1]?"Mañana":shortDate(e.date);
function programmeLine(e){return `${shortWhen(e)}${e.time?' · '+timeLabel(e.time):''} — ${e.title}`;}
async function loadPlaces(){
 const result=await window.HappyMapCatalog.load(cityFolder?cityFolder.replace(/\/$/,''):'tbilisi','places',document.documentElement.lang,{legacyCachePrefix:nearKey});
 return Array.isArray(result.data)?result.data:result.data.places;
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
  if(!remembered){position=[41.7011268,44.7962925];positionLabel='Opera area';radius=1;}
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
    (time==='all'||e.time&&(time==='day'?e.time<'18:00':e.time>='18:00'))&&(language==='all'||(e.language||'').includes(language)));
   programMemo.set(id,filtered);
  }
 }
 renderBeforeDiscovery();if(!catalog)return;
 if(!isAndroid){const statusText=$('#catalogStatus span');statusText.textContent="Eventos · "+(catalog.generatedAt||'').slice(0,10).split('-').reverse().join('.')+(today()>catalog.endDate?" · se necesitan nuevos anuncios":'');statusText.title="Cobertura hasta "+catalog.endDate+"; carga la selección publicada al abrirse";}
 const nearby=layer==='city'&&view!=='plans',list=visible();document.body.classList.toggle('nearby-view',nearby);
 for(const [id,on] of [['eventsLayer',layer==='events'],['cityLayer',layer==='city']]){
  $('#'+id).classList.toggle('active',on);$('#'+id).setAttribute('aria-pressed',String(on));
 }
 const ruMenu=document.documentElement.lang==='ru';
 const modeCopy=false?{city:'Ganze Stadt',saved:'Gespeicherte Orte',description:'Alle Orte und Veranstaltungen der Stadt'}:true?{city:"Toda la ciudad",saved:"Lugares guardados",description:"Todos los lugares de la ciudad y sus eventos"}:{city:"Toda la ciudad",saved:"Lugares guardados",description:"Todos los lugares de la ciudad y sus eventos"};
 $('#cityLayer').textContent=view==='plans'?modeCopy.saved:modeCopy.city;
 $('#cityLayer').title=view==='plans'?modeCopy.saved:modeCopy.description;
 $('#programOnly').hidden=!nearby;
 $('#programOnly').setAttribute('aria-pressed',String(withProgram));
 $('#mobileList').textContent=nearby?"Lista":layer==='city'?"Lugares":"Eventos";
 if(nearby){
  const pool=[...places,...events];
  const order=['all','bar','film','music','theatre','art','cafe','food','nightlife','games','books','market','park','talk','space','kids','sport','workshop','city','other'];
  $('#categories').innerHTML=order.map(id=>categories.find(c=>c.id===id)).filter(c=>c&&(c.id==='all'||pool.some(p=>NoreliDiscovery.hasCategory(p,c.id)))).map(c=>`<button class="category ${c.id===category?'active':''}" data-category="${c.id}" aria-pressed="${c.id===category}">${icon(c.icon)}${c.name}</button>`).join('');
  $('#categories').querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;limit=18;render();});
  $('#listTitle').textContent=withProgram?"Lugares con eventos":"Dónde ir";
  const scheduled=list.filter(p=>programFor(p).length).length;
  $('#resultCount').textContent=`${placeCount(list.filter(p=>p.kind==='place').length)} · ${scheduled} con eventos${list.some(p=>p.kind!=='place')?' · '+eventCount(list.filter(p=>p.kind!=='place').length):''}`;
  if(!radius)$('#mapLabel').textContent=`${placeCount(list.length)} · lista →`;
  $('#mapResults').setAttribute('aria-label',"Abrir lista: "+placeCount(list.length));
  $('#mapPlanButton').hidden=true;$('#sortButton').hidden=true;
  $('#mapEmpty').querySelector('p').textContent="Prueba otro día u otra categoría.";
 }
 const note=$('#discoveryNote');note.hidden=view==='plans'||layer==='events';
 note.textContent=nearby?(ruMenu?"Lugares y eventos juntos. Primero aparecen los locales con eventos en las fechas elegidas. El círculo destaca los lugares cercanos.":"Lugares y eventos juntos. Primero aparecen los locales con eventos en las fechas elegidas. El círculo destaca los lugares cercanos."):(ruMenu?"Cafeterías, bares y otros lugares, independientemente de las fechas de los eventos.":"Cafeterías, bares y otros lugares, independientemente de las fechas de los eventos.");
 if(!list.length&&view!=='plans'){
  const sourceCity=cityFolder==='belgrade/'?'belgrade':cityFolder==='moscow/'?'moscow':cityFolder==='palo-alto/'?'palo-alto':'tbilisi';
  const alternatives=`<div class="empty-alternatives">${layer==='events'?"<button type=\"button\" class=\"text-button\" data-empty-places>Lugares de esta categoría en toda la ciudad →</button>":''}${layer==='events'&&day!==-1?"<button type=\"button\" class=\"text-button\" data-empty-week>Ver todas las fechas de eventos →</button>":''}<a class="text-button" href="/es/palo-alto/sources.html">Consultar fuentes locales ↗</a></div>`;
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
 return `<article class="event-row place-row"><button data-open="${esc(p.id)}" aria-label="${esc(p.title)}">${poster(p)}</button><div class="event-info"><div class="event-meta">${esc(p.placeType||catOf(p).name)} · ${esc(distanceLabel(p))}</div><button class="event-title" data-open="${esc(p.id)}">${esc(p.title)}</button><p class="place-summary">${esc(p.description)}</p>${beer?`<span class="beer-price">${esc(beer)}</span>`:''}${first&&layer==='city'?`<p class="venue-program has-program">${esc(programmeLine(first))+(program.length>1?` · más ${program.length-1}`:'')}</p>`:''}</div><button class="bookmark ${kept?'saved':''}" data-place-save="${esc(p.id)}" aria-label="${kept?"Quitar lugar":"Guardar lugar"}: ${esc(p.title)}">${icon(kept?'check':'bookmark')}</button></article>`;
};
function sourceLinks(p){
 return [...new Set([p.website,p.sourceUrl,...(p.sourceURLs||[])].filter(Boolean))].filter(u=>safeUrl(u)).slice(0,6).map(u=>{
  let name;try{name=new URL(u).hostname.replace(/^www\./,'');}catch{return '';}
  return `<a class="external-link" href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a>`;
 }).join('');
}
openPlace=function(p,showWeek=false,shown=12){
 const daily=programFor(p),weekly=weekProgram(p),program=showWeek?weekly:daily,beer=p.beerPrice;
 const beerText=beer?`${beer.min}${beer.max?'–'+beer.max:'+'} ${beer.currency==='USD'?'USD':beer.currency==='RSD'?'RSD':'₾'}`:null;
 showDialog(`<div class="detail-content"><div class="eyebrow">${esc(p.placeType||catOf(p).name)} · ${esc(distanceLabel(p))}</div><h2>${esc(p.title)}</h2><p class="detail-description">${esc(p.description)}</p><div class="detail-facts"><div>${icon('pin')}${esc(p.address||"La ubicación está marcada en el mapa; no se indica la dirección.")}</div></div>${p.openingHours?`<p class="detail-description"><strong>Horario indicado:</strong> ${esc(p.openingHours)}</p>`:''}<p class="detail-disclaimer">${esc(p.openingNote||"Consulta el horario y las condiciones de entrada antes de ir.")}</p>
 ${p.menuReference?`<p class="detail-description">${esc(p.menuReference.text)} <a href="${safeUrl(p.menuReference.url)}" target="_blank" rel="noopener noreferrer">${esc(p.menuReference.source)} ↗</a></p>`:''}${NoreliDiscovery.hasCategory(p,'bar')||beer?`<div class="drink-budget"><strong>Cerveza ${beerText?'— '+esc(beerText):"en este lugar: precio no indicado"}</strong>${beer?`<p>${esc(beer.unit||"Una copa; cantidad no indicada")}${beer.menuDate?" · carta del "+esc(beer.menuDate):''} · una estimación basada en fuentes, no un precio garantizado.</p><a href="${safeUrl(beer.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(beer.source)} ↗</a><small>Verificado ${esc(beer.checkedAt.slice(0,10).split('-').reverse().join('.'))}. Las entradas y las bebidas se pagan por separado.</small>`:''}</div>`:''}
 <div class="source-links">${sourceLinks(p)}</div><div class="detail-actions"><button id="placeSave" class="primary-button">${savedPlaces.some(x=>x.id===p.id)?"✓ Lugar guardado":"Guardar lugar"}</button><a class="external-link" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(NoreliDiscovery.hasPoint(p)?p.lat+','+p.lng:[p.title,p.address].filter(Boolean).join(', '))}&travelmode=walking" target="_blank" rel="noopener noreferrer">Ruta a pie ↗</a></div>
 ${program.length||weekly.length?`<section class="place-program">${program.length?`<h3>${showWeek?"Programación de las fechas disponibles":day===-1?"Programación de las fechas disponibles":"Programación · "+esc(dateLabel(dates[day]))}</h3>`:''}${program.length?program.slice(0,shown).map(e=>`<button data-open="${esc(e.id)}"><span>${esc(shortWhen(e))} · ${esc(timeLabel(e.time)||"Hora sin confirmar")} · ${priceText(e)}${e.soldOut?" · agotado":''}</span>${esc(e.title)} →</button>`).join(''):''}${program.length>shown?"<button id=\"moreProgramme\" class=\"text-button\">Mostrar más eventos</button>":''}${!showWeek&&day!==-1&&weekly.length?`<button id="weekProgramme" class="text-button">Programación semanal completa · ${weekly.length} →</button>`:''}</section>`:''}
 <p class="detail-disclaimer">${p.provenance==='openstreetmap'?"Este lugar procede de OpenStreetMap. Un marcador no confirma que el establecimiento esté abierto hoy. ":''}${p.sourceCheckedAt?"Última revisión del directorio: "+esc(p.sourceCheckedAt)+'. ':''}La distancia se mide en línea recta. La ruta a pie puede ser más larga.</p></div>`);
 $('#placeSave').onclick=()=>togglePlace(p.id);if($('#weekProgramme'))$('#weekProgramme').onclick=()=>openPlace(p,true);
 if($('#moreProgramme'))$('#moreProgramme').onclick=()=>openPlace(p,showWeek,shown+20);
};
showGroup=function(group){
 const isVenues=group.every(e=>e.kind==='place');showDialog(`<div class="detail-content"><div class="eyebrow">EN ESTA ZONA</div><h2>${isVenues?placeCount(group.length):eventCount(group.length)} cerca</h2><p class="muted">Elige un lugar o amplía el mapa.</p>${group.map(card).join('')}</div>`);
};
const showResultsBeforeDiscovery=showResults;
showResults=function(unknownOnly=false,shown=30){showResultsBeforeDiscovery(unknownOnly,shown);if(layer==='city'){$('#eventDetails .eyebrow').textContent="LUGARES Y EVENTOS";$('#eventDetails h2').textContent="Dónde ir";}};
function showPeace(){
 $('.more-menu').open=false;
 showDialog("<div class=\"detail-content peace-note\"><div class=\"eyebrow\">NUESTROS VALORES</div><h2>Por la paz.</h2><p>Estamos en contra de la guerra y a favor de la vida, la libertad y el derecho a vivir sin miedo.</p><p>Este proyecto ayuda a las personas a encontrarse, escuchar música, ver películas y descubrir su ciudad. Todas las personas merecen poder hacer planes en paz.</p></div>");
}
document.querySelectorAll('[data-peace]').forEach(b=>b.onclick=showPeace);
const sourcesBeforeDiscovery=showSources;
showSources=function(){sourcesBeforeDiscovery();};
$('#sourcesButton').onclick=showSources;
start().then(()=>{const id=new URLSearchParams(location.search).get('place');const p=id&&places.find(p=>p.id===id);if(p&&map){if(NoreliDiscovery.hasPoint(p))map.setView([p.lat,p.lng],16);openPlace(p);}});
