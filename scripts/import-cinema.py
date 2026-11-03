from pathlib import Path
import re,json,datetime,urllib.parse,urllib.request,collections,argparse
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description='Import public dated Tbilisi cinema sessions; fail closed before writing on source-format changes.')
parser.add_argument('--start',default=datetime.datetime.now(ZoneInfo('Asia/Tbilisi')).date().isoformat())
parser.add_argument('--output',type=Path,default=ROOT.parent/'public/events.json')
parser.add_argument('--cache',type=Path,required=True,help='Directory for public source snapshots')
parser.add_argument('--offline',action='store_true',help='Use existing date-named snapshots only')
args=parser.parse_args(); start_date=datetime.date.fromisoformat(args.start);args.cache.mkdir(parents=True,exist_ok=True)
venues={
 'Amirani':('36/1 Merab Kostava Street, Tbilisi',41.7080047,44.7857271,'https://ge.kinoafisha.info/en/tbilisi/cinema/8326516/'),
 'Cavea Galleria':('2/4 Shota Rustaveli Avenue, Galleria Tbilisi',41.6944168,44.8003731,'https://maps.app.goo.gl/HMKz21pxxZhQ9grb6'),
 'Cavea Tbilisi Mall':('16th km Davit Aghmashenebeli Avenue, Tbilisi Mall',41.8177463,44.7722754,'https://maps.app.goo.gl/53w5QGRk73roPZbXA'),
 'Cavea East Point':('2 Aleksandre Tvalchrelidze Street, East Point, Tbilisi',41.6894294,44.8962253,'https://maps.app.goo.gl/77jjMjGFFVHAc1CP8'),
 'Cavea City Mall Saburtalo':('70 Vazha Pshavela Avenue, City Mall, Tbilisi',41.7240762,44.7370463,'https://maps.app.goo.gl/Atzyfrz5LzPCrKcK8')}
def flight(s):
 out=''
 for t in re.findall(r'<script>(self.__next_f.push\(.*?)</script>',s):
  try:
   v=json.loads(t[len('self.__next_f.push('):-1]);out+=v[1] if isinstance(v[1],str) else ''
  except (ValueError,IndexError):pass
 return out
def field(s,key):
 p=s.index('"'+key+'":')+len(key)+3
 return json.JSONDecoder().raw_decode(s[p:])[0]
checked=datetime.datetime.now(datetime.timezone.utc).isoformat(); events=[];counts={};excluded=[]
for offset in range(7):
 date=(start_date+datetime.timedelta(days=offset)).isoformat(); cache=args.cache/(date+'.html')
 if not args.offline:
  url='https://kinoafisha.ge/sessions?date='+datetime.date.fromisoformat(date).strftime('%d-%m-%Y')+'&lang=eng'
  request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; Noreli catalog research)','Accept':'text/html'})
  with urllib.request.urlopen(request,timeout=30) as response: cache.write_text(response.read().decode('utf-8'))
 s=flight(cache.read_text()); sessions=field(s,'sessions');movies={m['id']:m for m in field(s,'movies')};n=0
 for x in sessions:
  name=x['cinemaNameEng'];parts=x['_id'].split('/');dt=datetime.datetime.strptime(parts[-2],'%d-%m-%Y').date().isoformat()
  if dt!=date:raise ValueError('Source ignored requested date')
  if name not in venues:excluded.append(name);continue
  m=movies[x['movieId']];address,lat,lng,coord=venues[name];t=parts[-1];duration=m.get('duration');start=datetime.datetime.fromisoformat(date+'T'+t+'+04:00');end=(start+datetime.timedelta(minutes=duration)).strftime('%H:%M') if duration else None
  prices=json.loads(x.get('prices') or '{}');price=prices.get('std');price=float(price) if price is not None else None
  lang={'eng':'EN','geo':'KA','rus':'RU'}.get(x.get('session_language'),x.get('session_language'))
  fmt=' · '.join(label for key,label in [('is_3d','3D'),('is_imax','IMAX'),('is_screenx','ScreenX'),('is_atmos','Dolby Atmos')] if x.get(key)) or '2D';url='https://kinoafisha.ge/booking/'+urllib.parse.quote(x['_id'],safe='')
  events.append({'id':'cinema:'+x['_id'],'title':m.get('name_eng') or m['name'],'date':date,'time':t,'startAt':start.isoformat(),'end':end,'venue':name,'venueId':'cinema:'+x['cinemaId'],'address':address,'lat':lat,'lng':lng,'coordinateSource':coord,'category':'film','language':lang,'price':price,'currency':'GEL','min':price is not None,'priceNote':'Цена стандартного места из расписания. Итоговая стоимость и наличие — у кинотеатра.','description':f"Киносеанс · {fmt}. Продолжительность: {duration} мин."+(' Субтитры: '+str(x['subtitle_language'])+'.' if x.get('subtitle_language') else ''),'source':'Kinoafisha · киносеансы','sourceUrl':url,'sources':[{'name':'Расписание на выбранную дату','url':'https://kinoafisha.ge/sessions?date='+parts[-2]+'&lang=eng'}],'checkedAt':checked,'imageUrl':m.get('posterUrl'),'cinemaSession':True,'format':fmt,'duration':duration});n+=1
 counts[date]=n
catalog=json.loads(args.output.read_text());catalog['events']=[x for x in catalog['events'] if not x.get('cinemaSession')]+events
assert len({e['id'] for e in events})==len(events), 'Duplicate source session IDs'
assert events, 'No cinema sessions found; preserve previous catalog'
catalog['generatedAt']=checked;catalog['cinemaCoverage']={'source':'https://kinoafisha.ge/sessions?lang=eng','checkedAt':checked,'dailyCounts':counts,'note':'Только опубликованные сеансы. Расписание на более поздние дни может быть неполным; ноль записей не означает отсутствие кинопоказов.'}
catalog['sourceRegistry']=[x for x in catalog['sourceRegistry'] if x.get('name')!='Kinoafisha · киносеансы']+[{'name':'Kinoafisha · киносеансы','url':'https://kinoafisha.ge/sessions?lang=eng','status':'imported','note':'Датированные сеансы пяти кинотеатров Тбилиси; Батуми и Хашури исключены.'}]
args.output.write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')))
(args.cache/'cinema-import-report.json').write_text(json.dumps({'checkedAt':checked,'counts':counts,'total':len(events),'venues':list(venues),'excludedOtherCities':dict(collections.Counter(excluded))},ensure_ascii=False,indent=2))
print('Imported',len(events),'sessions;',counts)
