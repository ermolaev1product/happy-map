import json,pathlib,copy,re
R=pathlib.Path('/workspace/scratch/59f6a13c9f12/overnight-20261029/site');BASE=R.parent;O=R/'data/capitals-20261029';reg=json.loads((R/'data/city-expansion/registry.json').read_text());reviewed=json.loads((R/'data/i18n/english-reviewed.json').read_text())
configs=[('nicosia','nicosia/publisher-packet.json','Nicosia','Никосия','Никосии','Nikosia','CY','Asia/Nicosia','EUR',['EUR']),('abu-dhabi','abu-dhabi/publisher-packet.json','Abu Dhabi','Абу-Даби','Абу-Даби','Abu Dhabi','AE','Asia/Dubai','AED',['AED','USD']),('tirana','preparation/tirana/tirana-publisher-packet.json','Tirana','Тирана','Тиране','Tirana','AL','Europe/Tirane','ALL',['ALL','EUR','USD'])]
for cid,file,en,ru,loc,de,cc,tz,cur,currencies in configs:
 raw=json.loads((BASE/file).read_text());p=copy.deepcopy(raw)
 if not isinstance(p.get('coverage'),str):p['coverage']='Selected verified city programmes; partial catalogue and later-date coverage. '+json.dumps(p['coverage'],ensure_ascii=False,separators=(',',':'))
 if cid=='abu-dhabi':
  delta=json.loads((BASE/'abu-dhabi/hours-source-review-delta.json').read_text())
  for e in p['events']:
   if e['id'] in delta['eventPatches']:e.update(delta['eventPatches'][e['id']])
   if e['id'] in ['ad-421-a-writing-practice-with-sarah-afaneh-_1-20261112-1800','ad-421-maktaba-the-edible-library-with-moza-al-matrooshi-20261112-1800']:e['admission']+=' Organizer independently lists another programme at this campus and time; specific room not stated.'
  for row in p['sources']:
   match=next((x for x in delta['sourcePatches']if x['url']==row['url']),None)
   if match:row.update(match)
 if cid=='nicosia':
  for e in p['events']:
   if e['id'].startswith('nicosia-nic-37ac-'):e['venue']='Theatro Ena — lobby';e['venueEn']='Theatro Ena — lobby';e['admission']=(e.get('admission') or '')+' Readings take place in the theatre lobby, explicitly named by the organizer. Building pin shared with the theatre; exact room entrance not asserted.'
 for typ in ['events','places']:
  for e in p[typ]:
   e['cityId']=cid;e.setdefault('timezone',tz);
   if not isinstance(e.get('yearEvidence',''),str):e['yearEvidence']=json.dumps(e['yearEvidence'],ensure_ascii=False,separators=(',',':'))
   e['category']={'sports':'sport','cinema':'film','festival':'city','family':'kids','tour':'city'}.get(e['category'],e['category'])
 for s in p['sources']:s['name']=' '.join(s['name'].split());s['cityId']=cid
 (O/(cid+'-packet.json')).write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n');(O/(cid+'-research-publisher.json')).write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n')
 if not any(c['id']==cid for c in reg['newCities']):reg['newCities'].append({'id':cid,'canonicalCity':en,'countryCode':cc,'name':{'ru':ru,'en':en,'de':de},'ianaTimezone':tz,'path':cid+'/index.html','currency':cur,'allowedCurrencies':currencies,'interfaceLanguages':['ru','en'],'nameLocativeRu':loc,'defaultDateView':'week','defaultRadiusKm':0.5})
 reviewed['Map events в '+loc]=en+' event map';reviewed['Карта событий в '+loc]=en+' event map'
reg['countries']['AL']={'ru':'Албания','en':'Albania','de':'Albanien'}
(R/'data/city-expansion/registry.json').write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n');(R/'data/i18n/english-reviewed.json').write_text(json.dumps(reviewed,ensure_ascii=False,indent=2)+'\n')
