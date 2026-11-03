import json,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1];now=datetime.datetime.now(datetime.timezone.utc).isoformat();audit=[]
for locale in ['','en/']:
 p=R/('public/'+locale+'events.json');d=json.load(open(p));by={e['id']:e for e in d['events']}
 for canonical,duplicate,url in [('n23:1834fc3fa2390cd9','research-20261015-tbilisi-14','https://art.gov.ge/en/event/ucha-japaridze-120/'),('n23:2820db71477d4cf8','research-20261015-tbilisi-15','https://art.gov.ge/en/event/kochar-the-multidimensional-genius-tiflis-paris-yerevan/')]:
  a,b=by[canonical],by[duplicate];before={k:a.get(k) for k in ['date','sourceUrl','checkedAt']};a['date']=b['date'];a['sourceUrl']=url;a['checkedAt']=now;a.setdefault('sources',[])
  for s in [{'name':'Official exhibition programme','url':url},{'name':'Earlier public announcement','url':'https://t.me/ProGeorgian/34588'}]:
   if not any(x.get('url')==s['url'] for x in a['sources']):a['sources'].append(s)
  a.setdefault('correctionHistory',[]).append({'checkedAt':now,'reason':'Merged duplicate official/Telegram programme evidence; retained canonical ID. Official range confirmed.','sourceUrl':url,'previous':before,'duplicateId':duplicate})
  b['publicationStatus']='held_for_recheck';b['duplicateOf']=canonical;b['publicationNote']='Confirmed duplicate programme retained for audit; canonical record carries combined evidence.';b['duplicateCheckedAt']=now
  audit.append({'locale':locale or 'ru','canonicalId':canonical,'duplicateId':duplicate,'sourceUrl':url,'date':a['date'],'endDate':a.get('endDate'),'checkedAt':now})
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2))
(R/'data/refresh-20261020/exhibition-dedup.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
