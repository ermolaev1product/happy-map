import json,pathlib,datetime
R=pathlib.Path(__file__).resolve().parents[1];ids={'bubilet-ankara-20393-venue-1892-20261030-2000','bubilet-ankara-25721-venue-1892-20261030-2000','bubilet-ankara-18699-venue-2265-20261108-1500','bubilet-ankara-11666-venue-2265-20261108-1500'};f=R/'data/capitals-20261029/ankara-packet.json';p=json.loads(f.read_text());held=[]
for e in p['events']:
 if e['id'] in ids:held.append({'id':e['id'],'cityId':'ankara','status':'held_for_recheck','reason':'Different advertised programmes have the same venue/date/time; separate rooms or distinct admission not established in retained full source bodies. Seating plans alone do not resolve room conflict. Only this occurrence held; other dates retained.','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reviewType':'retained_source_content_review_not_new_fetch','candidate':e})
assert len(held)==4;p['pending']+=held;p['events']=[e for e in p['events']if e['id']not in ids];p['coverage']+=' Four overlapping venue/time occurrences are held pending room or programme clarification.';f.write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
f=R/'public/ankara/events.json';d=json.loads(f.read_text());d['events']=[e for e in d['events']if e['id']not in ids];f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');(R.parent/'audit/ankara-conflict-holds.json').write_text(json.dumps(held,ensure_ascii=False,indent=2)+'\n')
# Source imported-count fields reflect only the surviving records.
f=R/'public/ankara/source-registry.json';d=json.loads(f.read_text());rows=d.get('sources',[])if isinstance(d,dict)else d
for s in rows:
 if s.get('count') is not None:s['count']=sum(e['sourceUrl']==s['url']for e in p['events'])
f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(set(e['programmeId']for e in p['events'])),len(p['pending']))
