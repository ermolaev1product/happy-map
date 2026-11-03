import json,re,datetime,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];r=ROOT/'data/belgrade';src=json.loads((r/'selected.json').read_text());venues=json.loads((r/'venues.json').read_text());now=datetime.datetime.now(datetime.timezone.utc).isoformat();out=[]
cats={'Театр':'theatre','Концерты':'music','Лекции':'talk','Stand Up':'theatre','Фестивали':'city','Игры':'games','Дети':'kids','Мастер-классы':'workshop','Кино':'film'}
for e in src:
 if e['section']['title']=='Экскурсии' or e['id'] in [663,1474]:continue
 v=venues[e['venue']['slug']];gps=v.get('gps','').split(',');lat,lng=map(float,gps)
 if not (44.65<lat<44.95 and 20.2<lng<20.65):print('Outside',e['id'],v['title']);continue
 if e['id'] in [522,568]:lat=lng=None
 price=float(e['price']) if e.get('price') else None
 if price is None and re.search(r'вход (?:свободный|бесплатный)',e.get('description') or '',re.I):price=0
 desc='Анонс из Afisha.rs. Расписание, условия входа и наличие мест уточняйте на странице события.'
 if e.get('date2') and e['date2']!=e['date']:desc+=' В источнике указан период до '+e['date2']+'. В календаре показан день начала; программа следующих дней — по ссылке.'
 if lat is None:desc+=' Точная площадка уточняется; событие доступно в списке без метки на карте.'
 out.append(dict(id='bg-afisha-'+str(e['id']),title=e['title'],date=e['date'],time=e.get('time'),end=None,venue=v['title'],address=v.get('address'),lat=lat,lng=lng,price=price,min=bool(price),category=cats.get(e['section']['title'],'other'),source='Afisha.rs',sourceUrl='https://afisha.rs'+e['url'],checkedAt=now,imageUrl=e.get('image_styles',{}).get('crop16x9'),language=None,description=desc,venueSource='https://afisha.rs'+e['venue']['slug'],sources=[dict(name='Afisha.rs',url='https://afisha.rs'+e['url'],price=price,min=bool(price))]))
# Explicitly reviewed same performances across languages. Prefer the primary ticket seller.
reviewed={'tickets-28377':1473,'tickets-27344':713,'tickets-28350':1475,'tickets-25827':568}
extras=json.loads((r/'tickets-events.json').read_text())
for e in extras:
 same=next((x for x in out if x['id']=='bg-afisha-'+str(reviewed.get(e['id']))),None)
 if not same:
  same=next((x for x in out if x['date']==e['date'] and any(k in e['title'].lower() and k in x['title'].lower() for k in ['deep purple','sooshi mango'])),None)
 if same:
  same['sources'].append(dict(name=e['source'],url=e['sourceUrl'],price=e.get('price'),min=e.get('min',True)));same['price']=e.get('price');same['time']=e.get('time');continue
 aliases={'Nova Zappa Barka':'Zappa Barka','Klub Bluz i Pivo':'Bluz i pivo','Salon Kolarčeve zadužbine':'Zadužbina Ilije M. Kolarca'}
 v=next((v for v in venues.values() if v['title']==aliases.get(e['venue'],e['venue'])),None)
 if v:e['lat'],e['lng']=map(float,v['gps'].split(','));e['address']=v.get('address')
 if (r/'supplemental-venues.json').exists():
  supp=json.loads((r/'supplemental-venues.json').read_text())
  v=next((v for v in supp if v['venue']==e['venue'] and not v.get('exclude')),None)
  if v:e['lat']=v['lat'];e['lng']=v['lng'];e['address']=v['address'];e['venueSource']=v['sourceUrl']
 e['sources']=[dict(name=e['source'],url=e['sourceUrl'],price=e.get('price'),min=e.get('min',True))];out.append(e)
assert len({e['id'] for e in out})==len(out)
out.sort(key=lambda e:(e['date'],e.get('time') or '99',e['title']))
cat={'startDate':'2026-10-04','endDate':'2026-10-10','generatedAt':now,'updateMode':'snapshot','coverage':'Белград: афиша на 4–10 октября из Afisha.rs, Tickets.rs и программ организаторов. Концерты, театр, кино, лекции, игры и встречи. Это подборка, а не полный реестр города. Автообновление пока не подключено.','events':out,'sources':[{'name':n,'url':u,'count':sum(any(s['name']==n for s in e['sources']) for e in out)} for n,u in [('Afisha.rs','https://afisha.rs/ru'),('Tickets.rs','https://tickets.rs'),('BUPBAP official programme','https://bupbap.com/program/'),('Druga Strana official organiser','https://drugastrana.events/'),('Belgrade Arena official','https://arenabeograd.com/')]]}
(ROOT/'public/belgrade/events.json').write_text(json.dumps(cat,ensure_ascii=False,separators=(',',':')))
print('Events',len(out),'mapped',sum(e.get('lat') is not None for e in out));print({d:sum(e['date']==d for e in out) for d in sorted({e['date'] for e in out})})
