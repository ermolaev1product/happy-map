/* Places are independent of dated events. A missing programme never means a closed venue. */
const NoreliDiscovery = (() => {
 const normalize=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const hasCategory=(p,c)=>c==='all'||p.category===c||(p.categories||[]).includes(c);
 const hasPoint=e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng);
 const apart=(a,b)=>hasPoint(a)&&hasPoint(b)?Math.hypot((a.lat-b.lat)*111.2,(a.lng-b.lng)*83.1):Infinity;
 function onDate(e,date){return e.publicationStatus!=='held_for_recheck'&&!e.cancelled&&e.status!=='cancelled'&&!(e.closedDates||[]).includes(date)&&(!e.cinemaSession||e.date===date)&&e.date<=date&&(e.endDate||e.date)>=date&&!(e.closedWeekdays||[]).includes(new Date(date+'T12:00:00Z').getUTCDay());}
 // Visibility deadlines are presentation policy, never written back as event facts.
 const ARRIVAL_WINDOW_MS=60*60*1000,DISCUSSION_GRACE_MS=60*60*1000;
 let defaultTimeZone='Asia/Tbilisi';
 const formatters=new Map(),wallCache=new Map();
 function setTimeZone(zone){new Intl.DateTimeFormat('en',{timeZone:zone});defaultTimeZone=zone;}
 function localParts(value,zone){
  if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));
  const p=Object.fromEntries(formatters.get(zone).formatToParts(new Date(value)).map(x=>[x.type,x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}:${p.second}`};
 }
 const nextDate=date=>new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 const clockTime=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)?value:null;
 // IANA offsets are resolved for this date, not today's offset or the visitor's zone.
 // A repeated DST hour uses the earlier start and later end; a missing hour shifts forward.
 function wallInstant(date,time,zone,end=false){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!clockTime(time))return NaN;
  const key=[date,time,zone,end].join('|');if(wallCache.has(key))return wallCache.get(key);
  const target=Date.parse(date+'T'+time+(time.length===5?':00':'')+'Z');
  const candidates=[-86400000,0,86400000].map(delta=>{
   const sample=target+delta,p=localParts(sample,zone);
   const offset=Date.parse(p.date+'T'+p.time+'Z')-sample;
   return target-offset;
  });
  const matches=[...new Set(candidates)].filter(n=>{const p=localParts(n,zone);return Date.parse(p.date+'T'+p.time+'Z')===target;}).sort((a,b)=>a-b);
  const result=matches.length?(end?matches.at(-1):matches[0]):Math.max(...candidates);
  if(wallCache.size>20000)wallCache.clear();wallCache.set(key,result);return result;
 }
 function instant(value,zone,end=false){
  if(typeof value!=='string')return NaN;
  if(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value))return Date.parse(value);
  const m=value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)/);
  return m?wallInstant(m[1],m[2],zone,end):NaN;
 }
 function occurrence(e,date){
  if(e.visitSchedule)return e.visitSchedule[date]||null;
  if(e.dailySchedule)return e.dailySchedule.find(s=>s.date===date)||null;
  const hours=e.visitingHours;
  if(hours&&(!hours.weekdays||hours.weekdays.includes(new Date(date+'T12:00:00Z').getUTCDay())))return hours;
  // Ongoing exhibitions' time/end fields are daily visiting hours, not one months-long session.
  if(e.ongoing||e.scheduleType==='daily_opening_hours')return {start:e.time,end:e.end||e.endTime};
  return undefined;
 }
 function scheduleEnd(e,date,zone=defaultTimeZone){
  const visit=occurrence(e,date),recurring=visit!==undefined;
  if(visit===null)return {at:NaN,reason:'no-visit'};
  const startTime=clockTime(recurring?(visit.start||visit.time):e.time);
  const endTime=clockTime(recurring?(visit.end||visit.endTime):(e.end||e.endTime));
  const start=recurring?wallInstant(date,startTime,zone):instant(e.startAt||e.startDateTime,zone);
  const startsAt=Number.isFinite(start)?start:wallInstant(recurring?date:e.date,startTime,zone);
  if(!recurring){
   const actual=instant(e.endAt||e.endDateTime,zone,true);
   if(Number.isFinite(actual)&&(!Number.isFinite(startsAt)||actual>startsAt))return {at:actual+(e.endTimeEstimated?DISCUSSION_GRACE_MS:0),reason:e.endTimeEstimated?'estimated-end-grace':'published-end'};
  }
  if(endTime){
   let endDate=recurring?date:(e.endDate||e.date);
   if(endDate===(recurring?date:e.date)&&startTime&&endTime<startTime)endDate=nextDate(endDate);
   const at=wallInstant(endDate,endTime,zone,true);
   if(Number.isFinite(at)&&(!Number.isFinite(startsAt)||at>startsAt))return {at:at+(e.endTimeEstimated?DISCUSSION_GRACE_MS:0),reason:e.endTimeEstimated?'estimated-end-grace':recurring?'visiting-hours':'published-end'};
  }
  // A multi-day listing without daily hours retains its published date range.
  if(!recurring&&e.endDate>e.date)return {at:wallInstant(nextDate(e.endDate),'00:00',zone,true),reason:'date-range'};
  const duration=Number(e.durationMinutes||e.duration);
  if(Number.isFinite(startsAt)&&duration>0)return {at:startsAt+duration*60000,reason:'published-duration'};
  // An explicitly source-reviewed programme is a dated listing, never a claim of live admission.
  // Keep unknown ending time unknown; published end/duration above always takes precedence.
  if(e.listingPolicy==='dated_programme'&&typeof e.listingPolicySource==='string'&&e.listingPolicySource.startsWith('https://'))return {at:wallInstant(nextDate(e.date),'00:00',zone,true),reason:'dated-programme'};
  // Unknown visiting hours are not a claim that a venue is open now.
  if(!recurring&&Number.isFinite(startsAt))return {at:startsAt+ARRIVAL_WINDOW_MS,reason:'arrival-cutoff'};
  // No known start: retain through the selected local date rather than inventing a start time.
  return {at:wallInstant(nextDate(recurring?date:e.date),'00:00',zone,true),reason:'unknown-hours'};
 }
 // A discovery arrival deadline is distinct from the event's actual finishing time.
 // One-off sessions stop accepting discovery after one elapsed hour, even with a long known end.
 function arrivalDeadline(e,zone=e.timezone||defaultTimeZone){
  if(e.kind==='place'||occurrence(e,e.date)!==undefined)return NaN;
  const explicit=instant(e.startAt||e.startDateTime,zone);
  const start=Number.isFinite(explicit)?explicit:wallInstant(e.date,clockTime(e.time),zone);
  if(!Number.isFinite(start))return NaN;
  if(!e.cinemaSession&&e.endDate>e.date){
   const days=(Date.parse(e.endDate+'T12:00:00Z')-Date.parse(e.date+'T12:00:00Z'))/86400000;
   if(days>1)return NaN; // Genuine multi-day programmes, not a single overnight session.
   const exact=instant(e.endAt||e.endDateTime,zone,true);
   const end=Number.isFinite(exact)?exact:wallInstant(e.endDate,clockTime(e.end||e.endTime),zone,true);
   if(Number.isFinite(end)&&end-start>=86400000)return NaN;
   // Source-classified city/festival ranges with no closing time are not timed sessions.
   if(!Number.isFinite(end)&&(e.category==='city'||e.category==='festival'||e.scheduleType==='date_range'))return NaN;
  }
  return start+ARRIVAL_WINDOW_MS;
 }
 function visibilityEnd(e,date,zone=e.timezone||defaultTimeZone){
  const end=scheduleEnd(e,date,zone),arrival=arrivalDeadline(e,zone);
  return Number.isFinite(arrival)&&(!Number.isFinite(end.at)||arrival<=end.at)
   ?{at:arrival,reason:'arrival-cutoff'}:end;
 }
 function availableOnDate(e,date,now=Date.now(),zone=e.timezone||defaultTimeZone){
  if(e.kind==='place')return true;
  if(!date||e.publicationStatus==='held_for_recheck'||e.cancelled||e.status==='cancelled'||(e.closedDates||[]).includes(date)||(e.closedWeekdays||[]).includes(new Date(date+'T12:00:00Z').getUTCDay()))return false;
  if(e.validDates&&!e.validDates.includes(date))return false;
  const end=visibilityEnd(e,date,zone);
  if(end.reason==='no-visit')return false;
  let belongs=onDate(e,date);
  // Keep genuine non-cinema overnight sessions on their continuation day as well.
  if(!belongs&&!e.cinemaSession&&occurrence(e,date)===undefined&&date>e.date&&Number.isFinite(end.at))belongs=date<=localParts(end.at-1,zone).date;
  return belongs&&(!Number.isFinite(end.at)||now<end.at);
 }
 function connect(input,events){
  const places=input.map(p=>({...p})),byId=new Map(places.map(p=>[p.id,p])),byVenue=new Map(),names=new Map(),cells=new Map(),matchers=[];
  const cellKey=(lat,lng)=>Math.floor(lat*500)+':'+Math.floor(lng*500);
  function nearby(e){const result=[];const y=Math.floor(e.lat*500),x=Math.floor(e.lng*500);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)result.push(...(cells.get((y+dy)+':'+(x+dx))||[]));return result;}
  function index(p){
   if(p.matchVenue)matchers.push(p);
   if(hasPoint(p)){const key=cellKey(p.lat,p.lng),list=cells.get(key)||[];list.push(p);cells.set(key,list);}
   if(p.venueId)byVenue.set(p.venueId,p);
   for(const n of [p.title,p.venue,...(p.aliases||[])]){const k=normalize(n);if(!k)continue;const arr=names.get(k)||[];if(!arr.includes(p))arr.push(p);names.set(k,arr);}
  }
  places.forEach(index);
  const links=new Map(),programmes=new Map();
  for(const e of events){
   let p=byId.get(e.placeId)||byVenue.get(e.venueId);const name=normalize(e.venue);
   if(!p){const exact=names.get(name)||[];p=exact.length===1&&(!hasPoint(e)||apart(e,exact[0])<.25)?exact[0]:exact.find(x=>apart(e,x)<.15);}
   if(!p)p=matchers.find(x=>name.includes(normalize(x.matchVenue))&&(!hasPoint(e)||apart(e,x)<.2));
   if(!p&&hasPoint(e))p=nearby(e).find(x=>apart(e,x)<.09&&[x.title,...(x.aliases||[])].some(n=>{n=normalize(n);return n.length>=7&&(name.startsWith(n)||n.startsWith(name)&&name.length>=7);}));
   if(!p&&hasPoint(e)&&e.venue){
    p={id:'venue:'+String(e.venueId||name)+':'+e.lat.toFixed(4)+':'+e.lng.toFixed(4),kind:'place',title:e.venue,venue:e.venue,venueId:e.venueId,
      category:e.category==='film'?'film':e.category==='music'?'music':e.category==='theatre'?'theatre':'space',
      address:e.address,lat:e.lat,lng:e.lng,description:'Площадка из афиши. Подтверждённые анонсы — ниже.',source:e.source,sourceUrl:e.sourceUrl,
      sourceURLs:[e.sourceUrl],coordinateSource:e.coordinateSource||e.sourceUrl,checkedAt:e.checkedAt,fromEvents:true};
    places.push(p);byId.set(p.id,p);index(p);
   }
   if(p){links.set(e.id,p.id);const arr=programmes.get(p.id)||[];arr.push(e);programmes.set(p.id,arr);}
  }
  for(const list of programmes.values())list.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99').localeCompare(b.time||'99'));
  return {places,links,programmes};
 }
 function program(placeId,programmes,days){return (programmes.get(placeId)||[]).filter(e=>days.some(d=>availableOnDate(e,d)));}
 function beerLabel(p){const b=p.beerPrice;return b&&Number.isFinite(b.min)?'Пиво — от '+b.min+' '+(b.currency==='RSD'?'RSD':b.currency==='RUB'?'₽':'₾'):null;}
 return {hasCategory,normalize,apart,hasPoint,onDate,availableOnDate,visibilityEnd,arrivalDeadline,setTimeZone,wallInstant,connect,program,beerLabel};
})();
if(typeof module!=='undefined')module.exports=NoreliDiscovery;
