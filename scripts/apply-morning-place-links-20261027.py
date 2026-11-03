import json,copy
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'data/morning-verified-20261027'
x=json.loads(Path('/workspace/shared/hm27-place-link-patches-with-old-alias.json').read_text());feeds={};changes=[]
for p in x['patches']:
 c=p['cityId'];path=R/'public'/c/'events.json'
 if c not in feeds:feeds[c]=json.loads(path.read_text())
 e=next((e for e in feeds[c]['events'] if e['id']==p['id']),None)
 if not e:continue
 before={k:e.get(k) for k in p['patch']}
 e.update(p['patch']);e['placeIdentityCheckedAt']=x['checkedAt']
 changes.append({**p,'before':before})
for c,f in feeds.items():(R/'public'/c/'events.json').write_text(json.dumps(f,ensure_ascii=False,separators=(',',':'))+'\n')
places=[]
for p in x['newPlaces']:
 path=R/'public'/p['cityId']/'places.json';f=json.loads(path.read_text());rows=f['places'] if isinstance(f,dict) else f
 if not any(q['id']==p['id'] for q in rows):rows.append(p);places.append(p)
 path.write_text(json.dumps(f,ensure_ascii=False,separators=(',',':'))+'\n')
d=json.loads((O/'delta.json').read_text())
for e in d['added']:
 found=next((v for v in feeds.get(e['cityId'],{}).get('events',[]) if v['id']==e['id']),None)
 if found:e.update(found)
d['newPlaces']=x['newPlaces'];d['placeIdentityPatches']=changes
(O/'delta.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
(O/'place-identity-audit.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
cor=json.loads((O/'corrections.json').read_text())
for q in cor:
 found=next((v for v in feeds.get(q['cityId'],{}).get('events',[]) if v['id']==q['id']),None)
 if found:q['fullAfter']=copy.deepcopy(found);q['after']['placeId']=found.get('placeId')
(O/'corrections.json').write_text(json.dumps(cor,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'linked':len(changes),'newPlaces':len(places)}))
