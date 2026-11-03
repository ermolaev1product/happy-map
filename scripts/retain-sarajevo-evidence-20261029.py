import json,pathlib
R=pathlib.Path(__file__).resolve().parents[1];p=json.loads((R/'data/capitals-20261029/sarajevo-packet.json').read_text());by={e['id']:e for e in p['events']}
for f in [R/'public/sarajevo/events.json']:
 d=json.loads(f.read_text())
 for e in d['events']:
  for k in ['programmeId','placeId','mandatoryFees','feeStatus','coordinateCheckedAt','durationEvidence','endEvidence']:
   if k in by[e['id']]:e[k]=by[e['id']][k]
 f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
