(()=>{const $=id=>document.getElementById(id);let key='';const names={friend:'Ссылка знакомой',telegram:'Telegram',whatsapp:'WhatsApp',instagram:'Instagram',facebook:'Facebook',google:'Google',direct:'Прямой переход / неизвестно',other:'Другие сайты'};
try{key=sessionStorage.getItem('happymap-stats-key')||'';$('exclude').checked=localStorage.getItem('happymap-stats-exclude')==='1'}catch{}
$('exclude').onchange=()=>{try{localStorage.setItem('happymap-stats-exclude',$('exclude').checked?'1':'0')}catch{$('message').textContent='Браузер не разрешил сохранить настройку.'}};
const row=(target,values)=>{const tr=document.createElement('tr');values.forEach(v=>{const td=document.createElement('td');td.textContent=String(v);tr.append(td)});target.append(tr)};
async function load(){
 $('message').textContent='Обновляем…';$('refresh').disabled=true;
 try{const r=await fetch('/api/traffic/report',{headers:{Authorization:'Bearer '+key},cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось загрузить статистику');
 $('login').hidden=true;$('report').hidden=false;try{sessionStorage.setItem('happymap-stats-key',key)}catch{}
 const cityNames={tbilisi:'Tbilisi',belgrade:'Belgrade',moscow:'Moscow','palo-alto':'Palo Alto',paris:'Paris',london:'London',flensburg:'Flensburg',yerevan:'Yerevan',vienna:'Vienna',site:'Happy Map'};
 $('cities').replaceChildren();(d.cities||[]).forEach(x=>row($('cities'),[cityNames[x.city]||x.city,x.visitors,x.views]));
 const byDay=new Map(d.daily.map(x=>[x.day,x]));const days=[];for(let i=29;i>=0;i--){const date=new Date(d.today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-i);const day=date.toISOString().slice(0,10);days.push(byDay.get(day)||{day,visitors:0,views:0})}
 $('today').textContent=days[29].visitors;$('yesterday').textContent=days[28].visitors;$('views').textContent=days[29].views;
 $('stamp').textContent='Today: '+d.today+' · America/Los_Angeles · обновлено '+new Date().toLocaleTimeString('en-GB');
 $('chart').replaceChildren();const max=Math.max(1,...days.map(x=>x.visitors));days.forEach(x=>{const bar=document.createElement('div');bar.className='bar';bar.style.height=Math.max(2,x.visitors/max*180)+'px';bar.title=x.day+': '+x.visitors;bar.setAttribute('aria-label',bar.title);$('chart').append(bar)});
 $('start').textContent=days[0].day;$('end').textContent=d.today;$('empty').hidden=d.daily.length>0;
 $('sources').replaceChildren();d.sources.forEach(x=>row($('sources'),[names[x.source]||x.source,x.visitors,x.views]));
 $('days').replaceChildren();days.slice().reverse().forEach(x=>row($('days'),[x.day,x.visitors,x.views]));$('message').textContent='';
 }catch(e){$('message').textContent=e.message}finally{$('refresh').disabled=false}
}
$('loginForm').onsubmit=e=>{e.preventDefault();key=$('key').value.trim();$('key').value='';load()};$('refresh').onclick=load;$('logout').onclick=()=>{key='';try{sessionStorage.removeItem('happymap-stats-key')}catch{}$('report').hidden=true;$('login').hidden=false;$('message').textContent=''};if(key)load();})();
