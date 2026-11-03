#!/usr/bin/env python3
"""Apply the reviewed, bounded 20-city conference packet idempotently to v145.
Never discovers records, guesses times/coordinates, or rewrites existing event facts.
"""
from pathlib import Path
import json, subprocess, re, collections
ROOT=Path(__file__).resolve().parents[1]
PACKET=ROOT/'data/conferences/release-2026-10-16.json'
p=json.loads(PACKET.read_text());base=p['baseCommit'];cities={x['id']:x for x in json.loads((ROOT/'public/city-picker.json').read_text())['cities']}
def old(path):return json.loads(subprocess.check_output(['git','show',base+':'+path],cwd=ROOT))
def feed_path(city):return 'public/'+('' if city=='tbilisi' else city+'/')+'events.json'
bycity=collections.defaultdict(list)
for e in p['events']:
 assert e['cityId'] in cities and e.get('id') and e.get('title') and e.get('sourceUrl','').startswith('https://')
 assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',e['date'])
 assert e.get('time') is None or re.fullmatch(r'\d\d:\d\d',e['time'])
 assert (e.get('lat') is None)==(e.get('lng') is None), e['id']
 if e.get('lat') is not None:assert -90<=e['lat']<=90 and -180<=e['lng']<=180 and e.get('coordinateSource'),e['id']
 assert e.get('price') is None or (e['price']>=0 and e.get('currency') and e.get('priceLabel')),e['id']
 bycity[e['cityId']].append(e)
updatesByCity=collections.defaultdict(list)
for u in p.get('existingUpdates',[]):updatesByCity[u['cityId']].append(u);bycity[u['cityId']]
rows=[]
for city,additions in sorted(bycity.items()):
 path=feed_path(city);d=old(path);ids={e['id'] for e in d['events']};assert len({e['id'] for e in additions})==len(additions)
 for e in additions:assert e['id'] not in ids,'Existing IDs must be classification-only: '+e['id']
 for update in updatesByCity[city]:
  matches=[e for e in d['events'] if e['id']==update['id'] and e['date']==update['date']];assert len(matches)==1,update['id']
  if update.get('operation')=='cancellation':assert matches[0].get('sourceUrl','').startswith('https://t.me/framespb/') and update['changes'].get('cancelled') is True
  elif update.get('operation')=='programme_listing_policy':assert set(update['changes'])=={'listingPolicy','listingPolicySource','listingPolicyEvidence'} and update['changes']['listingPolicy']=='dated_programme' and update['changes']['listingPolicySource'].startswith('https://')
  else:raise AssertionError('Unreviewed existing-row operation')
  matches[0].update(update['changes'])
 d['events'].extend(additions)
 d['endDate']=max([d.get('endDate','')]+[e.get('endDate') or e['date'] for e in additions])
 d['lastConferencesRefresh']={'checkedAt':p['checkedAt'],'scope':'Source-verified conferences and intellectual/professional talks; not a full city refresh','addedOccurrences':len(additions),'statusCorrections':len(updatesByCity[city]),'programmeIds':sorted({e['programmeId'] for e in additions})}
 (ROOT/path).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 rows.append({'city':city,'oldRows':len(d['events'])-len(additions),'addedOccurrences':len(additions),'newProgrammes':len({e['programmeId'] for e in additions})})
# Reviewed IDs/dates do not replace event data or collapse separate sessions.
reviewed=p['classifications'];keys=set()
for r in reviewed:
 key=(r['city'],r['id'],r['date']);assert key not in keys,key;keys.add(key)
 data=json.loads((ROOT/feed_path(r['city'])).read_text())
 assert sum(e['id']==r['id'] and e['date']==r['date'] for e in data['events'])==1,key
js=ROOT/'public/catalog-modes.js';s=js.read_text();s,n=re.subn(r' const reviewed=\[.*?\];\n',lambda _: ' const reviewed='+json.dumps(reviewed,ensure_ascii=False,separators=(',',':'))+';\n',s,count=1);assert n==1;js.write_text(s)
print(json.dumps({'applied':True,'cities':rows,'reviewedOccurrences':len(reviewed)},ensure_ascii=False))
