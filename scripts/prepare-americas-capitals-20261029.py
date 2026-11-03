import json,pathlib,copy,re
R=pathlib.Path('/workspace/scratch/59f6a13c9f12/overnight-20261029/site');BASE=R.parent;O=R/'data/capitals-20261029';reg=json.loads((R/'data/city-expansion/registry.json').read_text());reviewed=json.loads((R/'data/i18n/english-reviewed.json').read_text())
configs=[('mexico-city','mexico-city/publisher-packet.json','Mexico City','Мехико','Мехико','Mexiko-Stadt','MX','America/Mexico_City','MXN',['MXN']),('ottawa','preparation/ottawa/ottawa-publisher-packet.json','Ottawa','Оттава','Оттаве','Ottawa','CA','America/Toronto','CAD',['CAD']),('hanoi','report/hanoi/publisher-packet.json','Hanoi','Ханой','Ханое','Hanoi','VN','Asia/Ho_Chi_Minh','VND',['VND'])]
for cid,file,en,ru,loc,de,cc,tz,cur,currencies in configs:
 raw=json.loads((BASE/file).read_text());p=copy.deepcopy(raw)
 if not isinstance(p.get('coverage'),str):p['coverage']='Selected verified city programmes; partial catalogue and later-date coverage. '+json.dumps(p['coverage'],ensure_ascii=False,separators=(',',':'))
 for typ in ['events','places']:
  for e in p[typ]:
   e['cityId']=cid;e.setdefault('timezone',tz);
   if not isinstance(e.get('yearEvidence',''),str):e['yearEvidence']=json.dumps(e['yearEvidence'],ensure_ascii=False,separators=(',',':'))
   e['category']={'sports':'sport','cinema':'film','festival':'city','family':'kids','tour':'city'}.get(e['category'],e['category'])
 for s in p['sources']:s['name']=' '.join(s['name'].split());s['cityId']=cid
 (O/(cid+'-packet.json')).write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n');(O/(cid+'-research-publisher.json')).write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n')
 if not any(c['id']==cid for c in reg['newCities']):reg['newCities'].append({'id':cid,'canonicalCity':en,'countryCode':cc,'name':{'ru':ru,'en':en,'de':de},'ianaTimezone':tz,'path':cid+'/index.html','currency':cur,'allowedCurrencies':currencies,'interfaceLanguages':['ru','en'],'nameLocativeRu':loc,'defaultDateView':'week','defaultRadiusKm':0.5})
 reviewed['Map events в '+loc]=en+' event map';reviewed['Карта событий в '+loc]=en+' event map'
reg['countries'].update({'MX':{'ru':'Мексика','en':'Mexico','de':'Mexiko'},'CA':{'ru':'Канада','en':'Canada','de':'Kanada'},'VN':{'ru':'Вьетнам','en':'Vietnam','de':'Vietnam'}})
(R/'data/city-expansion/registry.json').write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n');(R/'data/i18n/english-reviewed.json').write_text(json.dumps(reviewed,ensure_ascii=False,indent=2)+'\n')
