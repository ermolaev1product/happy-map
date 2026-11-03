"""Apply an editorial, source-backed review. Never infer beer prices from average spend."""
import json, re, datetime
from urllib.parse import quote_plus
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'public/places.json'
places = json.loads(path.read_text())
before = len(places)
stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
reviewed = []

def save(p, sources, status):
    p['sourceURLs'] = list(dict.fromkeys([*p.get('sourceURLs', []), *sources]))
    p['reviewedAt'] = stamp
    p['reviewScope'] = 'Название, адрес и категория по публичным карточкам; работа сегодня не подтверждена звонком.'
    reviewed.append({'id': p['id'], 'title': p['title'], 'status': status, 'sources': sources})

def add(name, address, lat, lng, source, description, slug, more=None):
    pid = 'tbi-reviewed-' + slug
    p = next((p for p in places if p['id'] == pid), None)
    status = 'updated' if p else 'added'
    if not p:
        p = {'id':pid,'kind':'place','city':'Tbilisi','title':name,'venue':name,
             'category':'bar','placeType':'Бар','price':None,'currency':'GEL',
             'openingHours':None,'openingNote':'Проверь часы и условия посещения на странице заведения.',
             'programStatus':'not_found','provenance':'public-venue-review'}
        places.append(p)
    p.update(address=address,lat=lat,lng=lng,description=description,concept=description,
             source=source[0],sourceUrl=source[1],coordinateSource=source[1],checkedAt=stamp)
    if more: p.update(more)
    save(p,[source[1]],status)
    return p

# Google Maps public cards inspected on 8 October 2026. Each row has its own place identifier.
google = [
 ('27 Wine Cellar & Shop','27 Mikheil Zandukeli St',41.7042847,44.7841471,'ChIJASwUCAANREAROSmgiOESat0','Винный бар и магазин','27-wine'),
 ('Café Bar Khval','7 Dimitri Bakradze St',41.7056315,44.7861853,'ChIJ8SADw10NREARD8fBl7SkPB8','Кафе-бар','khval'),
 ('Wine Boutique Tbilisi','17 Anastasia Eristavi-Khoshtaria St',41.7030405,44.7851318,'ChIJ7fXex00NREARENX7A8Kf3x0','Винный бар','wine-boutique'),
 ('Misty Bar','37 Akaki Shanidze St',41.7044394,44.7796535,'ChIJXztCcwANREARtqcM_Mz7IsU','Бар с кальянами','misty'),
 ('MEGHVINE · Wine Shop & Bar','38 Erekle Tatishvili St',41.7045309,44.7832666,'ChIJTYOVSqYNREARNdlkknx_8uE','Винный магазин и бар','meghvine'),
 ('Impulse','4 Vertskhli Turn',41.695561,44.8036286,'ChIJlXzJjfMNREARI5GJv4n9bGg','Винный бар','impulse'),
 ('Stand Sanpachi','38 Mikheil Zandukeli St',41.7041248,44.7844758,'ChIJMTz2CQANREARlCvUIJdZGrA','Японский бар с закусками','stand-sanpachi'),
]
for name, address, lat, lng, ref, kind, slug in google:
    url = 'https://www.google.com/maps/search/?api=1&query='+quote_plus(name)+'&query_place_id='+ref
    add(name,address+', Тбилиси',lat,lng,('Google Maps',url),kind+'. Адрес и расположение сверены с публичной карточкой. Расписание отдельных вечеров пока не найдено.',slug,{'placeType':kind,'googlePlaceId':ref})

add('Choosh Bar','Реваза Табукашвили, 14, Тбилиси',41.69785,44.80155,
    ('Madloba','https://madloba.info/tbilisi/bars/choosh-bar/'),
    'Бар у площади Орбелиани. Крафтовое пиво, настольные игры и кикер упоминаются в публичных карточках; программу конкретного вечера проверь отдельно.',
    'choosh',{'website':'https://www.instagram.com/chooshbar','sourceURLs':['https://yandex.com.ge/maps/org/choosh_bar/77362225122/']})

add('Nino Meris Wine Selection','Сиони, 13, Тбилиси',41.691017,44.806924,
    ('Georgian National Tourism Administration','https://places.georgia.travel/en/establishments/nino-meris-wine-selection'),
    'Винный бар и магазин с винами небольших грузинских хозяйств. Проводит дегустации; дату, состав и стоимость нужно уточнять у площадки.',
    'nino-meris',{'placeType':'Винный бар','aliases':['Millésime – Nino Meris Wine Shop'],
    'coordinateSource':'https://yandex.com.ge/maps/10277/tbilisi/house/YE0YfgdmQEcDQFprfXp4cHxiYg%3D%3D/',
    'openingNote':'Точка обозначает здание. Часы в справочниках расходятся; уточни перед визитом.',
    'website':'https://www.instagram.com/ninomeriswineselection/'})

add('Rolling Stone Rooftop Bar','Руставели, 31 · крыша Telegraph Hotel, Тбилиси',41.7031922976149,44.7938459945352,
    ('Telegraph Hotel','https://telegraphhotel.com/restaurants-bars/rolling-stone-rooftop-bar/'),
    'Бар на крыше Telegraph Hotel: коктейли, еда и музыкальные вечера. Конкретные концерты показываем только при наличии датированного анонса.',
    'rolling-stone',{'openingHours':'Ежедневно 08:00–01:00','coordinateSource':'https://tkt.ge/event/507390',
    'openingNote':'Точка обозначает здание Telegraph Hotel. Уточни вход на крышу и условия конкретного вечера.'})

add('Weather Report Sky Bar','Ильи Чавчавадзе, 37м · Pullman Axis Towers, 37-й этаж, Тбилиси',41.7116,44.7562,
    ('Pullman / Accor','https://all.accor.com/hotel/A1F1/index.en.shtml'),
    'Коктейльный бар на 37-м этаже Pullman Axis Towers. Панорамный вид на город, напитки и тапас.',
    'weather-report',{'openingNote':'На карте отмечено здание отеля; бар на 37-м этаже. Условия входа и бронирования уточни у площадки.'})

# Existing places keep stable IDs and original provenance, so saved plans remain valid.
updates = [
 ('osm:node:11240967345','22 Mikheil Zandukeli St','ChIJsyMMJikNREAR09PaZn_f1hs','Паб'),
 ('osm:node:3156150103','27 Mikheil Zandukeli St','ChIJEXqwRhMNREARniJgXFzGPdY','Винный ресторан'),
 ('osm:node:11389763488','19 Merab Kostava St','ChIJtVRCnhoNREAR1Nz75o0zq0U','Крафтовый бар'),
 ('osm:node:12285318501','10/1 Akaki Khorava St','ChIJM-_Nr6ANREARUO-QVhIQTfM','Бар'),
 ('osm:node:11255351447','8 Vashlovani St','ChIJc3K4wlYNREARukIrpwl95pw','Бар и кухня'),
 ('osm:node:11047900654','6 Giorgi Akhvlediani St','ChIJZQWKPsANREARWxL9FA9UsaI','Бар с живой музыкой'),
 ('osm:node:6743921886','1 Vasil Petriashvili Street','ChIJk-WrAsINREARuIJO899cX6k','Бар'),
 ('osm:node:6404748085','14 Merab Kostava St','ChIJpd3ZKT1zREARSxxV2joEHKE','Кафе, ресторан и бар'),
 ('osm:node:13463561150','64 Egnate Ninoshvili St','ChIJt54KOQANREARJdYEYWzAISM','Бар'),
 ('osm:node:13158412001','19 Atoneli St','ChIJJzyXRTANREARlPhn7l_WI6A','Коктейльный бар'),
 ('osm:node:12698838611','60 Egnate Ninoshvili St','ChIJtRdgqGMNREAR1KFgTYtKNos','Коктейльный бар'),
]
for pid,address,ref,kind in updates:
    p=next(p for p in places if p['id']==pid)
    url='https://www.google.com/maps/search/?api=1&query=Tbilisi&query_place_id='+ref
    p.update(address=address+', Тбилиси',placeType=kind,googlePlaceId=ref)
    p['categories']=list(dict.fromkeys([p['category'],'bar']))
    if p['description'].startswith(('Бар.','Ночной клуб.','Ресторан.')):
        p['description']=kind+'. Адрес и категория сверены с публичной карточкой Google Maps. Программу на конкретную дату проверяй отдельно.'
        p['concept']=p['description']
    save(p,[url],'enriched')

p=next(p for p in places if p['id']=='osm:node:6501455085')
p.update(address='Ивана Джавахишвили, 46, Тбилиси',categories=['food','bar'],placeType='Винный бар и магазин',
    description='Винный бар и магазин. Меню доступно онлайн; даты дегустаций уточняй на странице площадки.',website='https://winemerchantsmenu.kovzy.com/')
save(p,['https://www.yell.ge/company.php?id=159051&lan=eng','https://www.instagram.com/wine_merchants_tbilisi/'],'enriched')
p=next(p for p in places if p['id']=='osm:node:10301113509')
p.update(address='Шота Руставели, 38, Тбилиси',categories=['food','cafe','bar'],placeType='Ресторан и бар',
    description='Шатре — ресторан на Руставели с грузинской и европейской кухней. Подходит для еды и встречи; актуальная цена пива пока не подтверждена.',website='https://www.facebook.com/shatre2016')
save(p,['https://www.yell.ge/company.php?id=114363&lan=rus','https://www.tripadvisor.ru/Restaurant_Review-g294195-d11997170-Reviews-or60-Shatre-Tbilisi.html'],'enriched')
p=next(p for p in places if p['title']=='SMA Craft Beer Bar')
p.update(website='https://smabar.ge/',openingHours='Ежедневно 16:00–00:30',
    description='Небольшой крафтовый бар на Асатиани: разливное и бутылочное пиво, бургеры и закуски. Свежие специальные вечера публикуют в Instagram.',
    beerPrice={'min':6.5,'max':12.5,'currency':'GEL','unit':'Разливное пиво; объём порции на сайте не указан',
    'source':'Официальное меню SMA','sourceUrl':'https://smabar.ge/','checkedAt':stamp})
save(p,['https://smabar.ge/','https://www.instagram.com/sma.tbilisi/'],'enriched')

path.write_text(json.dumps(places,ensure_ascii=False,indent=2)+'\n')
audit={'checkedAt':stamp,'completeCityCoverage':False,'before':before,'after':len(places),
    'added':len(places)-before,'barsPrimary':sum(p['category']=='bar' for p in places),
    'barsIncludingMixedVenues':sum(p['category']=='bar' or 'bar' in p.get('categories',[]) for p in places),
    'reviewed':reviewed,
    'limits':['Google Maps выдаёт выборку, не полный реестр города.','Каталоги могут содержать дубли, закрытые места и устаревшие адреса.',
    'Наличие карточки и сегодняшняя дата сверки не подтверждают работу заведения сегодня.',
    'Средний чек не используется как цена пива.','Fix Bar: адрес в Яндексе расходится с официальным онлайн-меню; точка пока не добавлена.',
    'Process: две близкие записи на Костава требуют проверки перед объединением.'],
    'sources':[
    {'name':'Google Maps','url':'https://www.google.com/maps/search/bars+Tbilisi/','use':'Ручная сверка названий, адресов и точек; не полный экспорт.'},
    {'name':'Яндекс Карты','url':'https://yandex.com/maps/10277/tbilisi/search/Bars%20and%20pubs/','use':'Дополнительные карточки и адреса; цены проверяются отдельно.'},
    {'name':'Madloba','url':'https://madloba.info/en/tbilisi/bars/','use':'Поиск кандидатов. Часть карточек недоступна, страницы имеют разную давность.'},
    {'name':'OpenStreetMap','url':'https://www.openstreetmap.org/copyright','use':'Основная открытая база координат; не подтверждение текущей работы.'},
    {'name':'Сайты заведений','url':'https://smabar.ge/','use':'Концепция, меню и часы. Для SMA обновлена цена разливного пива.'}]}
(root/'public/tbilisi-bars-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
meta=json.loads((root/'public/places-meta.json').read_text());meta.update(count=len(places),bars=audit['barsIncludingMixedVenues'],reviewedAt=stamp,beerPrices=sum(bool(p.get('beerPrice')) for p in places))
(root/'public/places-meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:audit[k] for k in ['before','after','added','barsPrimary','barsIncludingMixedVenues']},ensure_ascii=False))
