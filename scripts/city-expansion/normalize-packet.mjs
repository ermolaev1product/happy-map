import crypto from 'node:crypto';

const categories = {lecture:'talk',talks:'talk',literature:'talk',tour:'city',meetup:'city',community:'city',culture:'city',exhibition:'art',festival:'city',family:'kids',comedy:'theatre',performance:'theatre',concert:'music',concert_venue:'music',cinema:'film',museum:'art',restaurant:'food',gallery:'art',bookstore:'books',cultural_center:'city',cultural_space:'city',space:'city',arts:'art',bookshop:'books',nature_center:'park',outdoors:'park',landmark:'city',creative_workshop:'workshop',fitness:'sport',classical:'music',market:'city',dance:'other',musical:'theatre',performing_arts:'city',events:'city'};
const allowed = ['id','kind','title','titleEn','venue','venueEn','venueId','address','addressEn','description','descriptionEn','date','time','end','endDate','startAt','endAt','durationMinutes','ongoing','scheduleType','visitSchedule','additionalOpeningWindows','availability','validDates','closedDates','closedWeekdays','visitingHours','category','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceEn','sourceUrl','sourceURLs','checkedAt','yearEvidence','price','priceLabel','priceLabelEn','priceMax','priceNote','priceNoteEn','currency','timezone','language','soldOut','status','ageRating','accessType','admission','admissionEn','openingHours','openingNote','openingNoteEn','website','phone','imageUrl','attribution','license','provenance','operatingStatusVerified','openingHoursSource','visitScheduleSource','ticketUrl','hall','hallEn','yearEvidenceEn','ageRatingEn','timeNote','timeNoteEn'];
const enNames = {
  'Официальный организатор':'Official organizer',
  'Петербургская филармония':'Saint Petersburg Philharmonia',
  'Театральная библиотека':'Saint Petersburg Theatre Library',
  'Новая Голландия':'New Holland',
  'KudaGo Петербург':'KudaGo Saint Petersburg',
  'Новая Голландия Telegram':'New Holland Telegram',
  'Афиша.ру Санкт-Петербург':'Afisha.ru Saint Petersburg',
  'Яндекс Афиша':'Yandex Afisha',
  'Культура Петербурга':'Saint Petersburg Culture',
  'Афиша Нью-Йорк Telegram':'Afisha New York Telegram',
  'Афиша Прага Чехия':'Afisha Prague Czechia',
};
const host = url => {try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''}};

// Converts research packet shapes without treating research status as an imported event.
// The original packet is separately retained, and every excluded record is reported.
export function normalizePacket(raw, config) {
  const pending = [...(raw.pending || [])], translations = {};
  function row(source, kind) {
    const item = Object.fromEntries([...allowed,'dateType','min','priceFrom','priceConflict','seriesId','openingHoursUnknown','openingHoursKnown','timeOfDayEligible'].filter(k => source[k] !== undefined).map(k => [k, source[k]]));
    item.kind = kind;
    item.city = config.canonicalCity;
    item.cityId = config.id;
    item.currency = item.currency || config.currency;
    item.timezone = item.timezone || config.ianaTimezone;
    const category=categories[item.category]||item.category;
    if(category!==item.category)item.sourceCategory=item.category;
    item.category=category;
    item.source = source.source || host(source.sourceUrl);
    item.sourceEn = source.sourceEn || enNames[item.source] || item.source;
    if(item.yearEvidence&&!item.yearEvidenceEn){
      const months={'января':'January','февраля':'February','марта':'March','апреля':'April','мая':'May','июня':'June','июля':'July','августа':'August','сентября':'September','октября':'October','ноября':'November','декабря':'December'};
      item.yearEvidenceEn=item.yearEvidence.replace(/января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря/g,m=>months[m]);
    }
    if(typeof item.ageRating==='string'&&!item.ageRatingEn){
      item.ageRatingEn=item.ageRating.replace(/^(\d+)\s*-\s*(\d+) лет$/,'Ages $1–$2').replace(/^(\d+)\s*-\s*(\d+) класс$/,'Grades $1–$2');
    }
    if (source.endTime != null && source.end == null) item.end = source.endTime;
    if(kind==='event'&&source.dateType==='published_interval'&&source.time==null){
      const weekdays=['sun','mon','tue','wed','thu','fri','sat'];
      const validTime=v=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
      const weeklyKnown=source.openingHoursKnown===true&&/^https:\/\//.test(source.openingHoursSource||'')&&weekdays.every(k=>Object.hasOwn(source.openingHours||{},k)&&(source.openingHours[k]===null||Array.isArray(source.openingHours[k])&&source.openingHours[k].length===2&&source.openingHours[k].every(validTime)));
      const publishedSchedule=source.visitSchedule&&/^https:\/\//.test(source.visitScheduleSource||source.openingHoursSource||'')?source.visitSchedule:null;
      const scheduleValid=publishedSchedule&&Object.values(publishedSchedule).every(h=>h===null||(Array.isArray(h)?h.length===2&&validTime(h[0])&&(validTime(h[1])||h[1]==='24:00'):h&&validTime(h.start)&&(validTime(h.end)||h.end==='24:00')));
      const known=weeklyKnown||Boolean(scheduleValid);
      item.openingHoursUnknown=!known;item.openingHoursKnown=known;item.timeOfDayEligible=known;
      if(known){
        item.visitSchedule={};item.openingHoursSource=source.openingHoursSource||source.visitScheduleSource;
        if(weeklyKnown)item.closedWeekdays=weekdays.flatMap((k,i)=>source.openingHours[k]===null?[i]:[]);
        const longDays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        for(let date=source.date;date<=source.endDate;date=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10)){
          const day=new Date(date+'T12:00:00Z').getUTCDay();
          if(Array.isArray(source.closedDates)&&source.closedDates.includes(date))continue;
          // Explicit dated exceptions override normal weekly hours, including null closures.
          const hasDatedHours=scheduleValid&&Object.hasOwn(publishedSchedule,date);
          const hours=hasDatedHours?publishedSchedule[date]:(weeklyKnown?source.openingHours[weekdays[day]]:publishedSchedule[longDays[day]]);
          if(hours){const start=Array.isArray(hours)?hours[0]:hours.start,end=Array.isArray(hours)?hours[1]:hours.end;item.visitSchedule[date]={start,end:end==='24:00'?'00:00':end};}
        }
      }else delete item.visitSchedule;
      const note=known?'This is a published exhibition date range. Displayed daily hours are venue visiting hours, not separate event sessions.':(source.openingHoursNote||'Opening hours have not been published. This is an exhibition or festival date range, not a daily timed session.');
      item.description=[source.description,note].filter(Boolean).join(' ');
      item.descriptionEn=[source.descriptionEn||source.description,note].filter(Boolean).join(' ');
    }
    if (typeof item.price === 'string') {
      item.priceLabel = item.price; item.price = null;
      // An explicitly published range can support its minimum and maximum; never infer fees.
      const range = item.priceLabel.match(/^(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)\s*(?:₽|RUB|USD|EUR|€|\$|TRY|KZT|AED|ILS|CZK|GEL)?$/);
      if (range) {item.price = Number(range[1].replace(',','.')); item.priceMax = Number(range[2].replace(',','.')); item.min = true;}
    }
    if (item.price === 0 && !item.priceNote && !item.priceLabel) {
      // Keep the provided admission text as the evidence, never invent a free-entry reason.
      if(source.admission) item.priceNote = source.admission;
      if(source.admissionEn) item.priceNoteEn = source.admissionEn;
    }
    for (const key of Object.keys(item).filter(k => k.endsWith('En'))) {
      const original = key.slice(0,-2);
      if(typeof item[original] === 'string' && typeof item[key] === 'string') translations[item[original]] = item[key];
    }
    return item;
  }
  const places = [];
  for (const source of raw.places || []) {
    if (source.mapReady === false || !Number.isFinite(source.lat) || !Number.isFinite(source.lng)) {
      pending.push({id:source.id, kind:'place', sourceUrl:source.sourceUrl, reason:'Exact venue coordinates unverified; not published as a map place.'});
    } else places.push(row(source,'place'));
  }
  const events = [];
  for(const source of raw.events||[]){
    if(source.time==null&&!(source.dateType==='published_interval'&&source.endDate>source.date&&Number.isFinite(source.lat)&&Number.isFinite(source.lng)&&source.coordinateSource)){
      pending.push({...source,reason:'Single-session start time or interval venue pin not verified; held from event publication.'});
    }else {const event=row(source,'event');if(source.dateType==='published_interval'&&source.openingHoursKnown===true&&!event.openingHoursKnown)pending.push({...source,reason:'Known visiting-hour claim has an unsupported or unsourced schedule; held rather than losing closures.'});else events.push(event);}
  }
  const sourceCounts=new Map();
  for(const event of events){
    const candidates=(raw.sources||[]).map((source,index)=>({source,index})).filter(({source})=>host(source.url)===host(event.sourceUrl));
    const match=candidates.filter(({source})=>event.sourceUrl.startsWith(source.url)).sort((a,b)=>b.source.url.length-a.source.url.length)[0]||candidates[0];
    if(match)sourceCounts.set(match.index,(sourceCounts.get(match.index)||0)+1);
  }
  const sources = (raw.sources || []).map((source,index) => {
    const nameEn = source.nameEn && !/[А-Яа-яЁё]/.test(source.nameEn) ? source.nameEn : enNames[source.name] || source.name;
    if(source.name!==nameEn||!/[А-Яа-яЁё]/.test(source.name||''))translations[source.name] = nameEn;
    const count = sourceCounts.get(index)||0;
    const status = source.status || source.accessStatus || source.public_access_status || 'unverified';
    return {id:source.id || source.candidateId || 'source-'+crypto.createHash('sha256').update(source.url).digest('hex').slice(0,12), name:source.name, nameEn, url:source.url, checkedAt:source.checkedAt, status:count ? 'imported' : status, accessStatus:status, count, note:source.note || source.notes || '', ...(source.type || source.channel ? {type:source.type || source.channel} : {})};
  });
  return {cityId:config.id, checkedAt:raw.checkedAt, window:raw.window?{startDate:raw.window.startDate,endDate:raw.window.endDate}:undefined, coverage:(raw.coverage || raw.window?.coverage || 'Initial verified selection. Coverage is limited and is not a complete city calendar.').replace(/packet/gi,'selection'), events, places, sources, pending, translations};
}

export function localizeRecord(record, language = 'en') {
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.endsWith('En')) continue;
    result[key] = language === 'en' && record[key+'En'] !== undefined ? record[key+'En'] : value;
  }
  return result;
}
