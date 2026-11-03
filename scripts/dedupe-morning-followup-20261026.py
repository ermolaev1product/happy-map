# coding: utf-8
import json,copy
from pathlib import Path
O=Path('data/morning-control-20261026');d=json.loads((O/'delta.json').read_text());p=Path('public/moscow/events.json');f=json.loads(p.read_text());es=f['events'];new=next(e for e in es if e['id']=='m26f-moscow-fb2140f4a17c0d');old=next(e for e in es if e['id']=='research-msk-cf60db291e42437d');before=copy.deepcopy(old)
old.update(sourceUrl=new['sourceUrl'],checkedAt=new['checkedAt'],sourceURLs=[before['sourceUrl'],new['sourceUrl']],ageRestriction='12+',accessType='public',accessNote=new['accessNote'],yearEvidence=new['yearEvidence'])
d['updated'].append({'cityId':'moscow','id':old['id'],'before':before,'after':copy.deepcopy(old),'reason':'Semantic duplicate resolved by same local date,time,title and named venue despite previous sourceUrl pointing at venue. Preserve original ID; attach direct official event source and verified admission facts.'})
d['duplicates'].append({'cityId':'moscow','candidateId':new['id'],'existingId':old['id'],'date':old['date'],'reason':'Exact title/date/time/venue; original used a venue URL, not event URL. Merged before publication.'});f['events']=[e for e in es if e['id']!=new['id']];d['added']=[e for e in d['added'] if e['id']!=new['id']];p.write_text(json.dumps(f,ensure_ascii=False,indent=2)+'\n')
for name,key in [('delta',None),('added-events','added'),('existing-corrections','updated'),('deduplication','duplicates')]: (O/(name+'.json')).write_text(json.dumps(d if key is None else d[key],ensure_ascii=False,indent=2)+'\n')
p=Path('data/i18n/english-reviewed.json');m=json.loads(p.read_text());m[old['title']]='Borisov-Musatov and the Artistic Avant-Garde of the Early 20th Century';p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print('Additions',len(d['added']),'corrections',len(d['updated']))
