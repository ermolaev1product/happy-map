/**
 * Happy Map Telegram bot — Cloudflare Worker.
 * Secrets: TELEGRAM_BOT_TOKEN, WEBHOOK_SECRET. KV binding: SUBSCRIBERS.
 * Optional: EVENTS_FEED_URL (JSON array or {events:[]}); EVENT_CITY_TIMEZONE defaults Asia/Tbilisi.
 * Routes: POST /telegram (secret header), GET /health; cron every hour.
 */
const API='https://api.telegram.org/bot';
const WEBSITE='https://happymap.app';
const WELCOME=`👋 Привет! Мы — Happy Map!

🌍 Мы верим, что жизнь интереснее, когда люди встречаются в реальности.

❤️ В больших городах бывает одиноко. Вокруг тысячи людей и сотни событий, но иногда просто не знаешь, куда пойти.

✨ Мы создали Happy Map, чтобы помочь людям чаще выходить из дома, знакомиться, находить друзей и проводить время вместе.

📍 А этот бот поможет тебе находить интересное рядом!

🔔 Каждый вечер в 18:00 мы планируем присылать тебе 3 ближайших мероприятия на сегодня.

📌 Для этого достаточно поделиться геопозицией.

💚 Настоящие места. Настоящие люди. Настоящая близость.

🌐 happymap.app`;
const keyboard={keyboard:[[{text:'🌆 Что делаем сегодня?'}],[{text:'☀️ Что делаем завтра?'}],[{text:'🎉 Что делаем на выходных?'}],[{text:'📍 Выбрать место',request_location:true}],[{text:'🌍 Открыть Happy Map'}],[{text:'🔕 Отключить рассылку'}]],resize_keyboard:true};
async function send(env,chat_id,text,extra={}) {
 const res=await fetch(API+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id,text,disable_web_page_preview:true,...extra})});
 if(!res.ok)throw new Error('Telegram sendMessage failed: '+res.status);
}
function validLocation(lat,lon){return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;}
function distanceKm(a,b,c,d){const r=Math.PI/180,x=(c-a)*r,y=(d-b)*r;return 6371*2*Math.asin(Math.sqrt(Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2));}
function localParts(date,tz){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date);return Object.fromEntries(parts.map(p=>[p.type,p.value]));}
function eventTime(e){const value=e.startAt||e.startsAt||e.start||e.datetime;const date=new Date(value);return Number.isFinite(date.getTime())?date:null;}
function eventCoords(e){const lat=Number(e.lat??e.latitude??e.location?.lat),lon=Number(e.lng??e.lon??e.longitude??e.location?.lng);return validLocation(lat,lon)?{lat,lon}:null;}
function safeLink(e){const raw=e.url||e.sourceUrl||e.link||WEBSITE;try{const u=new URL(raw,WEBSITE);return u.protocol==='https:'?u.href:WEBSITE;}catch{return WEBSITE;}}
async function feed(env){if(!env.EVENTS_FEED_URL)return null;const res=await fetch(env.EVENTS_FEED_URL,{headers:{accept:'application/json'}});if(!res.ok)throw Error('Event feed unavailable: '+res.status);const data=await res.json();return Array.isArray(data)?data:Array.isArray(data.events)?data.events:[];}
function localDateKey(date,tz){const p=localParts(date,tz);return p.year+'-'+p.month+'-'+p.day;}
function dateOffsetKey(now,tz,days){const p=localParts(now,tz);const base=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)+days));return base.toISOString().slice(0,10);}
function requestedDates(now,tz,period){
 if(period==='today')return [localDateKey(now,tz)];
 if(period==='tomorrow')return [dateOffsetKey(now,tz,1)];
 const day=new Date(dateOffsetKey(now,tz,0)+'T12:00:00Z').getUTCDay();
 const saturdayAhead=(6-day+7)%7;
 return [dateOffsetKey(now,tz,saturdayAhead),dateOffsetKey(now,tz,saturdayAhead+1)];
}
async function nearby(env,sub,now,period='today'){
 const events=await feed(env);if(events===null)return null;
 const tz=sub.timezone||env.EVENT_CITY_TIMEZONE||'Asia/Tbilisi',dates=new Set(requestedDates(now,tz,period));
 return events.filter(e=>!e.cancelled&&e.status!=='cancelled'&&e.status!=='sold_out').map(e=>({e,when:eventTime(e),point:eventCoords(e)}))
  .filter(x=>x.when&&x.when>now&&x.point&&dates.has(localDateKey(x.when,tz))&&(period!=='today'||Number(localParts(x.when,tz).hour)>=18))
  .map(x=>({...x,km:distanceKm(sub.lat,sub.lon,x.point.lat,x.point.lon)})).sort((a,b)=>a.km-b.km).slice(0,3);
}
function formatEvent(x,i,tz){const hour=new Intl.DateTimeFormat('ru-RU',{timeZone:tz,hour:'2-digit',minute:'2-digit'}).format(x.when);const d=x.km<1?Math.round(x.km*1000)+' м':x.km.toFixed(1).replace('.',',')+' км';return (i+1)+'. '+String(x.e.title||'Событие').slice(0,100)+'\n📍 '+d+' по прямой · 🕖 '+hour+'\n'+safeLink(x.e);}
async function onMessage(env,message){
 const id=message.chat?.id;if(!id||message.chat.type!=='private')return;
 const key='user:'+id,text=(message.text||'').trim(),previous=await env.SUBSCRIBERS.get(key,'json');
 if(text==='/start'){await send(env,id,WELCOME,{reply_markup:keyboard});return;}
 if(text==='/stop'||text==='🔕 Отключить рассылку'){await env.SUBSCRIBERS.delete(key);await send(env,id,'🔕 Подписка отключена. Чтобы включить снова, отправь геопозицию.',{reply_markup:keyboard});return;}
 if(['🌆 Что делаем сегодня?','☀️ Что делаем завтра?','🎉 Что делаем на выходных?'].includes(text)){
  if(!Number.isFinite(previous?.lat)||!Number.isFinite(previous?.lon)){await send(env,id,'📍 Сначала нажми «Выбрать место» и отправь геопозицию. Тогда я найду мероприятия рядом с тобой.',{reply_markup:keyboard});return;}
  const period=text.startsWith('🌆')?'today':text.startsWith('☀️')?'tomorrow':'weekend';
  try{
   const items=await nearby(env,previous,new Date(),period);
   if(items===null){await send(env,id,'Афиша пока подключается. Уже скоро здесь появятся настоящие мероприятия. А пока можно посмотреть их на '+WEBSITE,{reply_markup:keyboard});return;}
   if(!items.length){await send(env,id,'Пока не нашёл подходящих подтверждённых мероприятий на выбранные даты рядом с тобой. Посмотри другие события на '+WEBSITE,{reply_markup:keyboard});return;}
   const tz=previous.timezone||env.EVENT_CITY_TIMEZONE||'Asia/Tbilisi';
   await send(env,id,text+'\n\n'+items.map((x,i)=>formatEvent(x,i,tz)).join('\n\n'),{reply_markup:keyboard});
  }catch(err){console.error('Event lookup failed',String(err));await send(env,id,'Не удалось загрузить афишу. Попробуй чуть позже или открой '+WEBSITE,{reply_markup:keyboard});}
  return;
 }
 if(text==='🌍 Открыть Happy Map'){await send(env,id,WEBSITE);return;}
 if(message.location){
  const lat=Number(message.location.latitude),lon=Number(message.location.longitude);
  if(!validLocation(lat,lon)){await send(env,id,'Не получилось определить координаты. Попробуй ещё раз.');return;}
  const timezone=previous?.timezone||env.EVENT_CITY_TIMEZONE||'Asia/Tbilisi';
  await env.SUBSCRIBERS.put(key,JSON.stringify({chatId:id,lat,lon,timezone,subscribed:true,updatedAt:new Date().toISOString(),lastSentDate:previous?.lastSentDate||null}));
  await send(env,id,'📍 Геопозиция сохранена. Подписка включена! Буду присылать три ближайших события сегодняшнего вечера в 18:00 ('+timezone+'). Можно обновить точку или отключить рассылку.\n\nЕсли подборки пока нет, мы ещё подключаем афишу.',{reply_markup:keyboard});return;
 }
 if(text==='📍 Выбрать место'){await send(env,id,'Нажми кнопку 📍 «Выбрать место» в клавиатуре Telegram и разреши отправку геопозиции.',{reply_markup:keyboard});return;}
 await send(env,id,'Привет! Нажми 📍 «Выбрать место», чтобы поделиться местоположением. /stop — отключить уведомления.',{reply_markup:keyboard});
}
async function daily(env){
 if(!env.EVENTS_FEED_URL)return; // Do not send fake/empty digests before data is connected.
 const now=new Date();let cursor;
 do{
  const page=await env.SUBSCRIBERS.list({prefix:'user:',cursor,limit:500});
  for(const item of page.keys){
   try{
    const sub=await env.SUBSCRIBERS.get(item.name,'json');if(!sub?.subscribed)continue;
    const tz=sub.timezone||env.EVENT_CITY_TIMEZONE||'Asia/Tbilisi',p=localParts(now,tz),date=p.year+'-'+p.month+'-'+p.day;
    if(p.hour!=='18'||sub.lastSentDate===date)continue;
    const items=await nearby(env,sub,now);
    if(!items?.length)continue; // No invented events, no empty notification.
    await send(env,sub.chatId,'🌆 Три ближайших события сегодня вечером:\n\n'+items.map((x,i)=>formatEvent(x,i,tz)).join('\n\n')+'\n\n💚 '+WEBSITE);
    sub.lastSentDate=date;await env.SUBSCRIBERS.put(item.name,JSON.stringify(sub));
   }catch(err){console.error('Digest error for subscriber',item.name,String(err));}
  }
  cursor=page.list_complete?undefined:page.cursor;
 }while(cursor);
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/health')return new Response('ok');
  if(url.pathname!=='/telegram'||request.method!=='POST')return new Response('Not found',{status:404});
  if(!env.WEBHOOK_SECRET||request.headers.get('X-Telegram-Bot-Api-Secret-Token')!==env.WEBHOOK_SECRET)return new Response('Forbidden',{status:403});
  if(!env.TELEGRAM_BOT_TOKEN||!env.SUBSCRIBERS)return new Response('Not configured',{status:503});
  const data=await request.json();if(data.message)await onMessage(env,data.message);
  return new Response('ok');
 },
 async scheduled(event,env,ctx){ctx.waitUntil(daily(env));}
};
