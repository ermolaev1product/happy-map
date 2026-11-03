import {execFileSync} from 'node:child_process';

const nextDay = day => new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);
const localDay = (now, zone) => {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now)).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
};

// A range's last day may be closed. Check actual remaining visit dates, not just
// that last day. The shared model owns published ends and the two-hour grace.
export function hasRemainingOccurrence(event, now, zone, model) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(event.date||''))return false;
  if(!(event.endDate>event.date))return model.availableOnDate(event,event.date,now,zone);
  const today=localDay(now,zone);
  for(let day=event.date>today?event.date:today;day<=event.endDate;day=nextDay(day)){
    if(model.availableOnDate(event,day,now,zone))return true;
  }
  return false;
}

// Only committed publication history is trusted, never a previously rendered
// working-tree feed. The caller must use the current published source commit.
export function readPublishedFeed(root, cityId, ref='HEAD') {
  if(!/^(?:HEAD|[0-9a-f]{7,40})$/.test(ref))throw Error('published-ref must be HEAD or a commit SHA');
  const commit=execFileSync('git',['rev-parse','--verify',ref+'^{commit}'],{cwd:root,encoding:'utf8'}).trim();
  const file=`public/${cityId}/events.json`;
  const present=execFileSync('git',['ls-tree','--name-only',commit,'--',file],{cwd:root,encoding:'utf8'}).trim();
  return {commit,feed:present?JSON.parse(execFileSync('git',['show',commit+':'+file],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024})):null};
}

export function filterForPublication(packet, config, {now,model,publishedFeed=null,publishedCommit=null}) {
  const history=new Map((publishedFeed?.events||[]).filter(e=>!hasRemainingOccurrence(e,now,config.ianaTimezone,model)).map(e=>[e.id,e]));
  const excluded=[], events=[];
  for(const event of packet.events){
    if(history.has(event.id)) {events.push(history.get(event.id));history.delete(event.id);}
    else if(hasRemainingOccurrence(event,now,config.ianaTimezone,model))events.push(event);
    else excluded.push({...event,reason:'Elapsed before first publication; retained only in research/audit.'});
  }
  // A newer research selection must not erase already published history.
  events.push(...history.values());
  const sources=packet.sources.map(s=>({...s,count:0}));
  for(const old of publishedFeed?.sourceRegistry||[])if(!sources.some(s=>s.id===old.id))sources.push({...old,count:0});
  const hostname=url=>{try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''}};
  for(const event of events){
    const candidates=sources.filter(s=>hostname(s.url)===hostname(event.sourceUrl));
    const source=candidates.filter(s=>event.sourceUrl.startsWith(s.url)).sort((a,b)=>b.url.length-a.url.length)[0]||candidates[0];
    if(source)source.count++;
  }
  for(const source of sources)source.status=source.count?'imported':(source.accessStatus||'reviewed');
  return {packet:{...packet,events,sources,pending:[...(packet.pending||[]),...excluded]},publication:{at:new Date(now).toISOString(),publishedCommit,excludedNewElapsedIds:excluded.map(e=>e.id),retainedHistoricalIds:events.filter(e=>!hasRemainingOccurrence(e,now,config.ianaTimezone,model)).map(e=>e.id)}};
}
