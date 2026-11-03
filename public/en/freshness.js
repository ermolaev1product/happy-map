// Dates follow the selected city's clock. Data refreshes independently of APK releases.
(()=>{
 let busy=false,lastAttempt=Date.now(),refreshDialog=null;
 // Keep open result/group/venue-programme lists in step with the map without altering saved events.
 if(typeof showDialog==='function'){
  const original=showDialog;showDialog=function(...args){refreshDialog=null;return original(...args);};
  // Keep an already-open detail readable as history, but never imply it is still in discovery.
  // Saved records and their actual event times are left intact.
  if(typeof openEvent==='function'){
   const original=openEvent;
   function markPast(id){
    const e=eventById(id);if(!e||e.kind==='place')return;
    const end=NoreliDiscovery.visibilityEnd(e,e.date>today()?e.date:today());
    if(!Number.isFinite(end.at)||Date.now()<end.at)return;
    const content=$('#eventDetails .detail-content');if(!content||$('#arrivalDeadlineNotice'))return;
    const note=document.createElement('p');note.id='arrivalDeadlineNotice';note.className='detail-disclaimer';note.setAttribute('role','status');
    const lang=document.documentElement.lang;
    note.textContent=lang==='de'?'Nicht mehr in der aktuellen Übersicht. Einzeltermine werden eine Stunde nach Beginn ausgeblendet, oder früher, wenn sie enden. Die gespeicherten Veranstaltungsdaten bleiben erhalten.':lang==='en'?'No longer in current listings. Individual sessions are hidden one hour after the start, or earlier if they end. Saved event details are kept.':"No longer in current listings. Individual sessions are hidden one hour after the start, or earlier if they end. Saved event details are kept.";
    content.prepend(note);
   }
   openEvent=function(id){original(id);if(eventById(id)?.kind==='place')return;markPast(id);refreshDialog=()=>markPast(id);};
  }
  if(typeof showResults==='function'){const original=showResults;showResults=function(...args){original(...args);refreshDialog=()=>showResults(...args);};}
  if(typeof openPlace==='function'){const original=openPlace;openPlace=function(place,...args){original(place,...args);refreshDialog=()=>openPlace(eventById(place.id)||place,...args);};}
  if(typeof showGroup==='function'){const original=showGroup;showGroup=function(group){original(group);refreshDialog=()=>showGroup(group.map(e=>eventById(e.id)||e).filter(e=>e.kind==='place'||selectedDays().some(d=>NoreliDiscovery.availableOnDate(e,d))));};}
 }
 function refreshVisibility(){
  render();
  const dialog=$('#eventDialog');
  if(dialog?.open&&refreshDialog){const details=$('#eventDetails'),scroll=dialog.scrollTop,detailsScroll=details?.scrollTop;refreshDialog();dialog.scrollTop=scroll;if(details)details.scrollTop=detailsScroll;}
 }
 function rollCalendar(){
  if(!catalog||!dates.length)return false;
  const current=today();
  if(dates[0]===current)return false;
  const selected=day<0?null:dates[day],followToday=day===0;
  dates=Array.from({length:7},(_,i)=>new Date(Date.parse(current+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
  day=day<0?-1:followToday?0:Math.max(0,dates.indexOf(selected));
  if(typeof catalogDates!=='undefined')catalogDates=Array.from({length:Math.max(7,Math.min(14,Math.floor((Date.parse(catalog.endDate+'T12:00:00Z')-Date.parse(current+'T12:00:00Z'))/86400000)+1))},(_,i)=>new Date(Date.parse(current+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
  const label=$('.month-label'),caption=label?.querySelector('.week-caption')?.outerHTML||'';
  if(label)label.innerHTML=new Date(current+'T12:00:00Z').toLocaleDateString(document.documentElement.lang||'ru',{month:'long',timeZone:'UTC'})+' <span>'+current.slice(0,4)+'</span>'+caption;
  if($('#organizerDay'))$('#organizerDay').innerHTML=dates.map(d=>`<option>${d}</option>`).join('');
  refreshVisibility();return true;
 }
 async function refresh(force=false){
  if(document.hidden)return;
  const rolled=rollCalendar();
  if(catalog&&!rolled)refreshVisibility();
  if(busy)return;
  if(!catalog||!force&&!rolled&&Date.now()-lastAttempt<60000)return;
  busy=true;lastAttempt=Date.now();
  try{
   const next=await loadCatalog();
   catalog=next;
   events=next.events.map(e=>({...e,category:({cinema:'film',concert:'music',concerts:'music',festival:'city',lecture:'talk',classical:'music',party:'music'})[e.category]||e.category}));
   try{places=(await loadPlaces()).map(p=>({...p,kind:'place'}));}catch{}
   if(typeof venueIndex!=='undefined'){venueIndex=NoreliDiscovery.connect(places,events);places=venueIndex.places;}
   refreshVisibility();
  }catch{}finally{busy=false;}
 }
 window.happyMapRefresh=()=>refresh(true);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true);});
 window.addEventListener('pageshow',()=>refresh(true));
 window.addEventListener('online',()=>refresh(true));
 setInterval(()=>refresh(),60000);
})();
