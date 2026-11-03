import json,re,glob
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'data/refresh-20261020';snap={}
for f in O.glob('cavea-*-dom.json'):
 for x in json.load(open(f))['records']:snap[x['url']]=x
for locale in ['','en/']:
 for city in ['','batumi/']:
  p=R/('public/'+locale+city+'events.json');d=json.load(open(p));seen={};removed=[]
  for e in d['events']:
   if e.get('sourceUrl') not in snap:continue
   x=snap[e['sourceUrl']];bits=x['text'].splitlines();fmt=' · '.join(z for z in bits if z in ['IMAX','2D','3D','ScreenX','ATMOS']) or None;e['format']=fmt;e['description']=('Film screening · ' if locale else 'Киносеанс · ')+(fmt or '')+'.'
   key=(e['date'],e['time'],e['venue'],e['title'],e['language'],fmt)
   if key in seen:
    canonical=seen[key];canonical.setdefault('alternativeBookingUrls',[]).append(e['sourceUrl']);removed.append(e)
   else:seen[key]=e
  d['events']=[e for e in d['events'] if e not in removed];p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
  if not locale and removed:(O/'cinema-semantic-dedup.json').write_text(json.dumps({'method':'Same film, date, time, cinema, language and format; combined booking evidence. Distinct language/format screenings preserved.','removedFromNewBatch':removed},ensure_ascii=False,indent=2))
# regenerate exact new additions from final RU rows
p=O/'cinema-additions.json';d=json.load(open(p));ids={x['event']['id'] for x in d['additions']};d['additions']=[]
for city,path in [('tbilisi','public/events.json'),('batumi','public/batumi/events.json')]:
 for e in json.load(open(R/path))['events']:
  if e['id'] in ids:d['additions'].append({'city':city,'event':e})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2));print('Unique cinema',len(d['additions']))
# human-reviewed translation additions
p=R/'data/i18n/english-reviewed.json';m=json.load(open(p));a=json.load(open(O/'batumi-almaty-cultural.json'))
for e in a['additions']:
 for k,v in a['enTranslations'][e['id']].items():
  if isinstance(e.get(k),str):m[e[k]]=v
m.update({'«СДВИГ». Ансамбль солистов «Студия новой музыки» и проект Hauntology':'SHIFT: Studio for New Music Soloists Ensemble and Hauntology','«Шедевры мировой классики» — Государственный Кремлёвский оркестр':'Masterpieces of World Classics: State Kremlin Orchestra','Билет обязателен; объявление открыто для публики.':'Ticket required; the announcement is open to the public.','Цена сеанса в расписании. Итоговая стоимость, обязательные сборы и наличие уточняются у кинотеатра.':'Advertised session price. Final total, mandatory fees and availability are confirmed by the cinema.'})
for fmt in ['2D','3D','IMAX · 2D','IMAX · 3D','ScreenX · 2D','ATMOS · 2D']:m['Киносеанс · '+fmt+'.']='Film screening · '+fmt+'.'
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
