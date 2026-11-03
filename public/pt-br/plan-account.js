/* The same verified account as Friends; guest plans stay usable without sign-in. */
(()=>{
 if(typeof saved==='undefined'||!window.HappyMapAccount)return;
 const en=true;
 const city=location.pathname.replace(/^\/(?:en|de|pt-br|fr-ca)\//,'/').split('/')[1];
 const cities=["belgrade","moscow","palo-alto","paris","london","yerevan","flensburg","vienna","saint-petersburg","new-york","dubai","prague","batumi","berlin","limassol","antalya","tel-aviv","almaty","istanbul","barcelona","madrid","minsk","baku","tashkent","astana","bishkek","riga","oslo","buenos-aires","brasilia","tallinn","warsaw","lisbon","chisinau","vilnius","copenhagen","dublin","stockholm","helsinki","amsterdam","bratislava","sofia","rome","budapest","brussels","athens","bucharest","podgorica","zagreb","ljubljana","skopje","sarajevo","ankara","nicosia","abu-dhabi","tirana","valletta","doha","manama","tokyo","seoul","bangkok","singapore","washington","kuala-lumpur","ottawa","hanoi","mexico-city","new-delhi","lima","bogota","montevideo","santiago","quito","asuncion","guatemala-city","panama-city","san-salvador","santo-domingo","port-of-spain","rabat","bridgetown","dakar","tunis","accra","algiers","reykjavik","luxembourg","cape-town","bern","hamburg","munich","toronto","montreal","chicago","philadelphia","los-angeles","cologne","san-diego"];
 const current=cities.includes(city)?city:'tbilisi';
 const keys={"tbilisi":"morrow-real-plans-v1","belgrade":"morrow-belgrade-plans-v1","moscow":"morrow-moscow-plans-v1","palo-alto":"happy-map-palo-alto-plans-v1","paris":"happy-map-paris-plans-v1","london":"happy-map-london-plans-v1","vienna":"morrow-vienna-plans-v1","yerevan":"morrow-yerevan-plans-v1","flensburg":"happy-map-flensburg-plans-v1","saint-petersburg":"morrow-saint-petersburg-plans-v1","new-york":"morrow-new-york-plans-v1","dubai":"morrow-dubai-plans-v1","prague":"morrow-prague-plans-v1","batumi":"morrow-batumi-plans-v1","berlin":"morrow-berlin-plans-v1","limassol":"morrow-limassol-plans-v1","antalya":"morrow-antalya-plans-v1","tel-aviv":"morrow-tel-aviv-plans-v1","almaty":"morrow-almaty-plans-v1","istanbul":"morrow-istanbul-plans-v1","barcelona":"morrow-barcelona-plans-v1","madrid":"morrow-madrid-plans-v1","minsk":"morrow-minsk-plans-v1","baku":"morrow-baku-plans-v1","tashkent":"morrow-tashkent-plans-v1","astana":"morrow-astana-plans-v1","bishkek":"morrow-bishkek-plans-v1","riga":"morrow-riga-plans-v1","oslo":"morrow-oslo-plans-v1","buenos-aires":"morrow-buenos-aires-plans-v1","brasilia":"morrow-brasilia-plans-v1","tallinn":"morrow-tallinn-plans-v1","warsaw":"morrow-warsaw-plans-v1","lisbon":"morrow-lisbon-plans-v1","chisinau":"morrow-chisinau-plans-v1","vilnius":"morrow-vilnius-plans-v1","copenhagen":"morrow-copenhagen-plans-v1","dublin":"morrow-dublin-plans-v1","stockholm":"morrow-stockholm-plans-v1","helsinki":"morrow-helsinki-plans-v1","amsterdam":"morrow-amsterdam-plans-v1","bratislava":"morrow-bratislava-plans-v1","sofia":"morrow-sofia-plans-v1","rome":"morrow-rome-plans-v1","budapest":"morrow-budapest-plans-v1","brussels":"morrow-brussels-plans-v1","athens":"morrow-athens-plans-v1","bucharest":"morrow-bucharest-plans-v1","podgorica":"morrow-podgorica-plans-v1","zagreb":"morrow-zagreb-plans-v1","ljubljana":"morrow-ljubljana-plans-v1","skopje":"morrow-skopje-plans-v1","sarajevo":"morrow-sarajevo-plans-v1","ankara":"morrow-ankara-plans-v1","nicosia":"morrow-nicosia-plans-v1","abu-dhabi":"morrow-abu-dhabi-plans-v1","tirana":"morrow-tirana-plans-v1","valletta":"morrow-valletta-plans-v1","doha":"morrow-doha-plans-v1","manama":"morrow-manama-plans-v1","tokyo":"morrow-tokyo-plans-v1","seoul":"morrow-seoul-plans-v1","bangkok":"morrow-bangkok-plans-v1","singapore":"morrow-singapore-plans-v1","washington":"morrow-washington-plans-v1","kuala-lumpur":"morrow-kuala-lumpur-plans-v1","ottawa":"morrow-ottawa-plans-v1","hanoi":"morrow-hanoi-plans-v1","mexico-city":"morrow-mexico-city-plans-v1","new-delhi":"morrow-new-delhi-plans-v1","lima":"morrow-lima-plans-v1","bogota":"morrow-bogota-plans-v1","montevideo":"morrow-montevideo-plans-v1","santiago":"morrow-santiago-plans-v1","quito":"morrow-quito-plans-v1","asuncion":"morrow-asuncion-plans-v1","guatemala-city":"morrow-guatemala-city-plans-v1","panama-city":"morrow-panama-city-plans-v1","san-salvador":"morrow-san-salvador-plans-v1","santo-domingo":"morrow-santo-domingo-plans-v1","port-of-spain":"morrow-port-of-spain-plans-v1","rabat":"morrow-rabat-plans-v1","bridgetown":"morrow-bridgetown-plans-v1","dakar":"morrow-dakar-plans-v1","tunis":"morrow-tunis-plans-v1","accra":"morrow-accra-plans-v1","algiers":"morrow-algiers-plans-v1","reykjavik":"morrow-reykjavik-plans-v1","luxembourg":"morrow-luxembourg-plans-v1","cape-town":"morrow-cape-town-plans-v1","bern":"morrow-bern-plans-v1","hamburg":"morrow-hamburg-plans-v1","munich":"morrow-munich-plans-v1","toronto":"morrow-toronto-plans-v1","montreal":"morrow-montreal-plans-v1","chicago":"morrow-chicago-plans-v1","philadelphia":"morrow-philadelphia-plans-v1","los-angeles":"morrow-los-angeles-plans-v1","cologne":"morrow-cologne-plans-v1","san-diego":"morrow-san-diego-plans-v1"};
 const key=keys[current],api=window.HappyMapAccount;
 const text=(ru,eng)=>en?eng:ru;
 const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??f}catch{return f}};
 const validEvents=v=>Array.isArray(v)?v.filter(e=>e&&typeof e.id==='string'&&typeof e.date==='string'):[];
 let storageAvailable=true;
 const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{storageAvailable=false;return false}};
 const remove=k=>{try{localStorage.removeItem(k)}catch{storageAvailable=false}};
 let owner=null,ready=false,running=false,generation=0,journal=[];
 let guest=validEvents(read(key+'-owner',null)?read(key+'-guest',[]):saved).slice();
 saved=guest.slice();
 const box=document.createElement('div');box.className='plan-account';
 box.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0;font-size:13px';
 const status=document.createElement('span'),action=document.createElement('button');action.className='filter-button';action.type='button';box.append(status,action);
 document.querySelector('.events-panel')?.prepend(box);
 function update(message){
  status.textContent=message||text("Seu plano está salvo neste dispositivo.","Seu plano está salvo neste dispositivo.");
  if(!storageAvailable)status.textContent=text("O armazenamento está indisponível. Mantenha esta aba aberta até a sincronização terminar.","O armazenamento está indisponível. Mantenha esta aba aberta até a sincronização terminar.");
  action.textContent=owner?text("Adicionar o plano deste dispositivo à sua conta","Adicionar o plano deste dispositivo à sua conta"):text("Entrar e salvar planos","Entrar e salvar planos");
  action.hidden=Boolean(owner&&!guest.length);
 }
 function persist(){
  write(key,saved);
  if(owner){write(key+'-owner',owner);write(key+'-account-'+owner,{events:saved,journal});}
  else{remove(key+'-owner');write(key+'-guest',saved);guest=saved.slice();}
 }
 function applyPending(remote){const byId=new Map(validEvents(remote).map(e=>[e.id,e]));for(const op of journal){if(op.remove)byId.delete(op.id);else if(op.event)byId.set(op.id,op.event);}return [...byId.values()];}
 async function flush(){
  if(!owner||running)return;running=true;
  const activeOwner=owner,activeGeneration=generation,activeJournal=journal;
  const currentRun=()=>owner===activeOwner&&generation===activeGeneration;
  try{
   while(currentRun()&&activeJournal.length){
    const op=activeJournal[0];
    await api.request('plans?city='+current,op.remove?'DELETE':'POST',op.remove?{id:op.id}:{events:[op.event]},{expectedIdentity:activeOwner});
    if(!currentRun())return;
    if(activeJournal[0]===op)activeJournal.shift();persist();
   }
   if(!currentRun())return;
   const remote=await api.request('plans?city='+current,'GET',undefined,{expectedIdentity:activeOwner});
   if(!currentRun())return;
   saved=applyPending(remote.events);persist();render();update(text("Eventos sincronizados. Os lugares salvos continuam neste dispositivo.","Eventos sincronizados. Os lugares salvos continuam neste dispositivo."));return true;
  }catch(e){if(currentRun())update(text("Salvo neste dispositivo. A sincronização está incompleta; tentaremos novamente quando houver conexão.","Salvo neste dispositivo. A sincronização está incompleta; tentaremos novamente quando houver conexão."));}
  finally{running=false;if(!currentRun()&&owner)flush();}
 }
 async function importGuest(){
  if(!owner||!guest.length)return;
  const activeOwner=owner,activeGeneration=generation,copy=guest.slice();
  // Keep the guest original until every imported operation is confirmed remotely.
  // Remote events win ID collisions; importing never deletes account records.
  const existing=new Set(saved.map(e=>e.id));
  for(const event of copy)if(!existing.has(event.id)){journal.push({id:event.id,event});existing.add(event.id);}
  saved=applyPending(saved);persist();render();const synced=await flush();
  if(synced&&owner===activeOwner&&generation===activeGeneration&&!journal.length){
   const imported=new Set(copy.map(e=>e.id));guest=guest.filter(e=>!imported.has(e.id));write(key+'-guest',guest);update(text("O plano deste dispositivo foi adicionado à sua conta.","O plano deste dispositivo foi adicionado à sua conta."));
  }
 }
 action.onclick=async()=>{try{if(!owner)await api.login();else await importGuest();}catch(e){update(e.message);}};
 const previous=toggleSave;
 toggleSave=function(id){previous(id);if(owner){const event=saved.find(e=>e.id===id);journal.push(event?{id,event}:{id,remove:true});}persist();if(ready&&owner)flush();else update();};
 async function switchIdentity(next){
  if(ready&&next===owner)return;
  generation++;
  if(ready)persist();
  owner=next; journal=[];
  if(owner){
   write(key+'-guest',guest);
   const cached=read(key+'-account-'+owner,{events:[],journal:[]});
   saved=validEvents(cached.events);journal=Array.isArray(cached.journal)?cached.journal.filter(op=>op&&typeof op.id==='string'&&(op.remove||op.event)):[];
  }else saved=guest.slice();
  ready=true;persist();update();
  if(typeof render==='function'&&typeof map!=='undefined'&&map)render();
  if(owner)await flush();
 }
 update();
 api.subscribe?.(next=>{switchIdentity(next).catch(()=>update(text("A sincronização está temporariamente indisponível.","A sincronização está temporariamente indisponível.")));});
 api.identity().then(switchIdentity).catch(()=>{ready=true;update(text("Acesso à conta indisponível. Seu plano continua neste dispositivo.","Acesso à conta indisponível. Seu plano continua neste dispositivo."));});
 window.addEventListener('online',()=>flush());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&owner)flush();});
})();
