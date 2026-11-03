#!/usr/bin/env python3
"""Apply source-reviewed additions to v146; never replace or trim prior city data."""
import json,subprocess,collections,re
from pathlib import Path
R=Path(__file__).resolve().parents[1];packet=json.loads((R/'data/coverage-20261016/release.json').read_text());BASE=packet['baseCommit']
def prior(path):return json.loads(subprocess.check_output(['git','show',BASE+':'+path],cwd=R))
rows=[]
for city in sorted({e['cityId'] for k in ['events','places','osmPlaces'] for e in packet[k]} | {e['cityId'] for e in packet.get('existingUpdates',[])}):
 prefix='public/'+('' if city=='tbilisi' else city+'/');report={'city':city}
 for kind in ['events','places']:
  path=prefix+kind+'.json';d=prior(path);base=d if isinstance(d,list) else d[kind];add=[e for k in ([kind] if kind=='events' else ['places','osmPlaces']) for e in packet[k] if e['cityId']==city];ids={e['id'] for e in base}
  assert len(ids)==len(base);assert len({e['id'] for e in add})==len(add);assert not ids&{e['id'] for e in add},city+' existing ID collision'
  
  if kind=='events':
   for update in packet.get('existingUpdates',[]):
    if update['cityId']==city:
     match=next(e for e in base if e['id']==update['id']);match.update(update['changes'])
  values=base+add
  if isinstance(d,list):d=values
  else:
   d[kind]=values;d['lastCoverageRefresh']={'checkedAt':packet['checkedAt'],'addedRecords':len(add),'scope':'Source-reviewed additions; not a complete city census or operating-status verification.'}
   if kind=='events' and add:d['endDate']=max([d.get('endDate','')]+[e.get('endDate') or e['date'] for e in add])
   if kind=='places' and city in packet['osmMetadata']:
    d['osmDirectoryImport']=packet['osmMetadata'][city];d['osmDirectoryImport'].pop('places',None)
  (R/path).write_text(json.dumps(d,ensure_ascii=False,indent=2 if kind=='events' else None,separators=None if kind=='events' else (',',':'))+'\n');report[kind]={'before':len(base),'added':len(add),'after':len(values)}
 rows.append(report)

js=R/'public/catalog-modes.js';text=js.read_text();reviewed=json.loads(re.search(r' const reviewed=(\[.*?\]);\n',text).group(1));keys={(r['city'],r['id'],r['date']) for r in reviewed}
for row in packet.get('classifications',[]):
 if (row['city'],row['id'],row['date']) not in keys:reviewed.append(row)
text=re.sub(r' const reviewed=\[.*?\];\n',lambda _: ' const reviewed='+json.dumps(reviewed,ensure_ascii=False,separators=(',',':'))+';\n',text,count=1);js.write_text(text)
print(json.dumps({'base':BASE,'cities':rows},ensure_ascii=False,indent=2))
