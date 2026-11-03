/* Search centres are not device positions. Ordinary entry requests permission-gated device location. */
(()=>{
 'use strict';
 const lang=document.documentElement.lang.startsWith('ru')?'ru':document.documentElement.lang.startsWith('de')?'de':'en';
 const copy={
  "en": {
    "default": "City search centre · device location not determined",
    "saved": "Saved search point · not your current location",
    "shared": "Search point from a link · not your location",
    "selected": "Selected search point",
    "device": "Device location",
    "idle": "My location",
    "requesting": "Determining location…",
    "denied": "Location permission denied. Enable it in browser/app settings, or select a point.",
    "timeout": "Location request timed out. Try again or select a point.",
    "unavailable": "Device location unavailable. Select a point or try again.",
    "stale": "Previous device location expired. Tap My location to update.",
    "privacy": "On ordinary entry, Happy Map requests permission to use this device’s location. Coordinates are not added to shared links or visitor statistics.",
    "from": "Where should we search?",
    "pick": "Select a search point on the map",
    "center": "Use current map centre",
    "all": "Show whole city",
    "hint": "The cross marks the search centre. A green dot marks a recent device location, not live tracking.",
    "accuracy": "accuracy",
    "cancel": "Cancel",
    "unsupported": "No supported city nearby. Choose a city to browse.",
    "imprecise": "Location is too approximate to select a city reliably. Choose a city.",
    "otherCity": "Viewing the city from your link. Your device is elsewhere; tap My location to switch.",
    "chooseCity": "Choose city",
    "searchContext": "Your chosen search area is preserved. The device-location dot is separate; tap My location to search there."
  },
  "ru": {
    "default": "Центр поиска в городе · геопозиция не определена",
    "saved": "Сохранённая точка поиска · не текущая геопозиция",
    "shared": "Точка поиска из ссылки · не ваша геопозиция",
    "selected": "Выбранная точка поиска",
    "device": "Геопозиция устройства",
    "idle": "Моя геопозиция",
    "requesting": "Определяем геопозицию…",
    "denied": "Нет разрешения на геолокацию. Разрешите её в настройках браузера или приложения либо выберите точку.",
    "timeout": "Время ожидания геолокации истекло. Повторите или выберите точку.",
    "unavailable": "Геопозиция устройства недоступна. Выберите точку или повторите.",
    "stale": "Предыдущая геопозиция устарела. Нажмите «Моя геопозиция», чтобы обновить.",
    "privacy": "При обычном входе Happy Map запрашивает разрешение на геопозицию этого устройства. Координаты не добавляются в ссылки и статистику посещений.",
    "from": "Откуда ищем?",
    "pick": "Выбрать точку поиска на карте",
    "center": "От центра текущей карты",
    "all": "Показать весь город",
    "hint": "Крест обозначает центр поиска. Зелёная точка обозначает недавнюю геопозицию устройства, не постоянное слежение.",
    "accuracy": "точность",
    "cancel": "Отмена",
    "unsupported": "Рядом пока нет поддерживаемого города. Выберите город для просмотра.",
    "imprecise": "Геопозиция слишком приблизительная для выбора города. Выберите город.",
    "otherCity": "Открыт город из вашей ссылки. Устройство находится в другом месте; нажмите «Моя геопозиция», чтобы переключиться.",
    "chooseCity": "Выбрать город",
    "searchContext": "Выбранная область поиска сохранена. Геопозиция устройства отмечена отдельно; нажмите «Моя геопозиция», чтобы искать там."
  },
  "de": {
    "default": "Suchzentrum der Stadt · Gerätestandort nicht bestimmt",
    "saved": "Gespeicherter Suchpunkt · nicht dein aktueller Standort",
    "shared": "Suchpunkt aus einem Link · nicht dein Standort",
    "selected": "Ausgewählter Suchpunkt",
    "device": "Gerätestandort",
    "idle": "Mein Standort",
    "requesting": "Standort wird bestimmt…",
    "denied": "Standortzugriff verweigert. Erlaube ihn in den Browser- oder App-Einstellungen oder wähle einen Punkt.",
    "timeout": "Zeitüberschreitung. Versuche es erneut oder wähle einen Punkt.",
    "unavailable": "Gerätestandort nicht verfügbar. Wähle einen Punkt oder versuche es erneut.",
    "stale": "Vorheriger Gerätestandort abgelaufen. Tippe zum Aktualisieren auf Mein Standort.",
    "privacy": "Beim normalen Start fragt Happy Map nach der Erlaubnis für den Gerätestandort. Koordinaten werden nicht in geteilte Links oder Besucherstatistiken aufgenommen.",
    "from": "Wo sollen wir suchen?",
    "pick": "Suchpunkt auf der Karte auswählen",
    "center": "Aktuelle Kartenmitte verwenden",
    "all": "Ganze Stadt anzeigen",
    "hint": "Das Kreuz markiert das Suchzentrum. Ein grüner Punkt markiert einen aktuellen Gerätestandort, keine Live-Verfolgung.",
    "accuracy": "Genauigkeit",
    "cancel": "Abbrechen",
    "unsupported": "Keine unterstützte Stadt in der Nähe. Wähle eine Stadt.",
    "imprecise": "Standort zu ungenau für eine sichere Stadtauswahl. Wähle eine Stadt.",
    "otherCity": "Die verlinkte Stadt bleibt geöffnet. Dein Gerät ist anderswo; tippe zum Wechsel auf Mein Standort.",
    "chooseCity": "Stadt wählen",
    "searchContext": "Dein gewähltes Suchgebiet bleibt erhalten. Der Gerätestandort ist separat markiert; tippe zum Suchen dort auf Mein Standort."
  }
}[lang];
 const telegram=Boolean(window.HappyMapTelegram);
 if(telegram)copy.privacy={ru:'Местоположение запрашивается только по нажатию «Моё местоположение». Координаты не добавляются в общие ссылки и статистику.',en:'Location is requested only when you tap My location. Coordinates are not added to shared links or visitor statistics.',de:'Der Standort wird nur beim Tippen auf Mein Standort angefragt. Koordinaten werden nicht in geteilte Links oder Besucherstatistiken aufgenommen.'}[lang];
 const cities=[{"id":"tbilisi","path":"map.html","point":[41.7044,44.7935],"name":{"ru":"Тбилиси","en":"Tbilisi","de":"Tiflis"}},{"id":"belgrade","path":"belgrade/index.html","point":[44.8125,20.4633],"name":{"ru":"Белград","en":"Belgrade","de":"Belgrad"}},{"id":"moscow","path":"moscow/index.html","point":[55.757,37.615],"name":{"ru":"Москва","en":"Moscow","de":"Moskau"}},{"id":"palo-alto","path":"palo-alto/index.html","point":[37.4438753,-122.1591786],"name":{"ru":"Пало-Альто","en":"Palo Alto","de":"Palo Alto"}},{"id":"paris","path":"paris/index.html","point":[48.8566,2.3522],"name":{"ru":"Париж","en":"Paris","de":"Paris"}},{"id":"london","path":"london/index.html","point":[51.5074,-0.1278],"name":{"ru":"Лондон","en":"London","de":"London"}},{"id":"yerevan","path":"yerevan/index.html","point":[40.1811,44.5136],"name":{"ru":"Ереван","en":"Yerevan","de":"Jerewan"}},{"id":"flensburg","path":"flensburg/index.html","point":[54.7894,9.4336],"name":{"ru":"Фленсбург","en":"Flensburg","de":"Flensburg"}},{"id":"vienna","path":"vienna/index.html","point":[48.20817,16.37382],"name":{"ru":"Вена","en":"Vienna","de":"Wien"}},{"id":"saint-petersburg","path":"saint-petersburg/index.html","point":[59.931168524969,30.2942],"name":{"ru":"Санкт-Петербург","en":"Saint Petersburg","de":"Sankt Petersburg"}},{"id":"new-york","path":"new-york/index.html","point":[40.770999,-73.9336859],"name":{"ru":"Нью-Йорк","en":"New York","de":"New York"}},{"id":"dubai","path":"dubai/index.html","point":[25.19567,55.27198],"name":{"ru":"Дубай","en":"Dubai","de":"Dubai"}},{"id":"prague","path":"prague/index.html","point":[50.088143182636,14.420459293254],"name":{"ru":"Прага","en":"Prague","de":"Prag"}},{"id":"batumi","path":"batumi/index.html","point":[41.64816,41.6308792],"name":{"ru":"Батуми","en":"Batumi","de":"Batumi"}},{"id":"berlin","path":"berlin/index.html","point":[52.50976,13.41367],"name":{"ru":"Берлин","en":"Berlin","de":"Berlin"}},{"id":"limassol","path":"limassol/index.html","point":[34.67632,33.04389],"name":{"ru":"Лимасол","en":"Limassol","de":"Limassol"}},{"id":"antalya","path":"antalya/index.html","point":[36.88479487,30.70302],"name":{"ru":"Анталья","en":"Antalya","de":"Antalya"}},{"id":"tel-aviv","path":"tel-aviv/index.html","point":[32.07659,34.78478],"name":{"ru":"Тель-Авив","en":"Tel Aviv","de":"Tel Aviv"}},{"id":"almaty","path":"almaty/index.html","point":[43.248519,76.945789],"name":{"ru":"Алматы","en":"Almaty","de":"Almaty"}},{"id":"istanbul","path":"istanbul/index.html","point":[41.03207,29.0172],"name":{"ru":"Стамбул","en":"Istanbul","de":"Istanbul"}},{"id":"bratislava","path":"bratislava/index.html","point":[48.1453,17.1136],"name":{"ru":"Братислава","en":"Bratislava","de":"Bratislava"}},{"id":"sofia","path":"sofia/index.html","point":[42.6951707,23.327384],"name":{"ru":"София","en":"Sofia","de":"Sofia"}},{"id":"rome","path":"rome/index.html","point":[41.893701,12.479806],"name":{"ru":"Рим","en":"Rome","de":"Rom"}},{"id":"budapest","path":"budapest/index.html","point":[47.504828,19.0618306],"name":{"ru":"Будапешт","en":"Budapest","de":"Budapest"}},{"id":"brussels","path":"brussels/index.html","point":[50.8442559,4.36535],"name":{"ru":"Брюссель","en":"Brussels","de":"Brüssel"}},{"id":"athens","path":"athens/index.html","point":[37.9807803,23.742671],"name":{"ru":"Афины","en":"Athens","de":"Athen"}},{"id":"bucharest","path":"bucharest/index.html","point":[44.4356,26.0845],"name":{"ru":"Бухарест","en":"Bucharest","de":"Bukarest"}},{"id":"sarajevo","path":"sarajevo/index.html","point":[43.85803,18.4208],"name":{"ru":"Сараево","en":"Sarajevo","de":"Sarajevo"}},{"id":"ankara","path":"ankara/index.html","point":[39.93234627,32.84927442],"name":{"ru":"Анкара","en":"Ankara","de":"Ankara"}},{"id":"nicosia","path":"nicosia/index.html","point":[35.17062,33.368746],"name":{"ru":"Никосия","en":"Nicosia","de":"Nikosia"}},{"id":"abu-dhabi","path":"abu-dhabi/index.html","point":[24.5231545,54.433868],"name":{"ru":"Абу-Даби","en":"Abu Dhabi","de":"Abu Dhabi"}},{"id":"tirana","path":"tirana/index.html","point":[41.324764461538464,19.819656600000002],"name":{"ru":"Тирана","en":"Tirana","de":"Tirana"}},{"id":"valletta","path":"valletta/index.html","point":[35.8991,14.51389],"name":{"ru":"Валлетта","en":"Valletta","de":"Valletta"}},{"id":"doha","path":"doha/index.html","point":[25.2887825,51.5272051],"name":{"ru":"Доха","en":"Doha","de":"Doha"}},{"id":"manama","path":"manama/index.html","point":[26.23921,50.591631],"name":{"ru":"Манама","en":"Manama","de":"Manama"}},{"id":"tokyo","path":"tokyo/index.html","point":[35.7139046,139.7731023],"name":{"ru":"Токио","en":"Tokyo","de":"Tokio"}},{"id":"seoul","path":"seoul/index.html","point":[37.57196,126.97949],"name":{"ru":"Сеул","en":"Seoul","de":"Seoul"}},{"id":"bangkok","path":"bangkok/index.html","point":[13.7301721,100.53026207142857],"name":{"ru":"Бангкок","en":"Bangkok","de":"Bangkok"}},{"id":"singapore","path":"singapore/index.html","point":[1.28838,103.85724],"name":{"ru":"Сингапур","en":"Singapore","de":"Singapur"}},{"id":"washington","path":"washington/index.html","point":[38.9006249,-77.02644],"name":{"ru":"Вашингтон","en":"Washington, D.C.","de":"Washington, D.C."}},{"id":"kuala-lumpur","path":"kuala-lumpur/index.html","point":[3.158282995,101.69546],"name":{"ru":"Куала-Лумпур","en":"Kuala Lumpur","de":"Kuala Lumpur"}},{"id":"mexico-city","path":"mexico-city/index.html","point":[19.409525,-99.161025],"name":{"ru":"Мехико","en":"Mexico City","de":"Mexiko-Stadt"}},{"id":"ottawa","path":"ottawa/index.html","point":[45.41262,-75.693735],"name":{"ru":"Оттава","en":"Ottawa","de":"Ottawa"}},{"id":"hanoi","path":"hanoi/index.html","point":[21.028123,105.8496882],"name":{"ru":"Ханой","en":"Hanoi","de":"Hanoi"}},{"id":"new-delhi","path":"new-delhi/index.html","point":[28.5935312375,77.2204946],"name":{"ru":"Нью-Дели","en":"New Delhi","de":"Neu-Delhi"}},{"id":"lima","path":"lima/index.html","point":[-12.0776865,-76.9865038],"name":{"ru":"Лима","en":"Lima","de":"Lima"}},{"id":"bogota","path":"bogota/index.html","point":[4.609146,-74.070414],"name":{"ru":"Богота","en":"Bogotá","de":"Bogotá"}},{"id":"montevideo","path":"montevideo/index.html","point":[-34.905896100663,-56.170582],"name":{"ru":"Монтевидео","en":"Montevideo","de":"Montevideo"}},{"id":"santiago","path":"santiago/index.html","point":[-33.4372168,-70.6380715],"name":{"ru":"Сантьяго","en":"Santiago","de":"Santiago"}},{"id":"quito","path":"quito/index.html","point":[-0.2170267,-78.5150173],"name":{"ru":"Кито","en":"Quito","de":"Quito"}},{"id":"asuncion","path":"asuncion/index.html","point":[-25.284999,-57.634785],"name":{"ru":"Асунсьон","en":"Asunción","de":"Asunción"}},{"id":"guatemala-city","path":"guatemala-city/index.html","point":[14.6380754,-90.5145711],"name":{"ru":"Гватемала","en":"Guatemala City","de":"Guatemala-Stadt"}},{"id":"panama-city","path":"panama-city/index.html","point":[8.9832431,-79.534648309],"name":{"ru":"Панама","en":"Panama City","de":"Panama-Stadt"}},{"id":"san-salvador","path":"san-salvador/index.html","point":[13.693881682,-89.233382441],"name":{"ru":"Сан-Сальвадор","en":"San Salvador","de":"San Salvador"}},{"id":"santo-domingo","path":"santo-domingo/index.html","point":[18.470157878,-69.8990988],"name":{"ru":"Санто-Доминго","en":"Santo Domingo","de":"Santo Domingo"}},{"id":"port-of-spain","path":"port-of-spain/index.html","point":[10.6678523,-61.519154314],"name":{"ru":"Порт-оф-Спейн","en":"Port of Spain","de":"Port of Spain"}},{"id":"rabat","path":"rabat/index.html","point":[34.0199635,-6.832077649789041],"name":{"ru":"Рабат","en":"Rabat","de":"Rabat"}},{"id":"bridgetown","path":"bridgetown/index.html","point":[13.0983454,-59.609172],"name":{"ru":"Бриджтаун","en":"Bridgetown","de":"Bridgetown"}},{"id":"dakar","path":"dakar/index.html","point":[14.6692263,-17.435468],"name":{"ru":"Дакар","en":"Dakar","de":"Dakar"}},{"id":"tunis","path":"tunis/index.html","point":[36.8018895,10.1811487],"name":{"ru":"Тунис","en":"Tunis","de":"Tunis"}},{"id":"accra","path":"accra/index.html","point":[5.5738662,-0.1952856],"name":{"ru":"Аккра","en":"Accra","de":"Accra"}},{"id":"algiers","path":"algiers/index.html","point":[36.774464,3.060103],"name":{"ru":"Алжир","en":"Algiers","de":"Algier"}},{"id":"reykjavik","path":"reykjavik/index.html","point":[64.1417149,-21.79665908],"name":{"ru":"Рейкьявик","en":"Reykjavík","de":"Reykjavík"}},{"id":"luxembourg","path":"luxembourg/index.html","point":[49.61069,6.1300038],"name":{"ru":"Люксембург","en":"Luxembourg","de":"Luxemburg"}},{"id":"cape-town","path":"cape-town/index.html","point":[-33.91994596276222,18.4229806],"name":{"ru":"Кейптаун","en":"Cape Town","de":"Kapstadt"}},{"id":"bern","path":"bern/index.html","point":[46.9488917,7.4472057],"name":{"ru":"Берн","en":"Bern","de":"Bern"}},{"id":"barcelona","point":[41.38417592716741,2.1707408640195456],"path":"barcelona/index.html","name":{"ru":"Барселона","en":"Barcelona","de":"Barcelona","es":"Barcelona"}},{"id":"madrid","point":[40.41906024374356,-3.697078928530211],"path":"madrid/index.html","name":{"ru":"Мадрид","en":"Madrid","de":"Madrid","es":"Madrid"}},{"id":"minsk","point":[53.9045883,27.5568869],"path":"minsk/index.html","name":{"ru":"Минск","en":"Minsk","de":"Minsk"}},{"id":"baku","point":[40.3832554,49.8435082],"path":"baku/index.html","name":{"ru":"Баку","en":"Baku","de":"Baku"}},{"id":"tashkent","point":[41.3054365,69.2695275],"path":"tashkent/index.html","name":{"ru":"Ташкент","en":"Tashkent","de":"Tashkent"}},{"id":"astana","point":[51.1469549,71.4258932],"path":"astana/index.html","name":{"ru":"Астана","en":"Astana","de":"Astana"}},{"id":"bishkek","point":[42.870445,74.6083193],"path":"bishkek/index.html","name":{"ru":"Бишкек","en":"Bishkek","de":"Bishkek"}},{"id":"riga","point":[56.9502397258,24.1094068417],"path":"riga/index.html","name":{"ru":"Рига","en":"Riga","de":"Riga"}},{"id":"oslo","point":[59.921391258259405,10.73643],"path":"oslo/index.html","name":{"ru":"Осло","en":"Oslo","de":"Oslo"}},{"id":"buenos-aires","point":[-34.603454,-58.407019],"path":"buenos-aires/index.html","name":{"ru":"Буэнос-Айрес","en":"Buenos Aires","de":"Buenos Aires"}},{"id":"brasilia","point":[-15.79668,-47.884263],"path":"brasilia/index.html","name":{"ru":"Бразилиа","en":"Brasília","de":"Brasília"}},{"id":"tallinn","point":[59.43705,24.745632],"path":"tallinn/index.html","name":{"ru":"Таллин","en":"Tallinn","de":"Tallinn"}},{"id":"warsaw","point":[52.248806,21.01147],"path":"warsaw/index.html","name":{"ru":"Варшава","en":"Warsaw","de":"Warschau"}},{"id":"lisbon","point":[38.71541607142857,-9.1547132],"path":"lisbon/index.html","name":{"ru":"Лиссабон","en":"Lisbon","de":"Lissabon"}},{"id":"chisinau","point":[47.023041,28.835212],"path":"chisinau/index.html","name":{"ru":"Кишинёв","en":"Chișinău","de":"Chișinău"}},{"id":"vilnius","point":[54.681569,25.2817516],"path":"vilnius/index.html","name":{"ru":"Вильнюс","en":"Vilnius","de":"Vilnius"}},{"id":"copenhagen","point":[55.680876,12.549521],"path":"copenhagen/index.html","name":{"ru":"Копенгаген","en":"Copenhagen","de":"Kopenhagen"}},{"id":"dublin","point":[53.3427934,-6.2620851],"path":"dublin/index.html","name":{"ru":"Дублин","en":"Dublin","de":"Dublin"}},{"id":"stockholm","point":[59.32663387248238,18.071600838087825],"path":"stockholm/index.html","name":{"ru":"Стокгольм","en":"Stockholm","de":"Stockholm"}},{"id":"helsinki","point":[60.1737,24.946604],"path":"helsinki/index.html","name":{"ru":"Хельсинки","en":"Helsinki","de":"Helsinki"}},{"id":"amsterdam","point":[52.36999316,4.8935742],"path":"amsterdam/index.html","name":{"ru":"Амстердам","en":"Amsterdam","de":"Amsterdam"}},{"id":"podgorica","point":[42.4430124,19.2610487],"path":"podgorica/index.html","name":{"ru":"Подгорица","en":"Podgorica","de":"Podgorica"}},{"id":"zagreb","point":[45.81210327,15.97479153],"path":"zagreb/index.html","name":{"ru":"Загреб","en":"Zagreb","de":"Zagreb"}},{"id":"ljubljana","point":[46.049959,14.50392],"path":"ljubljana/index.html","name":{"ru":"Любляна","en":"Ljubljana","de":"Ljubljana"}},{"id":"skopje","point":[41.998589,21.4323484],"path":"skopje/index.html","name":{"ru":"Скопье","en":"Skopje","de":"Skopje"}}];
 const entry=new URLSearchParams(location.search),currentCity=nearKey.replace(/^(?:morrow|happy-map)-near-/, '').replace(/-v1$/, '');
 // Automatic startup is the default. Consume only the legacy technical flag; keep real deep-link intent.
 if(entry.getAll('location').includes('auto')){const modes=entry.getAll('location').filter(value=>value!=='auto');entry.delete('location');for(const mode of modes)entry.append('location',mode);const query=entry.toString();history.replaceState(history.state,'',location.pathname+(query?'?'+query:'')+location.hash);}
 const explicitSearch=entry.get('location')==='manual'||['event','place','view'].some(k=>entry.has(k))||new URLSearchParams(location.hash.slice(1)).has('near');
 const cityIntent=['date','category','layer','radius','period'].some(k=>entry.has(k))||entry.get('location')==='city';
 const autoCity=!cityIntent&&!explicitSearch;
 const transferKey='happymap-device-transfer-v1';
 const km=(a,b)=>{const r=Math.PI/180,dlat=(b[0]-a[0])*r,dlng=(b[1]-a[1])*r;return 12742*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dlng/2)**2));};
 const nearbyCity=p=>cities.map(c=>({...c,d:km(p,c.point)})).sort((a,b)=>a.d-b.d).find(c=>c.d<=75);
 const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180;
 let restoredPoint=null,pendingRadius=null,restored=false,started=false,transferred=false,mapReady=false;
 let kind='default',phase='idle',fix=null,request=0,expiryTimer,deviceMarker,deviceCircle,status,button;
 const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
 const fixLabel=()=>copy.device+' '+new Date(fix.timestamp).toLocaleTimeString(lang,{hour:'2-digit',minute:'2-digit'})+' · '+copy.accuracy+' ±'+Math.ceil(fix.accuracy)+' m';
 function label(){return kind==='device'&&fix?fixLabel():copy[kind];}
 function removeDevice(){deviceMarker?.remove();deviceCircle?.remove();deviceMarker=deviceCircle=null;}
 function clearFix(){fix=null;clearTimeout(expiryTimer);removeDevice();if(kind==='device')kind='saved';}
 function expire(){if(fix&&Date.now()-fix.timestamp>=300000){clearFix();phase='stale';positionLabel=label();update();}}
 function update(){
  expire();positionLabel=label();
  if(!status){const host=document.querySelector('.layer-tabs');if(!host)return;const box=document.createElement('div');box.className='location-controls';box.id='locationControls';status=document.createElement('span');status.id='locationStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');button=document.createElement('button');button.id='locateMe';button.type='button';button.onclick=()=>phase==='requesting'?cancel():locate();const choose=document.createElement('a');choose.href=lang==='en'?'/en/cities.html':'/cities.html';choose.textContent=copy.chooseCity;box.append(status,button,choose);host.after(box);}
  status.textContent=positionLabel+(phase==='idle'?'':' · '+copy[phase]);status.title=copy.hint+' '+copy.privacy;button.textContent=phase==='requesting'?copy.cancel:copy.idle;button.setAttribute('aria-label',button.textContent);button.title=copy.privacy;
  const near=document.getElementById('nearButton');if(near)near.title=positionLabel;
 }
 function cancel(){request++;phase='idle';update();}
 persistNear=function(){try{localStorage.setItem(nearKey,JSON.stringify({position,radius,label:copy.saved,radiusVersion:1,source:kind==='device'?'device-snapshot':kind,observedAt:fix?.timestamp||null}));}catch{}};
 restoreNear=function(){
  if(restored){positionLabel=label();return;}restored=true;
  kind='default';phase='idle';restoredPoint=null;clearFix();
  try{const raw=sessionStorage.getItem(transferKey);sessionStorage.removeItem(transferKey);const t=JSON.parse(raw||'null');if(t?.city===currentCity&&valid(t.point)&&Number.isFinite(t.timestamp)&&Date.now()-t.timestamp>=0&&Date.now()-t.timestamp<30000&&Number.isFinite(t.accuracy)&&t.accuracy>=0){fix={point:t.point,timestamp:t.timestamp,accuracy:t.accuracy};position=t.point;radius=.5;kind='device';transferred=true;}}catch{}
  try{const n=JSON.parse(localStorage.getItem(nearKey)||'null');if(!transferred&&n&&valid(n.position)){position=n.position;radius=n.radiusVersion===1&&n.radius===0?0:.5;kind='saved';}}catch{}
  const h=new URLSearchParams(location.hash.slice(1)),raw=h.get('near'),tokens=raw?.split(',');
  if(tokens?.length===2&&tokens.every(t=>t.trim()!=='')){const p=tokens.map(Number);if(valid(p)){position=p;radius=.5;kind='shared';h.delete('near');history.replaceState(history.state,'',location.pathname+location.search+(h.toString()?'#'+h.toString():''));persistNear();}}
  if(kind!=='default')restoredPoint=position;positionLabel=label();
 };
 function beginLocation(){if(started)return;started=true;restoreNear();update();if(transferred){expiryTimer=setTimeout(()=>{expire();drawOrigin();},Math.max(0,300000-(Date.now()-fix.timestamp)));}else if(!telegram&&entry.get('view')!=='plans')locate({automatic:true});}
 // Permission must not wait for catalog downloads. Preserve this state when start later restores/initializes the map.
 const startBefore=start;start=function(...args){beginLocation();return startBefore.apply(this,args);};
 const initBefore=initMap;initMap=function(){beginLocation();if(restoredPoint){position=restoredPoint;positionLabel=label();}if(pendingRadius!==null)radius=entry.get('radius')==='all'?0:pendingRadius;mapReady=true;initBefore();drawOrigin();};
 const renderBefore=render;render=function(){renderBefore();update();};
 drawOrigin=function(){
  update();if(!map)return;originMarker?.remove();originCircle?.remove();originMarker=originCircle=null;
  // The blue area is the active search filter, not a device-location claim.
  // Keep it visible while GPS is pending/denied/unavailable; only the green
  // device marker requires a valid recent fix. The status names the search point.
  const origin=HappyMapSearch.origin(map,position,radius,point=>{choosePoint(point,copy.selected,false);});originMarker=origin.marker;originCircle=origin.circle;
  removeDevice();if(fix&&typeof L!=='undefined'){
   deviceCircle=L.circle(fix.point,{radius:fix.accuracy,color:'#17764d',weight:1,fillOpacity:.08,interactive:false}).addTo(map);
   deviceMarker=L.circleMarker(fix.point,{radius:7,color:'#fff',weight:2,fillColor:'#17764d',fillOpacity:1,interactive:false}).addTo(map).bindTooltip(fixLabel(),{direction:'top'});
  }
 };
 function refreshLocation(){if(mapReady||map)render();else update();drawOrigin();}
 function setPoint(point,recenter){position=point;restoredPoint=point;radius=.5;pendingRadius=.5;distanceSort=true;view='explore';limit=18;positionLabel=label();persistNear();refreshLocation();if(recenter&&map)map.setView(position,15);}
 choosePoint=function(point,_label,recenter=true){if(!valid(point))return;request++;kind='selected';phase='idle';setPoint(point,recenter);};
 locate=function(options={}){
  if(phase==='requesting')return;
  const token=++request;clearFix();phase='requesting';update();drawOrigin();
  const fail=code=>{if(token!==request)return;phase=code===1?'denied':code===3?'timeout':'unavailable';clearFix();update();drawOrigin();};
  if(!navigator.geolocation||window.isSecureContext===false){fail(2);return;}
  try{navigator.geolocation.getCurrentPosition(p=>{
   if(token!==request)return;
   const point=[p.coords?.latitude,p.coords?.longitude],timestamp=Number(p.timestamp),accuracy=Number(p.coords?.accuracy);
   if(!valid(point)||!Number.isFinite(timestamp)||Math.abs(Date.now()-timestamp)>30000||!Number.isFinite(accuracy)||accuracy<0){fail(2);return;}
   const searchKind=kind;fix={point,timestamp,accuracy};kind='device';phase='idle';
   const nearest=accuracy<=10000?nearbyCity(point):null;
   if(nearest&&nearest.id!==currentCity&&(!options.automatic||autoCity)){
    try{sessionStorage.setItem(transferKey,JSON.stringify({...fix,city:nearest.id}));}catch{}
    const prefix=lang==='en'?'/en/':lang==='de'&&nearest.id==='flensburg'?'/de/':'/';const target=new URL(prefix+nearest.path,location.href);location.replace(target.pathname+(telegram?'?miniapp=telegram&location=city':''));return;
   }
   if(options.automatic&&!autoCity){kind=searchKind==='shared'?'shared':'selected';phase='searchContext';update();drawOrigin();}
   else{setPoint(point,true);if(entry.get('radius')==='all'){radius=0;pendingRadius=0;persistNear();refreshLocation();}if(!nearest){phase=accuracy>10000?'imprecise':'unsupported';update();}}
   expiryTimer=setTimeout(()=>{expire();drawOrigin();},Math.max(0,300000-(Date.now()-timestamp)));
  },e=>fail(e?.code),{enableHighAccuracy:true,timeout:15000,maximumAge:0});}catch{fail(2);}
 };
 nearOptions=function(){
  update();showDialog(`<div class="detail-content"><h2>${esc(copy.from)}</h2><p>${esc(positionLabel)}</p><p>${esc(copy.hint)}</p><div class="near-options"><button class="primary-button" id="useGps">${esc(copy.idle)}</button><button id="useMapCenter">${esc(copy.center)}</button><button id="pickOnMap">${esc(copy.pick)}</button><button id="useWholeCity">${esc(copy.all)}</button></div><p class="detail-description">${esc(copy.privacy)}</p></div>`);
  $('#useGps').onclick=()=>{$('#eventDialog').close();locate();};$('#useMapCenter').onclick=()=>{$('#eventDialog').close();if(map){const c=map.getCenter();choosePoint([c.lat,c.lng]);}};$('#pickOnMap').onclick=()=>{$('#eventDialog').close();if(!map)return;$('.map-shell').scrollIntoView({behavior:'smooth',block:'center'});toast(copy.pick);map.once('click',e=>choosePoint([e.latlng.lat,e.latlng.lng]));};$('#useWholeCity').onclick=()=>{cancel();$('#eventDialog').close();radius=0;pendingRadius=0;persistNear();refreshLocation();};
 };
 $('#nearButton').onclick=nearOptions;
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){expire();update();drawOrigin();}});
 window.addEventListener('pageshow',()=>{expire();update();drawOrigin();});
})();
