import json,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'data/refresh-20261020';now=datetime.datetime.now(datetime.timezone.utc).isoformat()
a=json.load(open('/workspace/shared/batumi_almaty_additions_oct20_2026.json'));b=json.load(open('/workspace/shared/happymap_oct20_verified_additions_survey.json'))
(O/'batumi-almaty-cultural.json').write_text(json.dumps(a,ensure_ascii=False,indent=2));(O/'other-cultural.json').write_text(json.dumps(b,ensure_ascii=False,indent=2))
items=[{'city':e['cityId'],'event':e} for e in a['additions']]+[{'city':x['cityKey'],'event':x['event']} for x in b['verifiedAdditions']];report=[]
for locale in ['','en/']:
 for city in sorted({x['city'] for x in items}|{'limassol'}):
  p=R/('public/'+locale+city+'/events.json');d=json.load(open(p));ids={e['id'] for e in d['events']}
  for x in items:
   if x['city']!=city:continue
   e=dict(x['event']);assert e['id'] not in ids,e['id']
   if locale:e.update(a.get('enTranslations',{}).get(e['id'],{}))
   if 'terrible-happiness' in e['id']:e['endTimeMethod']='Calculated from organizer-published 140-minute duration, not independently advertised ending.'
   e['mandatoryFees']=e.get('mandatoryFees');d['events'].append(e);ids.add(e['id'])
   if not locale:report.append({'city':city,'event':e})
  if city=='limassol':
   for correction in a['corrections']:
    for e in d['events']:
     if e['id'] in correction['ids']:
      before={k:e.get(k) for k in correction['patch']};e.update(correction['patch']);e.setdefault('correctionHistory',[]).append({'checkedAt':now,'previous':before,'sourceUrl':correction['evidence']['source_url'],'reason':'Official municipal announcement confirms free admission; daily hours remain unknown.'})
  d['generatedAt']=now;p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 # add verified cinema place once
 p=R/('public/'+locale+'batumi/places.json');d=json.load(open(p));place=json.load(open(O/'batumi-grand-mall-venue.json'))
 if not any(x['id']==place['id'] for x in d['places']):d['places'].append(place)
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
(O/'cultural-additions.json').write_text(json.dumps({'additions':report},ensure_ascii=False,indent=2));print('Added',len(report),'non-cinema occurrences')
