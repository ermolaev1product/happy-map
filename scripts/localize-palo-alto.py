#!/usr/bin/env python3
"""English copy for the Palo Alto client; keep identifiers and source URLs intact."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
COPY='''
Полнота афиши не гарантируется. Публичные Telegram-каналы перечислены отдельно; ссылка на канал не означает, что все его посты загружены. Цены, отмены и часы работы проверь у организатора перед выходом.|This is a curated selection, not a complete city calendar. A Telegram link does not mean every post has been imported. Check prices, cancellations and opening hours with the organizer before you go.
Сохраняй события закладкой — план уже работает в этом браузере. Вход через Google или почту пока не подключён. Сейчас план хранится только на этом устройстве; регистрации и синхронизации ещё нет.|Bookmark events to build your plans in this browser. Google and email sign-in are not connected to saved plans yet. Your plans stay on this device and are not synced.
Время всех событий — Калифорния. Stanford отмечен отдельно как соседняя территория. Автоматическое обновление Пало-Альто не подключено.|All event times are in California local time. Stanford is included as a nearby area. Automatic daily updates for Palo Alto are not connected yet.
Профиль Instagram или Telegram не означает импорт или свежую программу. Регистрация, цена и отмены могут измениться после проверки.|An Instagram or Telegram profile does not confirm an imported or current schedule. Registration, prices and cancellations may change after verification.
Расстояния — по прямой, а не длина пешего маршрута. Точка сохраняется только на этом устройстве.|Distances are measured in a straight line, not along a walking route. Your selected point stays on this device.
Эту запись не удалось перепроверить при последнем обновлении. Открой источник перед посещением.|This listing could not be rechecked during the latest update. Check the source before you go.
Это место, а не событие с назначенным временем. Стоимость посещения и меню уточняй у площадки.|This is a place to visit, not a scheduled event. Check admission and menu prices with the venue.
Проверенные анонсы на эту дату пока не найдены. Посмотри всю неделю или открой источники.|No verified listings have been found for this date yet. Browse all dates or check the sources.
Предпросмотр анонса. В этой версии публикация и кабинет организатора ещё не подключены.|Listing preview only. Publishing and organizer accounts are not connected in this version.
На эту дату ещё нет обновлённой подборки. Это не значит, что в городе нет событий.|There is no updated selection for this date yet. This does not mean there are no events in the city.
Это сохранённая подборка; автоматическое ежедневное обновление пока не включено.|This is a saved selection. Automatic daily collection is not enabled yet.
Не удалось определить место. В кнопке «Рядом» можно выбрать точку на карте.|Your location could not be found. Use Nearby to choose a point on the map.
Смотри события на ближайшие семь дней и добавляй интересное в свои планы.|Explore the next seven days and save events you would like to attend.
на выбранный период. Попробуй расширить расстояние или убрать фильтры.|for the selected dates. Try a wider radius or fewer filters.
Выбирай конкретный сеанс: время, язык и билет указаны в карточке.|Choose a screening to see its time, language and ticket details.
На эту дату ещё нет загруженного расписания обычных киносеансов.|Cinema schedules for this date have not been imported yet.
пока нет точных координат: адрес и источник доступны в карточке.|do not yet have verified coordinates. Their cards still include the address and source.
Метка обозначает территорию фестиваля, а не конкретную сцену.|The pin marks the festival site rather than a specific stage.
Сохранённые места доступны в «Мои планы» → «Места». Проверено|Find saved places under My plans → Places. Checked
Хранение отключено: место сохранено до закрытия вкладки.|Storage is disabled. This place will stay saved until you close the tab.
Хранение отключено: план останется до закрытия вкладки.|Storage is disabled. Your plan will remain until you close the tab.
Радиус можно изменить в фильтрах: 500 м, 1, 3 или 5 км.|Change the search radius in Filters: 500 m, 1, 3 or 5 km.
Проверь часы работы на странице площадки перед визитом.|Check the venue's opening hours before you go.
На эту дату опубликована пока только часть репертуара.|Only part of the schedule for this date has been published.
Подробности и условия участия — на странице источника.|See the source page for details and admission requirements.
Выбери другую категорию или расширь область поиска.|Try another category or a wider search area.
Это подборка мест, а не полный справочник города.|This is a curated selection of places, not a complete city directory.
Готово! Событие сохранено. Открой «Мои планы».|Saved! Find this event in My plans.
Геолокация недоступна. Выбери точку на карте.|Location access is unavailable. Choose a point on the map.
Это подборка событий, а не вся афиша города.|This is a curated selection, not every event in the city.
Обнови страницу, чтобы попробовать ещё раз.|Refresh the page to try again.
Условия участия уточняйте у организатора.|Check admission requirements with the organizer.
Условия участия уточняй у организатора.|Check admission requirements with the organizer.
Поиск в радиусе 1 км от выбранной точки.|Searching within 1 km of your selected point.
увеличь карту, чтобы разделить площадки.|zoom in to see individual venues.
Сохранение не является бронированием.|Saving an event does not reserve a place.
Подборка на эту дату ещё не обновлена.|This date's selection has not been updated yet.
Афиша ещё загружается. Попробуй снова.|Events are still loading. Please try again.
Выбери дату и добавляй события в планы|Choose a date and save events to your plans
Список пуст. Измени дату или фильтры.|No results. Try another date or different filters.
Билет / регистрация у организатора ↗|Tickets / registration ↗
Проверен как дополнительный источник|Reviewed as an additional source
Открой событие и нажми «В мой план».|Open an event and tap Save to my plans.
Добавление в план не бронирует место|Saving does not reserve a place
Сначала ближайшие к выбранной точке|Closest to your selected point first
По этому выбору ничего не нашлось|No matches for these filters
Проверяемая таблица источников →|Browse verified sources →
Полное расписание кинотеатров ↗|Full cinema schedule ↗
План показан по времени начала.|Your plan is sorted by start time.
Посмотреть план на этот день →|View plans for this day →
источники и дата обновления ↗|sources and last update ↗
Место сохранено в «Мои планы»|Place saved to My plans
Нажми на своё место на карте.|Tap a point on the map.
Использованы отдельные анонсы|Selected listings imported
сохранено на этом устройстве|saved on this device
На этот день ещё нет планов|No plans for this day yet
Время окончания не указано.|No end time has been published.
проверяем сайт при запуске|checks the published catalog on launch
Не удалось загрузить афишу|Could not load events
Отсюда считаем расстояние|Distances are measured from here
Пока нет сохранённых мест|No saved places yet
Цена пока не подтверждена|Price not verified yet
Событие в твоём плане.|Event saved to your plans.
Когда выбрать это место|Good for
Ближайшие события здесь|Upcoming events here
Сначала поздние события|Later events first
От центра текущей карты|Use the current map center
Автозагрузка недоступна|Automatic retrieval unavailable
Что происходит в городе|What's happening nearby?
обновляется редакционно|updated manually
Места, куда можно зайти|Places to explore
ИСТОЧНИКИ И ОБНОВЛЕНИЕ|SOURCES AND UPDATES
Кинотеатры и киноклубы|Cinemas and film clubs
Использован в подборке|Used in this selection
Выбрать точку на карте|Choose a point on the map
Откуда события и места|Where listings come from
Сначала ранние события|Earlier events first
Твоя ближайшая неделя|Your next seven days
Регистрация заполнена|Registration full
Нужны свежие анонсы.|New listings are needed.
Твои планы на неделю|Your plans for the week
Сохранённая подборка|Saved selection
Билеты на этот сеанс|Tickets for this screening
Открыть мои планы ↗|Open My plans ↗
Ограниченный доступ|Restricted access
от точки, по прямой|from your point, straight-line distance
Билет / регистрация|Ticket / registration
Регистрация закрыта|Registration closed
В ЭТОЙ ЧАСТИ ГОРОДА|IN THIS AREA
Показать весь город|Show the whole city
Все доступные даты|All available dates
Адрес — в карточке|See the card for the address
СОБЫТИЯ ПОБЛИЗОСТИ|EVENTS NEARBY
Билеты закончились|Sold out
Определить, где я|Use my location
Доступ уточняется|Admission not confirmed
Сохранённые места|Saved places
Расширить до 3 км|Expand to 3 km
События на неделю|Events this week
Посмотреть план →|View my plan →
место уточняется|location not confirmed
время уточняется|time not confirmed
Показать адрес ↗|View address ↗
Публичные анонсы|Public announcements
ИНТЕРЕСНОЕ МЕСТО|PLACE TO EXPLORE
Афиша недоступна|Events unavailable
Подборка событий|Selected events
Открыть список:|Open list:
с одного «хочу».|with something you love.
Планы начинаются|Every plan starts
Подборка с сайта|Published selection
Время уточняется|Time not confirmed
Сбросить фильтры|Reset filters
Без еды и дороги|Food and travel not included
Интересные места|Interesting places
Без точной метки|Without verified coordinates
Адрес уточняется|Address not confirmed
Убрать из плана|Remove from plans
Проверено ранее|Previously checked
ПЛАНЫ НА НЕДЕЛЮ|PLANS FOR THE WEEK
Расширить поиск|Expand search
Язык уточняется|Language not confirmed
Открыто публике|Open to the public
Выбранная точка|Selected point
Цена проверена|Price checked
Источник цены ↗|Price source ↗
Цена не указана|Price not listed
Убрано из плана|Removed from plans
Сохранить место|Save place
События списком|Event list
Место сохранено|Place saved
на этой неделе|this week
Рынки и винтаж|Markets & vintage
Откуда события|Where events come from
В городе есть|Explore
Вход на одного|Admission for one
Моя геопозиция|My location
Что здесь есть|What you'll find here
Показать ещё|Show more
Открыть карту|Open map
ТЕКУЩИЙ ВЫБОР|CURRENT SELECTION
Места списком|Place list
В твоём плане|Saved to your plans
Сортировка:|Sort:
Покрытие до|Coverage through
Убрать место|Remove place
В мой план|Save to my plans
Место убрано|Place removed
Откуда ищем?|Where should we search from?
Пространства|Culture & community
в подборке|in this selection
Источники ↗|Sources ↗
ПАЛО-АЛЬТО|PALO ALTO
Пало-Альто|Palo Alto
Центр карты|Map center
События на|Events from
подробности|details
ТВОЙ NORELI|YOUR HAPPY MAP
Нет билетов|Sold out
Выбери день|Choose a day
Мой профиль|My profile
Уточняется|Not confirmed
По времени|By start time
Проверено|Checked
Без метки|No map pin
Позвонить|Call
Пиво — от|Beer from
Весь город|Whole city
Сохранено|Saved
записей:|listings:
Китайский|Chinese
в списке.|in the list.
Бесплатно|Free
ИСТОЧНИКИ|SOURCES
уточнения|unconfirmed prices
Немецкий|German
от точки|from your point
список →|list →
Практики|Workshops
без цены|without a listed price
Сегодня|Today
События|Events
СОБЫТИЯ|EVENTS
в плане|saved
и места|and places
Завтра|Tomorrow
Другое|Other
Лекции|Talks
Раньше|Earlier
Музыка|Music
Рядом|Nearby
Спорт|Sports
Детям|Kids & family
МЕСТА|PLACES
Ближе|Closest
Места|Places
Позже|Later
Груз.|Georgian
Место ↗|View location ↗
Место|Place
Город|Community
Театр|Theater
Англ.|English
Бары|Bars
Игры|Games
Кино|Film
кино|film
Рус.|Russian
Всё|All
Выставки|Art & exhibitions
Кофе|Coffee
Поесть|Food
Клубы|Nightlife
Книги|Books
Прогулки|Outdoors
Подтверждённая программа на этот день пока не найдена. Это не означает, что место закрыто или здесь ничего не происходит.|No verified program has been found for this day yet. This does not mean the venue is closed or has no events.
Место из открытого справочника OpenStreetMap. Наличие точки не подтверждает, что заведение работает сегодня.|This place comes from OpenStreetMap. A map pin does not confirm that a venue is open today.
Места и их программа на выбранный день. Если анонса нет, это не значит, что место закрыто.|Places and their programs for your selected dates. No listing does not mean a venue is closed.
Мы против войны. За человеческую жизнь, свободу и возможность жить без страха.|We stand against war, for human life, freedom and the right to live without fear.
Этот проект помогает людям встречаться, слушать музыку, смотреть кино и узнавать свой город. Для нас важно, чтобы у каждого была возможность строить мирные планы.|This project helps people meet, listen to music, watch films and explore their city. Everyone deserves the chance to make peaceful plans.
Расстояние рассчитано по прямой. Маршрут может быть длиннее.|Distance is measured in a straight line. The walking route may be longer.
Точное место отмечено на карте; почтовый адрес не указан.|The location is marked on the map; no street address is listed.
Перед выходом проверь часы работы и условия посещения.|Check opening hours and admission requirements before you go.
ориентир из источника, не гарантированная цена меню.|a source-based estimate, not a guaranteed menu price.
Попробуй другой день, категорию или расстояние.|Try another day, category or search radius.
обновление опубликованной подборки при запуске|loads the published selection on launch
Последняя отметка проверки в справочнике:|Last directory check:
Билет и напитки оплачиваются отдельно.|Tickets and drinks are paid for separately.
Программа на этот день пока не найдена|No program found for this day yet
Проверить городские источники ↗|Check local sources ↗
Выбери место или увеличь карту.|Choose a place or zoom in.
в заведении — цена не указана|at this venue — price not listed
Места этой категории рядом →|Nearby places in this category →
Программа на доступные даты|Program for available dates
Вся программа на неделю|Full weekly program
События за всю неделю →|Browse all event dates →
Бокал; объём не указан|One glass; serving size not listed
Показать ещё события|Show more events
Часы из справочника:|Listed opening hours:
нужны свежие анонсы|new listings needed
Места с программой|Places with events
МЕСТА И ПРОГРАММА|PLACES AND EVENTS
Куда можно пойти|Where to go
Пешком сюда ↗|Walking directions ↗
с программой|with events
НАША ПОЗИЦИЯ|WHAT WE STAND FOR
нет билетов|sold out
Район Оперы|Opera area
Программа|Program
по прямой|straight-line distance
меню за|menu dated
За мир.|For peace.
Список|List
Афиша|Events
Пиво|Beer
рядом|nearby
ещё|more
Тбилиси|Tbilisi
Белград|Belgrade
Москва|Moscow
на главную|home
Основная навигация|Main navigation
Мои планы|My plans
Карта|Map
Меню Happy Map|Happy Map menu
Все источники|All sources
Поделиться картой|Share this map
Организаторам|For organizers
Скачать для Android|Get the Android app
Выбрать город|Choose a city
За мир|For peace
Шаг 3 из 3 · Собрать план|Step 3 of 3 · Make a plan
Открой событие → проверь время и цену → нажми «В мой план».|Open an event → check time and price → tap Save to my plans.
ЧТО ПРОИСХОДИТ В ГОРОДЕ|WHAT'S HAPPENING NEARBY
У города есть планы.|Discover something new.
Теперь и у тебя.|Make it part of your day.
От кофе с новыми людьми|From coffee with new friends
до последнего трека на танцполе.|to the last song of the night.
Загружаем настоящую афишу…|Loading local events…
Что показать|What to show
Куда пойти|Explore
Выбор дня и событий|Choose a date and events
Октябрь|October
Календарь на семь дней|Seven-day calendar
Все даты|All dates
Хороший день|A good day
начинается с идеи|starts with an idea
Найти событие или место|Find an event or place
Джаз, лекция, D&D, название бара…|Jazz, talks, D&D, a favorite bar…
Предыдущие категории|Previous categories
Следующие категории|Next categories
Категории|Categories
Рядом со мной|Near me
С программой|With events
Фильтры|Filters
Все варианты|All options
Публика / билет / регистрация|Public / ticket / registration
С ограничениями|Restricted access
Условия уточняются|Admission not confirmed
Доступ|Admission
В любое время|Any time
Днём, до 18:00|Daytime, before 6 pm
Вечером, с 18:00|Evening, from 6 pm
Язык события|Event language
Английский|English
Русский|Russian
Любой|Any
Когда|When
Расстояние|Distance
До 500 м|Within 500 m
До 1 км|Within 1 km
До 3 км|Within 3 km
До 5 км|Within 5 km
Воскресенье, 4 октября|Upcoming events
Сортировка по времени|Sort by start time
Самое интересное|Something wonderful
может быть за углом.|could be around the corner.
Карта событий в Пало-Альто|Palo Alto event map
Открыть список событий|Open event list
Показать все события на карте|Show all events on the map
МАЛЕНЬКИЕ ОТКРЫТИЯ|LITTLE DISCOVERIES
Большой город.|A world of possibilities.
Твой маленький план.|Your next little adventure.
Выбирай места на карте.|Explore places on the map.
Остальное сложится.|See where the day takes you.
Сохраняй то, куда хочется пойти|Save places you want to visit
Карта сейчас недоступна. Все события можно открыть в списке.|The map is unavailable. You can still browse every listing in the event list.
СОБЫТИЯ И МЕСТА РЯДОМ|EVENTS AND PLACES NEARBY
Выбирай события и добавляй в планы|Find an event and make a plan
Источники и проверка Пало-Альто|Palo Alto sources and verification
Скачать Happy Map для Android|Get Happy Map for Android
Цветовое настроение|Color palette
Коралловое оформление|Coral palette
Синее оформление|Blue palette
Оливковое оформление|Olive palette
Настроение|Palette
Скачать|Download
Закрыть карточку|Close details
Закрыть форму|Close form
Закрыть|Close
ДЛЯ ТЕХ, КТО СОБИРАЕТ ЛЮДЕЙ|FOR PEOPLE WHO BRING PEOPLE TOGETHER
Что у вас|What are you
намечается?|planning?
Так может выглядеть добавление события. Форма демонстрационная, публикации не будет.|Try a preview of your event listing. This is a demo form and will not publish your event.
Название события|Event title
Например, шахматный вечер|For example, a chess night
День|Date
Начало|Start time
Площадка|Venue
Название вашего бара или пространства|Your venue's name
Посмотреть анонс|Preview listing
событий|events
события|events
событие|event
места|places
место|place
мест|places
Все|All
от |from 
из |of 
до |within 
До |Through 
 км| km
 м| m
'''
def pairs(block):
 return dict(line.split('|',1) for line in block.splitlines() if '|' in line)
COPY=pairs(COPY)
COPY.update(pairs('''
Happy Map — Пало-Альто и Stanford: события и места|Happy Map — Palo Alto & Stanford: Events and Places
Концерты, лекции, театр, выставки и встречи в Пало-Альто и Stanford. Проверяй условия входа и сохраняй планы.|Discover concerts, talks, theater, exhibitions and meetups in Palo Alto and Stanford. Check admission details and save your plans.
Пало-Альто и Stanford|Palo Alto & Stanford
Бесплатная дискуссия в программе документального кинофестиваля. Места не гарантированы; приходи заранее. Язык встречи уточни у организатора.|A free discussion at the documentary film festival. Seating is not guaranteed; arrive early. Check the discussion language with the organizer.
Встреча с командой будущего музея: планы, вопросы и идеи жителей. RSVP на сайте.|Meet the team behind the future museum, hear their plans and share your questions and ideas. RSVP on the website.
Живой джаз и ужин. Указано время бронирования посадки, а не начало музыкального выступления.|Live jazz and dinner. The listed time is your seating reservation, not the start of the performance.
Музыкальная встреча в Heritage Park: джаз, R&B и рок. Возьми плед или складной стул; регистрация по ссылке музея.|Live jazz, R&B and rock in Heritage Park. Bring a blanket or folding chair; register through the museum's website.
Опера Моцарта на немецком с английскими титрами. Три часа с двумя антрактами. Цена зависит от места и уточняется в билетной системе.|Mozart's opera in German with English surtitles. Three hours with two intermissions. Ticket prices vary by seat; check the booking page.
Очная программа Stanford. Тема и участники:|In-person event at Stanford. Topic and participants:
Очная программа Stanford.|In-person event at Stanford.
Подробности программы и условия участия — у организатора.|See the organizer's page for program details and admission requirements.
Предварительная регистрация заполнена. Организатор сообщает о приоритете зарегистрированных посетителей. Проверь возможность посещения без регистрации; свободные места не подтверждены.|Advance registration is full. Registered attendees have priority. Check whether walk-ins are allowed; available seats are not confirmed.
Проверь условия участия и регистрацию на странице библиотеки.|Check attendance requirements and registration on the library's page.
Регистрация закрыта; условия посещения уточни у организатора.|Registration is closed. Check attendance options with the organizer.
Сеанс из 2 документальных фильмов.|A screening of two documentaries.
Сеанс из 3 документальных фильмов.|A screening of three documentaries.
Билет продаётся на весь сеанс. Студентам с действующим удостоверением — бесплатно. Язык и субтитры каждого фильма уточни в программе.|One ticket covers the full screening. Free for students with valid ID. Check the program for each film's language and subtitles.
Фильмы:|Films:
Приходи заранее: порядок входа по очереди.|Arrive early; admission is first come, first served.
Открытие в 18:00; первый фильм в 18:30. Приём с 17:30 вместе с сеансом — отдельный пакет $60.|Opening at 6 pm; the first film starts at 6:30 pm. A separate $60 package includes the 5:30 pm reception and screening.
Церемония и общение вокруг женского лидерства. Индивидуальный билет $160; покупка у организатора.|An awards ceremony and networking event celebrating women's leadership. Individual tickets are $160, available from the organizer.
Заявленная аудитория:|Listed audience:
Возможность участия извне нужно подтвердить у организатора.|Visitors outside this audience must confirm eligibility with the organizer.
Билет или регистрация через организатора. Наличие свободных мест проверяй по ссылке.|Ticket or registration required through the organizer. Check availability at the linked page.
В календаре указана общая публика. Проверь регистрацию и условия входа по ссылке.|The calendar lists the general public as its audience. Check registration and admission requirements at the linked page.
Для посетителей библиотеки могут действовать отдельные правила входа.|Additional entry rules may apply to library visitors.
В описании прямо указаны общая публика и бесплатный вход; правила посещения здания — у организатора.|The description explicitly states free admission for the general public. Check building access rules with the organizer.
Вход в Cantor бесплатный; правила посещения — на сайте музея.|Admission to Cantor is free. See the museum's website for visitor guidelines.
Для входа в здание нужен Stanford ID; внешнее участие не подтверждено.|A Stanford ID is required to enter the building. Access for outside visitors is not confirmed.
Для очного посещения нужен действующий Stanford ID. Публичный онлайн-вариант не означает доступ в зал.|A valid Stanford ID is required for in-person attendance. A public online option does not grant access to the room.
Нужен билет на выбранную посадку; еда и напитки оплачиваются отдельно.|A ticket is required for your selected seating. Food and drinks cost extra.
Программа для сообщества Stanford и выпускников; участие извне не подтверждено.|For the Stanford community and alumni. Access for outside visitors is not confirmed.
Публичный спектакль; нужен билет на конкретную дату.|A public performance. A ticket for the specific date is required.
Условия входа, билет и регистрацию проверяй на странице организатора.|Check admission, tickets and registration on the organizer's page.
Условия очного доступа уточняются у организатора; публичная страница сама по себе не разрешение на вход.|Confirm in-person access with the organizer. A public event page does not itself grant admission.
Билет 38.95–49.20 USD в зависимости от посадки. Еда и напитки отдельно; наличие мест — в билетной форме.|Tickets are $38.95–$49.20, depending on seating. Food and drinks cost extra. Check seat availability on the booking page.
На проверенной странице стоимость не указана. Это не означает бесплатный вход.|No price was listed on the page we checked. This does not mean admission is free.
Обычный разовый билет: задние ряды 126 USD, передние 141 USD. Для senior 101–116 USD, student 51–57 USD. Возможные сборы и доступные места — в билетной форме.|Standard single tickets: $126 for rear seats and $141 for front seats. Seniors: $101–$116; students: $51–$57. Check booking for fees and available seats.
Организатор указывает бесплатное участие; ограничения доступа и регистрация действуют отдельно.|The organizer lists free admission. Registration and access restrictions still apply.
Бранч оплачивается отдельно: 25 USD.|Optional brunch costs $25 extra.
Для студентов предусмотрено списание 50 USD при неполном участии; это не обычная цена входа.|Students may be charged $50 for incomplete attendance; this is not a standard admission price.
Стоимость и наличие мест уточняй у организатора.|Check prices and availability with the organizer.
Стоимость пока не подтверждена; проверь билетную страницу организатора.|Price not verified yet. Check the organizer's ticket page.
Цена опубликована организатором; окончательную сумму и сборы проверь при покупке.|The organizer published this price. Confirm the final total and fees at checkout.
Cantor: пн/пт 11–18, чт 11–20, сб/вс 10–17. Во вторник и среду закрыто.|Cantor hours: Mon/Fri 11 am–6 pm, Thu 11 am–8 pm, Sat/Sun 10 am–5 pm. Closed Tuesday and Wednesday.
Выставка: часы посещения и доступ в здание проверяй у организатора.|Exhibition: check visiting hours and building access with the organizer.
Местное время Калифорнии · America/Los_Angeles.|California local time · America/Los_Angeles.
Местное время Калифорнии.|California local time.
Конец рассчитан по началу и длительности последнего фильма; обсуждения могут продолжиться.|The end time is calculated from the last film's start and duration; discussions may run later.
Метка обозначает общий комплекс библиотеки и общественного центра; вход в зал уточни в программе.|The pin marks the library and community-center complex. Check the program for the room entrance.
Очная часть гибридного события; условия входа смотри ниже.|The in-person part of a hybrid event. See admission requirements below.
Первое выступление обычно начинается около 18:30, второе около 20:30; уточни на странице выбранного билета.|The first performance usually starts around 6:30 pm and the second around 8:30 pm. Confirm the time on your ticket page.
Библиотека / культурная площадка с отдельными датированными занятиями и встречами. 12 октября библиотеки закрыты.|A library and community venue with scheduled classes and gatherings. Libraries are closed on October 12.
Городской парк рядом с музеем. Датированные выступления — отдельными карточками.|A city park near the museum. Scheduled performances have their own event cards.
Живой джаз с посадкой и ужином. Концерты — отдельные датированные бронирования; еда и напитки оплачиваются дополнительно.|Live jazz with reserved seating and dinner. Concerts require a reservation for the specific date; food and drinks cost extra.
Музей истории технологий и повседневных изобретений. Расписание визитов и занятий — на сайте.|A museum exploring the history of technology and everyday inventions. See the website for visits and activities.
Независимый книжный магазин: можно зайти за книгой; встречи с авторами добавляются только после проверки даты.|An independent bookstore to browse and discover a new read. Author events are added only after their dates are verified.
Новый городской музей: пока проводит отдельные встречи и pop-up программы перед открытием в апреле 2027. Не обычное ежедневное посещение.|A new city museum hosting occasional meetings and pop-up programs before its April 2027 opening. Not yet open for regular daily visits.
Общественный центр рядом с Mitchell Park Library. Кинофестиваль UNAFF проходит здесь 15–18 октября. Метка обозначает общий комплекс; зал уточни в программе.|A community center near Mitchell Park Library. UNAFF screenings take place here October 15–18. The pin marks the complex; check the program for the room.
Площадка мероприятия ATHENA. Доступ на событие по билету.|Venue for the ATHENA event. Admission requires an event ticket.
Ресторан с полностью растительным меню и баром. Пиво: Kona Big Wave $10, Fort Point Prolifico IPA $11 по обычному меню. К заказу добавляется сбор 4% на льготы сотрудников.|A plant-based restaurant and bar. The regular menu lists Kona Big Wave at $10 and Fort Point Prolifico IPA at $11. A 4% employee-benefits surcharge is added to orders.
Соседняя территория Stanford. В афише только отобранные мероприятия с публичным доступом. Проверяй регистрацию.|Nearby Stanford campus. Individual event cards state audience restrictions and registration requirements; check these before visiting.
Театр, где выступают West Bay Opera, Palo Alto Players и TheatreWorks. Отдельные программы и билеты у каждого организатора.|Home to performances by West Bay Opera, Palo Alto Players and TheatreWorks. Each organizer has its own program and tickets.
Визиты по программе отдельных мероприятий; музей ещё готовится к открытию.|Visits are available through specific events while the museum prepares to open.
Часы работы и специальные закрытия уточни перед выходом.|Check opening hours and special closures before you go.
Часы с официальной страницы; праздничные изменения уточни перед выходом.|Hours are from the official page. Check holiday changes before you go.
дискуссия:|discussion:
'''))
COPY.update(pairs('''
Проверенные даты 10–18 октября: Пало-Альто и Stanford. Включены программы с ограничениями доступа; полный охват не заявляется.|Verified dates: October 10–18, 2026, in Palo Alto and Stanford. Restricted events are included with admission requirements. This is not a complete calendar.
Использованы отдельные датированные очные занятия. Онлайн, закрытие библиотек и отмены исключены. Полный охват не заявляется.|Selected dated, in-person activities imported. Online events, library closures and cancellations excluded. Coverage is partial.
Публичный Localist API: датированные очные и гибридные программы. Ограничения аудитории сохранены; онлайн, отмены и служебные сроки исключены. Выставки объединены.|Public Localist API: dated in-person and hybrid events. Audience restrictions preserved; online-only events, cancellations and administrative deadlines excluded. Exhibition duplicates combined.
Музыкальная встреча 10 октября и общественная встреча 15 октября.|Music gathering on October 10 and community gathering on October 15.
Выставки, занятия и публичные социальные страницы; даты проверять в отдельных карточках.|Exhibitions, classes and public social pages. Check dates in individual listings.
Книжный магазин и авторские встречи; найденные главные анонсы уже прошли или в другом городе.|Bookstore and author events. The main listings found were past events or in another city.
Ближайший спектакль начинается 30 октября, не переносить на текущую неделю.|The next production starts October 30; do not assign it to the current week.
Культура, лекции и общение; цена, возраст и доступ требуют карточки события.|Culture, talks and community gatherings. Check prices, age limits and admission in each event listing.
Музей и образовательные программы.|Museum and educational programs.
Книжная распродажа; отбирать точный день и зал.|Book sales. Verify the specific day and room.
Рынок как постоянное место; каждый конкретный выпуск требует подтверждения.|Market listed as a permanent place. Each dated market needs separate confirmation.
Музей, экскурсии и творческая программа.|Museum, tours and arts programs.
Современное искусство и публичные программы.|Contemporary art and public programs.
Концерты; основной каталог динамический, отдельные карточки доступны через Stanford Events.|Concerts. The main catalog is dynamic; individual listings are available through Stanford Events.
Концерты в Menlo Park. Не выдавать за Пало-Альто.|Concerts in Menlo Park. Do not label them as Palo Alto events.
Проверены выступления 11, 17, 18 октября, длительность и адрес. Цена без подтверждения остаётся неизвестной.|Performances on October 11, 17 and 18, duration and address verified. Ticket prices checked separately.
Датированный календарь; использована ATHENA 15 октября, $160.|Dated calendar. ATHENA on October 15 imported; ticket $160.
Официальные городские события; проверять карточку и адрес.|Official city events. Verify the individual listing and address.
Дополнительная локальная афиша; проверять первоисточник и дубли.|Additional local calendar. Verify primary sources and duplicates.
Агрегатор часто включает соседние города; нужен точный venue, год и проверка отмен.|The aggregator often includes nearby cities. Verify the exact venue, year and cancellations.
Русскоязычный агрегатор. Географическая выдача может включать Redwood City/San Francisco.|Russian-language aggregator. Geographic results may include Redwood City or San Francisco.
Музыка, ночная жизнь и культура всего Peninsula.|Music, nightlife and culture across the Peninsula.
Датированная программа; Dracula сейчас в Mountain View, спектакли Пало-Альто отдельно.|Dated program. Dracula is in Mountain View; Palo Alto performances are listed separately.
Публичные программы университета, не только для студентов.|Public university programs, including events for non-students.
Редакционная подборка; даты и места сверять с организатором.|Editorial selection. Confirm dates and venues with organizers.
Природа и волонтёрство; East Palo Alto — отдельный город.|Nature and volunteering. East Palo Alto is a separate city.
Ссылка подтверждена сайтом организации; свежая лента Instagram не прочитана, события из неё не импортированы.|Link confirmed by the organization's website. Recent Instagram posts have not been read or imported.
Ссылка с официального сайта; прямое чтение недоступно.|Linked from the official website; direct reading unavailable.
Проверено описание афиши SF/Bay Area; публичная лента не открылась, текущие даты не подтверждены.|SF/Bay Area calendar description checked. The public feed could not be opened; current dates are not confirmed.
Проверено описание регионального сообщества; переписка не прочитана.|Regional community description checked. Chat messages were not read.
Описание: перформансы и театр SF/Bay Area. Найден профиль, не актуальная программа.|Profile describes SF/Bay Area performance and theater. A current program has not been verified.
Найден каталог с упоминанием Пало-Альто; текущая лента не проверена.|Found in a directory mentioning Palo Alto. Current posts have not been verified.
Индексированы региональные анонсы; найденный ретрит сентября уже прошёл. Не импортировано.|Indexed regional announcements found. The September retreat is past; nothing imported.
Публичный профиль на английском указывает Пало-Альто; встречи текущей недели не подтверждены.|Public English-language profile mentions Palo Alto. This week's gatherings are not confirmed.
Индексированы EN/RU предпринимательские встречи; очная программа Пало-Альто этой недели не установлена.|Indexed English/Russian entrepreneurship meetups found. No in-person Palo Alto program confirmed for this week.
Ссылка из канала, переписка не прочитана.|Link found in a channel. Chat messages were not read.
Прочитаны публичные анонсы, включая будущие SF/Redwood City. Подтверждённых Пало-Альто не импортировано.|Public announcements read, including upcoming SF/Redwood City events. No verified Palo Alto events imported.
Региональные социальные встречи; ближайшая дата Пало-Альто не установлена.|Regional social gatherings. No upcoming Palo Alto date confirmed.
Проверен региональный профиль, не актуальная программа.|Regional profile checked; current program not verified.
Найдены старые анонсы марта 2023. Не источник текущей недели.|Old March 2023 listings found. Not evidence for the current week.
Ссылка в публичном Telegram-профиле; публикации не прочитаны.|Linked from a public Telegram profile. Posts have not been read.
Сайт сообщает о временном закрытии до следующей программы; сеансы не добавлены.|The website reports a temporary closure until the next program. No screenings added.
Домен сейчас содержит посторонний контент. Не использовать как официальный источник бара и цен.|The domain now contains unrelated content. Do not use it as an official source for the bar or prices.
12 сеансов и 2 бесплатные дискуссии 15–18 октября в Пало-Альто. Программа других городов не перенесена.|12 screenings and two free discussions, October 15–18 in Palo Alto. Programs in other cities excluded.
Обычный сеанс $19; бесплатные сеансы 5 и 9, студенты с ID и дискуссии; пакет открытия $60.|Standard screening $19. Sessions 5 and 9, students with ID and discussions are free. Opening package $60.
Место и официальное меню напитков: $10–11, дополнительно сбор 4%.|Venue and official drinks menu checked: $10–$11 plus a 4% surcharge.
Шесть бронирований концертов 10, 16, 17 октября; две посадки 10 октября распроданы.|Six concert reservations on October 10, 16 and 17. Both October 10 seatings sold out.
Обычное меню напитков; happy hour имеет отдельные цены. Есть безалкогольное пиво $9.|Regular drinks menu. Happy hour prices differ. Non-alcoholic beer is also available for $9.
Порция; объём в меню не указан. Дополнительно сбор 4% добавляется к заказу.|One serving; volume not listed on the menu. A 4% surcharge is added to orders.
Официальное меню Wildseed|Official Wildseed menu
Сбор 4% добавляется к заказу.|A 4% surcharge is added to orders.
HTML с якорями дня и сеанса; билеты сверены с отдельной официальной страницей.|HTML with date and screening anchors; tickets checked against the official ticket page.
HTML/JSON-LD; сохранять первоисточник, дату, местное время, цену и отмены.|HTML/JSON-LD. Preserve the primary source, date, local time, price and cancellations.
Официальная ссылка → публичный профиль/пост. Вход и закрытые материалы не используются. При недоступности опираться на официальный календарь.|Official link → public profile or post. No sign-in or private material used. Fall back to the official calendar if unavailable.
Официальный HTML меню + координаты из карты площадки. Цена имеет дату проверки, не гарантируется бессрочно.|Official menu HTML and coordinates from the venue's map. Prices have a verification date and may change.
Проверка правил цены, регистрации и специальных исключений.|Check pricing, registration rules and special exceptions.
Публичное JSON-состояние Wix на официальной странице.|Public Wix JSON state on the official page.
Публичный /s или конкретный пост; чаты и профиль без даты — только исследование. Не переносить повторы на новую неделю.|Public /s feed or individual post. Chats and undated profiles are research only. Never carry recurring posts into a new week without verification.
Публичный HTML и JSON-LD карточек, координаты площадок из официального календаря. Некоторые запросы вернули 429: нужен ограниченный темп и повтор позже, без обхода блокировок.|Public HTML and JSON-LD listings, venue coordinates from the official calendar. Some requests returned 429; use a lower request rate and retry later without bypassing restrictions.
Публичный HTML содержит структурированное состояние BiblioCommons. Использованы конкретные экземпляры, не шаблон повтора. Registration full/closed сохраняются отдельно.|Public HTML contains structured BiblioCommons state. Specific occurrences used, not recurrence templates. Full/closed registration preserved separately.
Место и меню проверены|Venue and menu checked
Использованы анонсы|Selected listings imported
Публикации: дата не подтверждена|Posts found; current dates unconfirmed
Ссылка из другого источника|Link from another source
Индексированные публикации|Indexed posts
Кандидат из каталога|Directory candidate
Публикации прочитаны|Public posts read
Официальная ссылка|Official link
Старые публикации|Old posts
Источник отклонён|Source rejected
Профиль проверен|Profile checked
Найдено в поиске|Found in search
дата не указана|date not listed
Временно закрыт|Temporarily closed
точек доступа|access points
Сайт прочитан|Website read
Исследовано|Researched
анонсов|listings
Сайт|Website
несколько городов|several cities
природа|nature
онлайн|online
прежний домен|former domain
меню и место|menu and venue
программа|program
билеты|tickets
Лайф|Life
чат|chat
'''))
COPY.update(pairs('''
План виден до двух часов после выбранного времени. Сам по себе он не превратится в «Я здесь». Можно отменить в любой момент.|Your plan is visible for two hours after the selected time. It will not automatically become an I am here check-in. You can cancel it anytime.
Отметки видят только взаимно добавленные друзья. Геолокацию в фоне не отслеживаем. Саму карту можно смотреть без входа.|Only mutually confirmed friends can see check-ins. We do not track background location. You can browse the map without signing in.
Вход пока проходит тестирование: отправка на эту почту ещё не подключена. Карта доступна без регистрации.|Sign-in is being tested. Email delivery to this address is not connected yet. You can use the map without registering.
Отметка действует 2 часа. Нажми «Ушёл», чтобы снять её раньше. Геолокацию не проверяем и не отслеживаем.|Your check-in lasts two hours. Tap I have left to remove it sooner. We do not verify or track your location.
Тестовый запуск: отправка писем пока доступна участникам проекта. Общая регистрация ещё настраивается.|Test launch: emails are currently available to project participants. Public registration is still being configured.
Друг войдёт и отправит запрос. Ты подтвердишь его — только после этого вы увидите отметки друг друга.|Your friend signs in and sends a request. After you accept, you can see each other's check-ins.
Тебя пригласили в друзья. Отправь запрос — доступ к отметкам появится после взаимного подтверждения.|You have been invited to connect. Send a request; check-ins become visible once you both confirm.
Удалятся имя, связи с друзьями, приглашения и отметки. Сохранённые на устройстве события останутся.|Your name, friendships, invitations and check-ins will be deleted. Events saved on this device will remain.
Вход ещё настраивается. Отметки пока не публикуются; карта и сохранённые планы доступны как прежде.|Sign-in is still being configured. Check-ins are not published yet; the map and saved plans remain available.
«Я здесь» исчезает через 2 часа. «Буду здесь» — план, а не подтверждение, что человек пришёл.|I am here disappears after two hours. I will be here is a plan, not confirmation that someone has arrived.
Ссылка действует семь дней и подходит для одного человека. Новая ссылка отменит предыдущую.|The link is valid for seven days and one person. A new link replaces the previous invitation.
Выход из аккаунта не снимает активные отметки. Их можно убрать в разделе «Друзья».|Signing out does not remove active check-ins. Remove them in Friends.
Удалить социальный профиль, друзей и все отметки? Это действие необратимо.|Delete your social profile, friends and all check-ins? This cannot be undone.
Проверь почту: отправлена ссылка для входа. Открой её на этом устройстве.|Check your email for a sign-in link. Open it on this device.
Пока никто не поделился планами. Когда друг отметится, он появится здесь.|No shared plans yet. Friends will appear here when they check in.
Это имя увидят только люди, которых ты добавишь. Почту не показываем.|Only people you add can see this name. Your email is not displayed.
Отметки видны только друзьям. Все часы — по местному времени города.|Check-ins are visible only to friends. Times use the city's local time.
Только для твоих друзей. Никаких отметок без твоего нажатия.|Only for your friends. Nothing is shared unless you choose to share it.
Открой место на карте и нажми «Я здесь» или «Буду здесь».|Open a place on the map and tap I am here or I will be here.
«Я здесь» и «Буду здесь» будут видны только твоим друзьям.|Only your friends will see I am here and I will be here.
Поделись с друзьями, где ты сейчас или куда собираешься.|Let friends know where you are or where you plan to go.
Лимит отправки писем временно исчерпан. Попробуй позже.|The email limit has been reached. Please try again later.
Войди, пригласи друзей и встречайтесь в любимых местах.|Sign in, invite friends and meet at your favorite places.
Не получилось открыть меню. Используй «Скопировать».|Could not open the share menu. Use Copy instead.
Сервер встреч временно недоступен. Попробуй позже.|The meetups service is temporarily unavailable. Please try again later.
План сохранён. Друзья смогут нажать «Тоже приду».|Plan saved. Friends can tap I will join.
Давай делиться планами и встречаться в городе.|Share plans and meet around the city.
Готово. Отметку можно снять кнопкой «Ушёл».|Done. Tap I have left to remove your check-in.
Запрос отправлен. Ждём подтверждения друга.|Request sent. Waiting for your friend to accept.
Ссылка скопирована. Отправь её другу.|Link copied. Send it to your friend.
Скопируй показанную ссылку вручную.|Copy the displayed link manually.
Показывать отметки друзей на карте|Show friends' check-ins on the map
Не удалось выполнить действие|Could not complete the action
Загружаем друзей и встречи…|Loading friends and meetups…
Сервер временно недоступен|Service temporarily unavailable
Друзья и встречи Happy Map|Happy Map friends and meetups
Удалить социальный профиль|Delete social profile
Социальный профиль удалён.|Social profile deleted.
Удалить профиль и отметки|Delete profile and check-ins
Получить ссылку для входа|Email me a sign-in link
Как тебя узнают друзья?|What name will your friends recognize?
ОДИН ДРУГ — ОДНА ССЫЛКА|ONE FRIEND — ONE LINK
Приглашение отозвано.|Invitation revoked.
Войти через ChatGPT →|Sign in with ChatGPT →
Отозвать приглашение|Revoke invitation
Хотят добавить тебя|Friend requests
Продолжить с Google|Continue with Google
Встретимся в Noreli|Meet on Happy Map
Увидимся в городе,|See you around,
Встречаться проще,|Meeting is easier
Открываем отметку…|Opening check-in…
Поделиться ссылкой|Share link
Ждём подтверждения|Waiting for confirmation
когда видно планы.|when plans are shared.
Удалить из друзей|Remove friend
Встретимся здесь?|Meet here?
Поделиться планом|Share a plan
Куда идут друзья|Where friends are going
Друзья и встречи|Friends & meetups
Настройки дружбы|Friend settings
Пригласить друга|Invite a friend
Отправить запрос|Send request
Отметиться здесь|Check in here
ПЛАН НА ВСТРЕЧУ|PLAN TO MEET
Отменить запрос|Cancel request
Заблокированные|Blocked people
ДРУЗЬЯ В NORELI|FRIENDS ON HAPPY MAP
Закрыть друзей|Close friends
Разблокировать|Unblock
ЛИЧНЫЙ ПРОФИЛЬ|PERSONAL PROFILE
Например, Саша|For example, Alex
ДРУЗЬЯ И ПЛАНЫ|FRIENDS AND PLANS
Позови своих.|Invite your friends.
Сохранить имя|Save name
Отменить план|Cancel plan
Заблокировать|Block
Изменить имя|Edit name
ТВОЙ ПРОФИЛЬ|YOUR PROFILE
Твои отметки|Your check-ins
УЖЕ НА МЕСТЕ|ALREADY HERE
Список пуст.|Nothing here yet.
только тебе|only you
Скопировать|Copy
Тоже приду|I will join
Твой круг|Your circle
На карте ↗|View on map ↗
Кто рядом?|Who is nearby?
Мои друзья|My friends
Кто увидит|Who can see this
Буду здесь|I will be here
Отклонить|Decline
Ты здесь.|You are here.
Добавить|Add
Только я|Only me
Я здесь|I am here
Друзья|Friends
будет|will be
Время|Time
вместе|together
Выйти|Sign out
Почта|Email
здесь|here
Ушёл|I have left
Имя|Name
Ты|You
'''))
COPY.update(pairs('''
Датированная program; Dracula сейчас в Mountain View, спектакли Palo Alto отдельно.|Dated program. Dracula is in Mountain View; Palo Alto performances are listed separately.
Найден каталог с упоминанием Palo Alto; текущая лента не проверена.|Found in a directory mentioning Palo Alto. Current posts have not been verified.
Публичный профиль на английском указывает Palo Alto; встречи текущей недели не подтверждены.|Public English-language profile mentions Palo Alto. This week's gatherings are not confirmed.
Индексированы EN/RU предпринимательские встречи; очная program Palo Alto этой недели не установлена.|Indexed English/Russian entrepreneurship meetups found. No in-person Palo Alto program confirmed for this week.
Прочитаны публичные анонсы, включая будущие SF/Redwood City. Подтверждённых Palo Alto не импортировано.|Public announcements read, including upcoming SF/Redwood City events. No verified Palo Alto events imported.
Региональные социальные встречи; ближайшая дата Palo Alto не установлена.|Regional social gatherings. No upcoming Palo Alto date confirmed.
Порция; объём в меню не указан. Дополнительно сбор 4%|One serving; volume not listed on the menu. A 4% surcharge applies.
Обычное меню напитков; happy hour имеет отдельные цены. Есть безалкогольное пиво|Regular drinks menu. Happy hour prices differ. Non-alcoholic beer is also available for
Автоматического сбора нет.|Automatic collection is not enabled.
Отобраны очные events с публичным доступом. Stanford — соседняя территория; студентские, служебные и online-анонсы не включены.|Selected in-person events in Palo Alto and nearby Stanford. Check each card for audience restrictions; online-only listings and administrative deadlines excluded.
Два сеанса Art for All 11 октября; предварительная регистрация заполнена. Другие музейные анонсы проверены через Stanford Events.|Two Art for All sessions on October 11; advance registration is full. Other museum listings checked through Stanford Events.
Официальная брошюра 2026–27: обычный разовый билет 126–141 USD, отдельные льготные тарифы. Не цена абонемента.|Official 2026–27 brochure: standard single tickets $126–$141; concessions listed separately. These are not subscription prices.
Использованы шесть датированных посадок; сохранены цены и sold out.|Six dated seatings imported with prices and sold-out status preserved.
США|USA
У |For 
'''))
def translate(s):
 for a,b in sorted(COPY.items(),key=lambda x:-len(x[0])):
  b=b.replace("'","’")
  if re.fullmatch(r'[А-Яа-яЁё]+',a.strip()):s=re.sub(r'(?<![А-Яа-яЁё])'+re.escape(a)+r'(?![А-Яа-яЁё])',lambda m:b,s)
  else:s=s.replace(a,b)
 return s

def main():
 for name in ['index.html','map.html','app.js','discovery.js','invite.html','share.html']:
  p=ROOT/'public/palo-alto'/name;s=translate(p.read_text())
  s=s.replace('lang="ru"','lang="en"').replace("toLocaleDateString('ru'","toLocaleDateString('en-US'").replace("toLocaleString('ru'","toLocaleString('en-US'")
  s=s.replace('app.js?v=pa-1','app.js?v=pa-en-41').replace('discovery.js?v=pa-1','discovery.js?v=pa-en-41')
  p.write_text(s)
 p=ROOT/'app/palo-alto/page.tsx';p.write_text(translate(p.read_text()))
 p=ROOT/'public/palo-alto/social.en.js';p.write_text(translate((ROOT/'public/social.js').read_text()).replace("toLocaleString('ru'","toLocaleString('en-US'").replace("toLocaleTimeString('ru'","toLocaleTimeString('en-US'"))
 for name in ['events.json','places.json','sources.json']:
  p=ROOT/'public/palo-alto'/name
  def walk(x):
   if isinstance(x,str):return translate(x)
   if isinstance(x,list):return [walk(v) for v in x]
   if isinstance(x,dict):return {k:walk(v) for k,v in x.items()}
   return x
  p.write_text(json.dumps(walk(json.loads(p.read_text())),ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
