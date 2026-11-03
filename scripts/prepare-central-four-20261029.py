import json,pathlib,copy,re
R=pathlib.Path('/workspace/scratch/59f6a13c9f12/overnight-20261029/site');BASE=R.parent;O=R/'data/capitals-20261029';reg=json.loads((R/'data/city-expansion/registry.json').read_text());reviewed=json.loads((R/'data/i18n/english-reviewed.json').read_text())
configs=[('asuncion','preparation/asuncion/asuncion-publisher-packet.json','Asunción','Асунсьон','Асунсьоне','Asunción','PY','America/Asuncion','PYG',['PYG','EUR']),('guatemala-city','guatemala-city/publisher-packet.json','Guatemala City','Гватемала','Гватемале','Guatemala-Stadt','GT','America/Guatemala','GTQ',['GTQ']),('panama-city','report/panama/publisher-packet.json','Panama City','Панама','Панаме','Panama-Stadt','PA','America/Panama','USD',['USD']),('san-salvador','san-salvador/publisher-packet.json','San Salvador','Сан-Сальвадор','Сан-Сальвадоре','San Salvador','SV','America/El_Salvador','USD',['USD'])]
for cid,file,en,ru,loc,de,cc,tz,cur,currencies in configs:
 raw=json.loads((BASE/file).read_text());p=copy.deepcopy(raw)
 if not isinstance(p.get('coverage'),str):p['coverage']='Selected verified city programmes; partial catalogue and later-date coverage. '+json.dumps(p['coverage'],ensure_ascii=False,separators=(',',':'))
 for typ in ['events','places']:
  for e in p[typ]:
   e['cityId']=cid;e.setdefault('timezone',tz);
   if not isinstance(e.get('yearEvidence',''),str):e['yearEvidence']=json.dumps(e['yearEvidence'],ensure_ascii=False,separators=(',',':'))
   if e.get('dateType')=='published_interval' and e.get('visitSchedule')=={}:e.pop('visitSchedule')
   e['category']={'sports':'sport','cinema':'film','festival':'city','family':'kids','tour':'city','literature':'talk'}.get(e['category'],e['category'])
 for s in p['sources']:s['name']=' '.join(s['name'].split());s['cityId']=cid
 (O/(cid+'-packet.json')).write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n');(O/(cid+'-research-publisher.json')).write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n')
 if not any(c['id']==cid for c in reg['newCities']):reg['newCities'].append({'id':cid,'canonicalCity':en,'countryCode':cc,'name':{'ru':ru,'en':en,'de':de},'ianaTimezone':tz,'path':cid+'/index.html','currency':cur,'allowedCurrencies':currencies,'interfaceLanguages':['ru','en'],'nameLocativeRu':loc,'defaultDateView':'week','defaultRadiusKm':0.5})
 reviewed['Map events в '+loc]=en+' event map';reviewed['Карта событий в '+loc]=en+' event map'
reg['countries'].update({'PY':{'ru':'Парагвай','en':'Paraguay','de':'Paraguay'},'GT':{'ru':'Гватемала','en':'Guatemala','de':'Guatemala'},'PA':{'ru':'Панама','en':'Panama','de':'Panama'},'SV':{'ru':'Сальвадор','en':'El Salvador','de':'El Salvador'}})
(R/'data/city-expansion/registry.json').write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n');(R/'data/i18n/english-reviewed.json').write_text(json.dumps(reviewed,ensure_ascii=False,indent=2)+'\n')
