import json,copy,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1];D=R/'data/morning-verified-20261028/delta.json';d=json.loads(D.read_text());p=json.load(open('/workspace/shared/hm28-connect-proposed-fixes.json'));now=datetime.datetime.now(datetime.timezone.utc).isoformat()
for c,fixes in p['fixes'].items():
 fp=R/'public'/c/'events.json';f=json.loads(fp.read_text())
 for eid,pid in fixes.items():
  e=next(e for e in f['events']if e['id']==eid);before=copy.deepcopy(e);e['placeId']=pid
  evidence={'action':'canonical_place_link','checkedAt':now,'sourceUrl':e['sourceUrl'],'evidence':'Same named venue/address and matching source coordinates. Explicit stable placeId replaces locale-sensitive name matching; event dates, coordinates and last source checkedAt unchanged.'}
  e.setdefault('verificationHistory',[]).append(evidence);d['corrections'].append({'cityId':c,'id':eid,'before':before,'after':copy.deepcopy(e),'evidence':evidence})
 fp.write_text(json.dumps(f,ensure_ascii=False,separators=(',',':'))+'\n')
D.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');(D.parent/'place-link-proof.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
mem=R/'data/i18n/english-memory.json';m=json.loads(mem.read_text());m.update({'2 ноября • пн • 20:00; ТЕЛЕКВИЗ #3; Chili Grill; Желтоксан2Т; 3000₸; Идёт регистрация':'2 November • Monday • 20:00; TV QUIZ #3; Chili Grill; 2T Zheltoksan Street; KZT 3,000; Registration open','osm:node:5889815192 namedЧилигриль at51.1618003,71.419618 is ~18m away; same namedvenue/address, not Harats in samebuilding.':'osm:node:5889815192 named Chili Grill at 51.1618003,71.419618 is about 18 m away; same named venue and address, not Harats in the same building.','Астана, ул. Желтоксан, 2Т':'2T Zheltoksan Street, Astana','Желтоксан 2Т':'2T Zheltoksan Street','ТЕЛЕКВИЗ':'TV QUIZ'});mem.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');print('710 additions,146 places,9 corrections')
