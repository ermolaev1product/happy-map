// Two map modes: dated events and the whole city. Places never become fabricated events.
categories.push({id:'art',name:"Umetnost i izložbe",icon:'spark',color:'#ad7955',bg:'#f8edde'},
 {id:'cafe',name:"Kafići",icon:'wine',color:'#9b7652',bg:'#f4eee6'},
 {id:'food',name:"Hrana",icon:'wine',color:'#a47a50',bg:'#f5edde'},
 {id:'nightlife',name:"Noćni život",icon:'music',color:'#876ab2',bg:'#f0e8f8'},
 {id:'books',name:"Knjige",icon:'talk',color:'#648d73',bg:'#e7f0e7'},
 {id:'park',name:"Na otvorenom",icon:'spark',color:'#648d73',bg:'#e7f0e7'});
let venueIndex=null,withProgram=false,programMemo=new Map();
const selectedDays=selectedCityDates;
const programFor=p=>programMemo.get(p.id)||[];
const weekProgram=p=>NoreliDiscovery.program(p.id,venueIndex?.programmes||new Map(),catalogDates);
const distanceLabel=e=>{const d=distance(e);return Number.isFinite(d)?(d<1?Math.max(10,Math.round(d*1000/10)*10)+' m':d.toFixed(1)+' km')+" udaljenost vazdušnom linijom":"Adresa nije potvrđena";};
const shortWhen=e=>e.endDate?"Do "+shortDate(e.endDate):e.date===today()?"Danas":e.date===dates[1]?"Sutra":shortDate(e.date);
function programmeLine(e){return `${shortWhen(e)}${e.time?' · '+timeLabel(e.time):''} — ${e.title}`;}
async function loadPlaces(){
 const result=await window.HappyMapCatalog.load(cityFolder?cityFolder.replace(/\/$/,''):'tbilisi','places',document.documentElement.lang,{legacyCachePrefix:nearKey});
 return Array.isArray(result.data)?result.data:result.data.places;
}

const initMapBeforeDiscovery=initMap;
initMap=function(){
 venueIndex=NoreliDiscovery.connect(places,events);places=venueIndex.places;for(const p of places){if(p.fromEvents){const e=(venueIndex.programmes.get(p.id)||[])[0];p.description="Mesto iz najava događaja. Njegov provereni program sa datumima prikazan je ispod.";p.coordinatePrecision=e?.coordinatePrecision;p.website=e?.primarySourceUrl||e?.sourceUrl;p.currency='GBP';}if(p.coordinatePrecision==='postcode-centroid')p.openingNote="Oznaka prikazuje područje poštanskog broja, a ne proveren ulaz. Koristi navedenu adresu i proveri radno vreme.";}
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
 if(!isAndroid){const statusText=$('#catalogStatus span');statusText.textContent="Događaji · "+(catalog.generatedAt||'').slice(0,10).split('-').reverse().join('.')+(today()>catalog.endDate?" · potrebne su nove najave":'');statusText.title="Obuhvaćeno do "+catalog.endDate+"; učitava objavljeni izbor pri pokretanju";}
 const nearby=layer==='city'&&view!=='plans',list=visible();document.body.classList.toggle('nearby-view',nearby);
 for(const [id,on] of [['eventsLayer',layer==='events'],['cityLayer',layer==='city']]){
  $('#'+id).classList.toggle('active',on);$('#'+id).setAttribute('aria-pressed',String(on));
 }
 const ruMenu=document.documentElement.lang==='ru';
 const modeCopy=false?{city:'Ganze Stadt',saved:'Gespeicherte Orte',description:'Alle Orte und Veranstaltungen der Stadt'}:true?{city:"Ceo grad",saved:"Sačuvana mesta",description:"Sva mesta u gradu i njihovi događaji"}:{city:"Ceo grad",saved:"Sačuvana mesta",description:"Sva mesta u gradu i njihovi događaji"};
 $('#cityLayer').textContent=view==='plans'?modeCopy.saved:modeCopy.city;
 $('#cityLayer').title=view==='plans'?modeCopy.saved:modeCopy.description;
 $('#programOnly').hidden=!nearby;
 $('#programOnly').setAttribute('aria-pressed',String(withProgram));
 $('#mobileList').textContent=nearby?"Lista":layer==='city'?"Mesta":"Događaji";
 if(nearby){
  const pool=[...places,...events];
  const order=['all','bar','film','music','theatre','art','cafe','food','nightlife','games','books','market','park','talk','space','kids','sport','workshop','city','other'];
  $('#categories').innerHTML=order.map(id=>categories.find(c=>c.id===id)).filter(c=>c&&(c.id==='all'||pool.some(p=>NoreliDiscovery.hasCategory(p,c.id)))).map(c=>`<button class="category ${c.id===category?'active':''}" data-category="${c.id}" aria-pressed="${c.id===category}">${icon(c.icon)}${c.name}</button>`).join('');
  $('#categories').querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;limit=18;render();});
  $('#listTitle').textContent=withProgram?"Mesta sa događajima":"Gde otići";
  const scheduled=list.filter(p=>programFor(p).length).length;
  $('#resultCount').textContent=`${placeCount(list.filter(p=>p.kind==='place').length)} · ${scheduled} sa događajima${list.some(p=>p.kind!=='place')?' · '+eventCount(list.filter(p=>p.kind!=='place').length):''}`;
  if(!radius)$('#mapLabel').textContent=`${placeCount(list.length)} · lista →`;
  $('#mapResults').setAttribute('aria-label',"Otvori listu: "+placeCount(list.length));
  $('#mapPlanButton').hidden=true;$('#sortButton').hidden=true;
  $('#mapEmpty').querySelector('p').textContent="Probajte drugi dan ili kategoriju.";
 }
 const note=$('#discoveryNote');note.hidden=view==='plans'||layer==='events';
 note.textContent=nearby?(ruMenu?"Mesta i događaji zajedno. Prvo se prikazuju mesta sa događajima u izabranim datumima. Krug ističe mesta u blizini.":"Mesta i događaji zajedno. Prvo se prikazuju mesta sa događajima u izabranim datumima. Krug ističe mesta u blizini."):(ruMenu?"Kafići, barovi i druga mesta, nezavisno od datuma događaja.":"Kafići, barovi i druga mesta, nezavisno od datuma događaja.");
 if(!list.length&&view!=='plans'){
  const sourceCity=cityFolder==='belgrade/'?'belgrade':cityFolder==='moscow/'?'moscow':cityFolder==='london/'?'london':'tbilisi';
  const alternatives=`<div class="empty-alternatives">${layer==='events'?"<button type=\"button\" class=\"text-button\" data-empty-places>Mesta iz ove kategorije širom grada →</button>":''}${layer==='events'&&day!==-1?"<button type=\"button\" class=\"text-button\" data-empty-week>Pregledaj sve datume događaja →</button>":''}<a class="text-button" href="/sr/london/sources.html">Proveri lokalne izvore ↗</a></div>`;
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
 return `<article class="event-row place-row"><button data-open="${esc(p.id)}" aria-label="${esc(p.title)}">${poster(p)}</button><div class="event-info"><div class="event-meta">${esc(p.placeType||catOf(p).name)} · ${esc(distanceLabel(p))}</div><button class="event-title" data-open="${esc(p.id)}">${esc(p.title)}</button><p class="place-summary">${esc(p.description)}</p>${beer?`<span class="beer-price">${esc(beer)}</span>`:''}${first&&layer==='city'?`<p class="venue-program has-program">${esc(programmeLine(first))+(program.length>1?` · još ${program.length-1}`:'')}</p>`:''}</div><button class="bookmark ${kept?'saved':''}" data-place-save="${esc(p.id)}" aria-label="${kept?"Ukloni mesto":"Sačuvaj mesto"}: ${esc(p.title)}">${icon(kept?'check':'bookmark')}</button></article>`;
};
function sourceLinks(p){
 return [...new Set([p.website,p.sourceUrl,...(p.sourceURLs||[])].filter(Boolean))].filter(u=>safeUrl(u)).slice(0,6).map(u=>{
  let name;try{name=new URL(u).hostname.replace(/^www\./,'');}catch{return '';}
  return `<a class="external-link" href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a>`;
 }).join('');
}
openPlace=function(p,showWeek=false,shown=12){
 const daily=programFor(p),weekly=weekProgram(p),program=showWeek?weekly:daily,beer=p.beerPrice;
 const beerText=beer?`${beer.min}${beer.max?'–'+beer.max:'+'} ${beer.currency||'GBP'}`:null;
 showDialog(`<div class="detail-content"><div class="eyebrow">${esc(p.placeType||catOf(p).name)} · ${esc(distanceLabel(p))}</div><h2>${esc(p.title)}</h2><p class="detail-description">${esc(p.description)}</p><div class="detail-facts"><div>${icon('pin')}${esc(p.address||"Lokacija je označena na mapi; adresa nije navedena.")}</div></div>${p.openingHours?`<p class="detail-description"><strong>Navedeno radno vreme:</strong> ${esc(p.openingHours)}</p>`:''}<p class="detail-disclaimer">${esc(p.openingNote||"Proveri radno vreme i uslove ulaska pre posete.")}</p>
 ${p.menuReference?`<p class="detail-description">${esc(p.menuReference.text)} <a href="${safeUrl(p.menuReference.url)}" target="_blank" rel="noopener noreferrer">${esc(p.menuReference.source)} ↗</a></p>`:''}${NoreliDiscovery.hasCategory(p,'bar')||beer?`<div class="drink-budget"><strong>Pivo ${beerText?'— '+esc(beerText):"na ovom mestu: cena nije navedena"}</strong>${beer?`<p>${esc(beer.unit||"Jedna čaša; zapremina nije navedena")}${beer.menuDate?" · meni od "+esc(beer.menuDate):''} · procena na osnovu izvora, a ne garantovana cena iz menija.</p><a href="${safeUrl(beer.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(beer.source)} ↗</a><small>Provereno ${esc(beer.checkedAt.slice(0,10).split('-').reverse().join('.'))}. Ulaznice i piće plaćaju se odvojeno.</small>`:''}</div>`:''}
 <div class="source-links">${sourceLinks(p)}</div><div class="detail-actions"><button id="placeSave" class="primary-button">${savedPlaces.some(x=>x.id===p.id)?"✓ Mesto je sačuvano":"Sačuvaj mesto"}</button><a class="external-link" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(NoreliDiscovery.hasPoint(p)&&p.coordinatePrecision!=='postcode-centroid'?p.lat+','+p.lng:[p.title,p.address].filter(Boolean).join(', '))}&travelmode=walking" target="_blank" rel="noopener noreferrer">Pešačka ruta ↗</a></div>
 ${program.length||weekly.length?`<section class="place-program">${program.length?`<h3>${showWeek?"Program za dostupne datume":day===-1?"Program za dostupne datume":'Program · '+esc(dateLabel(dates[day]))}</h3>`:''}${program.length?program.slice(0,shown).map(e=>`<button data-open="${esc(e.id)}"><span>${esc(shortWhen(e))} · ${esc(timeLabel(e.time)||"Vreme nije potvrđeno")} · ${priceText(e)}${e.soldOut?" · rasprodato":''}</span>${esc(e.title)} →</button>`).join(''):''}${program.length>shown?"<button id=\"moreProgramme\" class=\"text-button\">Prikaži još događaja</button>":''}${!showWeek&&day!==-1&&weekly.length?`<button id="weekProgramme" class="text-button">Ceo nedeljni program · ${weekly.length} →</button>`:''}</section>`:''}
 <p class="detail-disclaimer">${p.provenance==='openstreetmap'?"Ovo mesto potiče sa OpenStreetMap-a. Oznaka na mapi ne potvrđuje da je mesto danas otvoreno. ":''}${p.sourceCheckedAt?"Poslednja provera imenika: "+esc(p.sourceCheckedAt)+'. ':''}Udaljenost se meri vazdušnom linijom. Pešačka ruta može biti duža.</p></div>`);
 $('#placeSave').onclick=()=>togglePlace(p.id);if($('#weekProgramme'))$('#weekProgramme').onclick=()=>openPlace(p,true);
 if($('#moreProgramme'))$('#moreProgramme').onclick=()=>openPlace(p,showWeek,shown+20);
};
showGroup=function(group){
 const isVenues=group.every(e=>e.kind==='place');showDialog(`<div class="detail-content"><div class="eyebrow">U OVOM PODRUČJU</div><h2>${isVenues?placeCount(group.length):eventCount(group.length)} u blizini</h2><p class="muted">Izaberi mesto ili uvećaj mapu.</p>${group.map(card).join('')}</div>`);
};
const showResultsBeforeDiscovery=showResults;
showResults=function(unknownOnly=false,shown=30){showResultsBeforeDiscovery(unknownOnly,shown);if(layer==='city'){$('#eventDetails .eyebrow').textContent="MESTA I DOGAĐAJI";$('#eventDetails h2').textContent="Gde otići";}};
function showPeace(){
 $('.more-menu').open=false;
 showDialog("<div class=\"detail-content peace-note\"><div class=\"eyebrow\">ZA ŠTA SE ZALAŽEMO</div><h2>Za mir.</h2><p>Protiv smo rata, a za ljudski život, slobodu i pravo da živimo bez straha.</p><p>Ovaj projekat pomaže ljudima da se upoznaju, slušaju muziku, gledaju filmove i istražuju svoj grad. Svako zaslužuje da pravi planove u miru.</p></div>");
}
document.querySelectorAll('[data-peace]').forEach(b=>b.onclick=showPeace);
const sourcesBeforeDiscovery=showSources;
showSources=function(){sourcesBeforeDiscovery();};
$('#sourcesButton').onclick=showSources;
start().then(()=>{const id=new URLSearchParams(location.search).get('place');const p=id&&places.find(p=>p.id===id);if(p&&map){if(NoreliDiscovery.hasPoint(p))map.setView([p.lat,p.lng],16);openPlace(p);}});
