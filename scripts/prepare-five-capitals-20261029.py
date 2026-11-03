import json,pathlib,copy,re
R=pathlib.Path('/workspace/scratch/59f6a13c9f12/overnight-20261029/site');BASE=R.parent;O=R/'data/capitals-20261029';reg=json.loads((R/'data/city-expansion/registry.json').read_text());reviewed=json.loads((R/'data/i18n/english-reviewed.json').read_text())
configs=[('valletta', 'report/valletta-breadth/publisher-packet.json', 'Valletta', 'Валлетта', 'Валлетте', 'Valletta', 'MT', 'Europe/Malta', 'EUR', ['EUR']), ('doha', 'doha/publisher-packet.json', 'Doha', 'Доха', 'Дохе', 'Doha', 'QA', 'Asia/Qatar', 'QAR', ['QAR']), ('manama', 'preparation/manama/manama-publisher-packet.json', 'Manama', 'Манама', 'Манаме', 'Manama', 'BH', 'Asia/Bahrain', 'BHD', ['BHD']), ('tokyo', 'preparation/tokyo/tokyo-publisher-packet.json', 'Tokyo', 'Токио', 'Токио', 'Tokio', 'JP', 'Asia/Tokyo', 'JPY', ['JPY']), ('seoul', 'report/seoul/publisher-packet.json', 'Seoul', 'Сеул', 'Сеуле', 'Seoul', 'KR', 'Asia/Seoul', 'KRW', ['KRW'])]
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
reg['countries'].update({'MT':{'ru':'Мальта','en':'Malta','de':'Malta'},'QA':{'ru':'Катар','en':'Qatar','de':'Katar'},'BH':{'ru':'Бахрейн','en':'Bahrain','de':'Bahrain'},'JP':{'ru':'Япония','en':'Japan','de':'Japan'},'KR':{'ru':'Южная Корея','en':'South Korea','de':'Südkorea'}})
(R/'data/city-expansion/registry.json').write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n');(R/'data/i18n/english-reviewed.json').write_text(json.dumps(reviewed,ensure_ascii=False,indent=2)+'\n')
