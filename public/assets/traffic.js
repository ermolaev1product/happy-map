(()=>{
 try{
  if(window.__happyMapTrafficStarted)return;window.__happyMapTrafficStarted=true;
  if(!['happymap.app','www.happymap.app'].includes(location.hostname))return;
  if(navigator.doNotTrack==='1'||navigator.globalPrivacyControl||localStorage.getItem('happymap-stats-exclude')==='1')return;
  const cities=["tbilisi","belgrade","moscow","palo-alto","paris","london","yerevan","flensburg","vienna","saint-petersburg","new-york","dubai","prague","batumi","berlin","limassol","antalya","tel-aviv","almaty","istanbul","barcelona","madrid","minsk","baku","tashkent","astana","bishkek","riga","oslo","buenos-aires","brasilia","tallinn","warsaw","lisbon","chisinau","vilnius","copenhagen","dublin","stockholm","helsinki","amsterdam","bratislava","sofia","rome","budapest","brussels","athens","bucharest","podgorica","zagreb","ljubljana","skopje","sarajevo","ankara","nicosia","abu-dhabi","tirana","valletta","doha","manama","tokyo","seoul","bangkok","singapore","washington","kuala-lumpur","ottawa","hanoi","mexico-city","new-delhi","lima","bogota","montevideo","santiago","quito","asuncion","guatemala-city","panama-city","san-salvador","santo-domingo","port-of-spain","rabat","bridgetown","dakar","tunis","accra","algiers","reykjavik","luxembourg","cape-town","bern","hamburg","munich","toronto","montreal","chicago","philadelphia","los-angeles","cologne","san-diego"];
  const rootPages=['map.html','cities.html','about.html','guide.html','android.html','sources.html','source-priorities.html','sources-audit.html','tbilisi-bars.html'];
  const cityPages=['index.html','map.html','android.html','sources.html','nearby.html'];
  const parts=location.pathname.split('/').filter(Boolean);if(['en','de','pt-br'].includes(parts[0]))parts.shift();
  // Cloudflare may serve clean, extensionless URLs (including the German map bridge).
  const last=parts.length-1;if(last>=0&&!parts[last].includes('.')&&(parts.length===2&&cities.includes(parts[0])||parts.length===1&&!cities.includes(parts[0])))parts[last]+='.html';
  let path;if(parts.length===1&&rootPages.includes(parts[0]))path=parts[0]==='map.html'?'/'+['tbilisi','map.html'].join('/'):'/'+parts[0];
  else if(cities.includes(parts[0])&&(parts.length===1||parts.length===2&&cityPages.includes(parts[1])))path='/'+parts[0]+'/'+(parts[1]&&parts[1]!=='index.html'?parts[1]:'');
  if(!path)return;
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let saved;try{saved=JSON.parse(localStorage.getItem('happymap-daily-visitor'))}catch{}
  if(!saved||saved.day!==day||!(/^[a-f0-9-]{36}$/i).test(saved.id||''))saved={day,id:crypto.randomUUID()};
  // When storage is blocked, skip rather than inflate every reload into a new visitor.
  localStorage.setItem('happymap-daily-visitor',JSON.stringify(saved));
  const params=new URLSearchParams(location.search),allowed=['friend','telegram','whatsapp','instagram','facebook','google'];
  let source=params.get('utm_source');
  if(!allowed.includes(source)){
   let host='';try{host=new URL(document.referrer).hostname}catch{}
   source=/^(t\.me|telegram\.org)$/.test(host)?'telegram':/(^|\.)google\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host)?'google':host&&host!==location.hostname?'other':'direct';
   if(host===location.hostname){try{source=sessionStorage.getItem('happymap-traffic-source')||'direct'}catch{}}
  }
  try{sessionStorage.setItem('happymap-traffic-source',source)}catch{}
  let sent=false;
  const send=()=>{
   if(sent||document.visibilityState!=='visible')return;sent=true;
   if(navigator.doNotTrack==='1'||navigator.globalPrivacyControl||localStorage.getItem('happymap-stats-exclude')==='1')return;
   const payload={id:crypto.randomUUID(),visitor:saved.id,path,source};
   fetch('/api/traffic/view',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});
  };
  if(document.visibilityState==='visible')send();else document.addEventListener('visibilitychange',send);
 }catch{}
})();
