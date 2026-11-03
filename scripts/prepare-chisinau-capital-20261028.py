import pathlib,json,hashlib,copy,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/workspace/shared/chisinau-research');O=R/'data/capitals-20261028';raw=json.loads((S/'chisinau-packet.json').read_text());p=copy.deepcopy(raw)
p['coverage']='Initial verified selection, not complete Chișinău coverage. Fest.md main and 13 category pages read, with full selected dated details and named venue address markers. Later independent web checks returned HTTP429; no retry or bypass. Official/ticket reserve checks and unresolved gaps recorded separately. Public Telegram profiles/available announcement previews reviewed, not full chat history; no joined groups or messages. Precise counts and gaps are in source audit, not evidence of complete city coverage.'
p['window']={'startDate':'2026-10-28','endDate':'2026-11-26'}
for e in p['events']:
 e['min']=bool(isinstance(e.get('price'),(int,float)) and e['price']>0);e['titleEn']={'Дмитрий Спирин. Тур «Тараканы! — 35 лет»':'Dmitry Spirin — Tarakany! 35th Anniversary Tour','ВИННИ - ПУХ И ВСЕ-ВСЕ-ВСЕ':'Winnie-the-Pooh and All, All, All'}.get(e['title'],e['title']);e['venueEn']=e['venue'];e['descriptionEn']=e.get('description');e['admissionEn']=e.get('admission')
 if e['category']=='learning':e['category']='workshop'
 if e.get('time'):
  d=datetime.datetime.fromisoformat(e['date']+'T'+e['time']).replace(tzinfo=ZoneInfo('Europe/Chisinau'));e['startAt']=d.isoformat()
  if e.get('end'):
   end=datetime.datetime.fromisoformat(e['date']+'T'+e['end']).replace(tzinfo=ZoneInfo('Europe/Chisinau'))
   if end<=d:end+=datetime.timedelta(days=1)
   e['endAt']=end.isoformat()
for e in p['places']:
 e['min']=bool(isinstance(e.get('price'),(int,float)) and e['price']>0);e['titleEn']={'Дмитрий Спирин. Тур «Тараканы! — 35 лет»':'Dmitry Spirin — Tarakany! 35th Anniversary Tour','ВИННИ - ПУХ И ВСЕ-ВСЕ-ВСЕ':'Winnie-the-Pooh and All, All, All'}.get(e['title'],e['title']);e['source']=e.get('source') or 'Fest.md venue directory';e['timezone']='Europe/Chisinau';e['currency']='MDL';e['openingNoteEn']=e.get('openingNote')
for s in p['sources']:
 s['name']=s.get('name') or s.get('source') or 'Chișinău public source';s['nameEn']=s['name'];s['note']=s.get('note') or s.get('dateEvidence') or s.get('notes') or 'Source access and event import are separate.'
for r in json.loads((S/'listing-audit.json').read_text()):
 p['sources'].append({'name':'Fest.md '+r['url'].split('/')[-1]+' calendar','url':r['url'],'checkedAt':r['checkedAt'],'status':'full_listing_page_read','type':'city_calendar','note':'Actual single HTML listing read; no pagination links exposed. Historical and out-of-city candidates excluded; later QA HTTP429 stopped.'})
by={}
for s in p['sources']:
 if s['url'] not in by:by[s['url']]=s
p['sources']=list(by.values())
(O/'chisinau-packet.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n');(O/'chisinau-research.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
