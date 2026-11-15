/* Counts the city catalogue, never the filtered list or the places directory. No network or contact data. */
(function(root){
 'use strict';
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 function evaluate(data,zone,model,now=Date.now()){
  let date;
  try{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now)).map(x=>[x.type,x.value]));date=p.year+'-'+p.month+'-'+p.day;}catch{return {state:'unknown',count:null,date:null};}
  if(!zone||!data||!Array.isArray(data.events)||!data.events.length||typeof model?.availableOnDate!=='function')return {state:'unknown',count:null,date};
  const seen=new Set();let valid=0,count=0;
  try{for(const e of data.events){
   if(!e||typeof e.id!=='string'||!e.id||!validDate(e.date)||e.kind==='place')continue;
   valid++;
   if(seen.has(e.id))continue;seen.add(e.id);
   if(e.cancelled||['cancelled','canceled','postponed','sold_out','soldout'].includes(e.status)||e.soldOut===true||e.stale===true||e.accessType==='restricted'||e.isPrivate===true||e.visibility==='private'||['held_for_recheck','needs_review','draft','excluded'].includes(e.publicationStatus)||(Array.isArray(e.needsReview)&&e.needsReview.length))continue;
   if(model.availableOnDate(e,date,now,zone)){count++;if(count===20)return {state:'sufficient',count,date};}
  }}catch{return {state:'unknown',count:null,date};}
  return valid?{state:'populating',count,date}:{state:'unknown',count:null,date};
 }
 root.HappyMapCoverageState={evaluate};
 if(typeof document==='undefined')return;
 const notice=document.getElementById('cityCoverageNotice');if(!notice)return;if(notice.dataset.coverageCity==='flensburg'){notice.hidden=true;return;}
 const body=notice.querySelector('[data-coverage-body]');let first=true,scheduled=false;
 function update(){
  scheduled=false;let data=null,model=null;
  try{if(typeof catalog!=='undefined')data=catalog;if(typeof NoreliDiscovery!=='undefined')model=NoreliDiscovery;}catch{}
  const state=evaluate(data,notice.dataset.coverageTimezone,model);
  notice.hidden=state.state==='sufficient';notice.dataset.coverageState=state.state;notice.dataset.coverageDate=state.date||'';
  if(body)body.textContent=state.state==='unknown'?notice.dataset.coverageUnknown:notice.dataset.coveragePartial;
  if(first){first=false;setTimeout(update,1000);}
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(update);}
 // Catalogue startup/reload renders this existing list; observe it, not user filters as an input.
 const list=document.getElementById('eventList');if(list&&typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(list,{childList:true,subtree:false});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
 window.addEventListener('focus',update);window.addEventListener('pageshow',update);
 setInterval(()=>{if(!document.hidden)update();},30000);update();
})(globalThis);
