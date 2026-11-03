# HappyMap arrival-cutoff catalog audit

Read-only consistency audit of canonical published-source records; not fresh web verification of announcements. Historical and held records counted, not deleted.

Source commit: `42c952051788c0817e9eaa8db7d4b023e8b1f9a9`

52 canonical cities; 20,822 stored event records. Localized mirrors: 52 English, 1 German.

## Counts
- recurring: 423
- multi_total: 686
- multi_recurring: 421
- multi_nonrecurring: 265
- cinema: 7313
- known_start: 20258
- unknown_start: 564
- explicit_start: 15747
- explicit_end: 2551
- end_clock_field: 6409
- held: 28
- cancelled: 17
- places_in_events: 0
- dated_programme: 6

## Detected field conflicts
- nonnumeric_duration: 4

## Classification caveats

`endDate > date` does not itself identify a multi-day festival: overnight cinema/concerts also set it. Preserve explicit daily visiting schedules, no-start ranges and genuine multi-day programmes. Apply one-hour presentation cutoff to timed individual sessions without replacing factual end fields. Six old Belgrade next-day/unknown-end rows are listed in the JSON; Mamifest is explicitly a family festival, five are individual evenings. These are historical records; no source dates were changed.

## Reported case

Nodariko Khutsishvili / Likuna Tutisani, `m24-tbilisi-d48274e3920f07`, starts 2026-10-28 22:00 Asia/Tbilisi; endAt is null. Old two-hour fallback keeps it until midnight. Requested arrival cutoff is 23:00.

## Cities

- almaty: 81
- amsterdam: 353
- antalya: 126
- astana: 59
- athens: 206
- baku: 87
- barcelona: 110
- batumi: 311
- belgrade: 667
- berlin: 125
- bishkek: 143
- brasilia: 47
- bratislava: 29
- brussels: 27
- bucharest: 57
- budapest: 84
- buenos-aires: 320
- chisinau: 94
- copenhagen: 162
- dubai: 144
- dublin: 59
- tbilisi: 5085
- flensburg: 236
- helsinki: 451
- istanbul: 290
- limassol: 75
- lisbon: 171
- ljubljana: 98
- london: 337
- madrid: 356
- minsk: 235
- moscow: 4265
- new-york: 136
- oslo: 38
- palo-alto: 657
- paris: 1564
- podgorica: 24
- prague: 403
- riga: 49
- rome: 84
- saint-petersburg: 873
- skopje: 34
- sofia: 68
- stockholm: 80
- tallinn: 110
- tashkent: 273
- tel-aviv: 124
- vienna: 277
- vilnius: 48
- warsaw: 34
- yerevan: 955
- zagreb: 101

Implementation: a separate one-hour elapsed arrival cutoff caps individual sessions, even when their actual ending is later. An earlier actual end still wins. Genuine multi-day date ranges, recurring visiting schedules, closed days and permanent places retain their own rules. No event date, endAt, ID, stored history, audience or APK is changed.
Validation: 42,135 model/catalog checks covering 52 canonical cities and 105 localized routes; 17,205 conference/filter assertions on 104 routes; 1,470 citywide checks on 105 routes; 240 live-dialog/list/map-input assertions; resume/offline/midnight checks; 535 Telegram DOM/SDK assertions. Real native APK/Telegram device test not performed.
