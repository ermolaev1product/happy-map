#!/usr/bin/env python3
"""Combine reviewed public source snapshots; no synthetic events or recurring places."""
import json,datetime,re,unicodedata,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];INPUT=ROOT/'data/v2'
def norm(s):return re.sub(r'[^\w]+','',unicodedata.normalize('NFKD',s).lower())
def offer(e):return dict(name=e['source'],url=e['sourceUrl'],price=e.get('price'),min=e.get('min',False),checkedAt=e.get('checkedAt'))
def assemble(city):
 dest=ROOT/'dist'/({'tbilisi':'','belgrade':'belgrade','moscow':'moscow'}[city]);raw=json.loads((INPUT/(city+'-events.json')).read_text());es=raw if isinstance(raw,list) else raw['events'];out=[]
 aliases={'biletebi-sheshlilis-tserilebi-2026-10-07':'tkt:507042','biletebi-refugee-pass-2026-10-07':'tkt:507453','biletebi-refugee-pass-2026-10-09':'tkt:507455','telegram-tbilisi-dosug-26254':'tkt:507140'} if city=='tbilisi' else {}
 for e in es:
  if not '2026-10-07'<=e['date']<='2026-10-13':continue
  e=dict(e);e['category']={'cinema':'film','concert':'music','concerts':'music','party':'music','festival':'city'}.get(e.get('category'),e.get('category','other'));e['kind']='event'
  e['sources']=e.get('sources') or [offer(e)]
  if len(e['sources'])==1 and e['sources'][0].get('price') is None:e['sources']=[offer(e)]
  match=next((x for x in out if x['id']==aliases.get(e['id']) or (norm(x['title'])==norm(e['title']) and x['date']==e['date'] and x.get('time')==e.get('time') and norm(x.get('venue',''))==norm(e.get('venue','')))),None)
  if match:
   for s in e['sources']:
    if not any(t['url']==s['url'] for t in match['sources']):match['sources'].append(s)
   match['priceNote']='Цена и наличие могут различаться у источников. Сравни предложения по ссылкам.';continue
  out.append(e)
 assert len({e['id'] for e in out})==len(out)
 ps=json.loads((INPUT/(city+'-places.json')).read_text());ps=ps if isinstance(ps,list) else ps['places']
 for p in ps:
  p['kind']='place';p['source']=p.get('source') or 'Страница места';p.pop('date',None);p.pop('time',None);p['price']=None
  assert p['sourceUrl'].startswith('https://')
  assert p['category'] in ('bar','market','space')
 reg=json.loads((INPUT/(city+'-sources.json')).read_text());reg=reg if isinstance(reg,list) else reg['sources']
 for r in reg:
  r['count']=sum(any(s['name']==r['name'] for s in e['sources']) for e in out) if r.get('status')=='imported' else None
 for r in reg:
  if r.get('status')=='imported':
   r['count']=(r.get('count') or 0)+sum(p['sourceUrl'].rstrip('/').startswith(r['url'].rstrip('/')) for p in ps)
   if not r['count']:r['count']=None
 now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 coverage='События на 7–13 октября из нескольких открытых источников. Повторяющиеся анонсы объединены там, где совпадение подтверждено. Отдельно — подборка интересных мест. Это не полный реестр города; расписание, цены и отмены проверяй у организатора.'
 if isinstance(raw,dict) and raw.get('coverage'):coverage=raw['coverage']
 data=dict(startDate='2026-10-07',endDate='2026-10-13',generatedAt=now,updateMode='snapshot',coverage=coverage,events=sorted(out,key=lambda e:(e['date'],e.get('time') or '99',e['title'])),sources=[{'name':r['name'],'url':r['url'],'count':r['count']} for r in reg if r.get('status')=='imported'],sourceRegistry=reg)
 (dest/'events.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));(dest/'places.json').write_text(json.dumps(ps,ensure_ascii=False,separators=(',',':')))
 print(city,len(out),'events,',len(ps),'places')
if __name__=='__main__':
 import sys
 for city in (sys.argv[1:] or ['tbilisi','belgrade','moscow']):assemble(city)
