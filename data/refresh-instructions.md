# Noreli daily refresh

The local Codex heartbeat “Noreli — ежедневная афиша и бары” is enabled for 07:00 Asia/Tbilisi. It needs the computer and Codex running. This is not a hosted cron or evidence that a scheduled run has completed.

Update the source data in `public/events.json`, `public/places.json`, their Belgrade equivalents, and metadata. Keep the established public Site and Android package identity. Read the Sites skill before source opening and publication. Preserve the downloaded APK files and old URLs.

Check public ticketing sites, official venue schedules and menus, and accessible public Telegram announcements from the source registries. Prioritize Tbilisi and Belgrade, including independent cinema, music, quizzes and small bar events. Keep a rolling seven-day horizon, source links and check dates. A known Instagram or Telegram profile is not proof its latest announcements were imported. Do not claim full city coverage.

Preserve good records when an upstream fails. Remove duplicates using venue identity, date and title; keep separate cinema sessions inside one venue programme. Do not guess times, prices or coordinates. Exhibitions can use inclusive endDate; cancellations must not appear as available events. Verify branch addresses, not just matching venue names.

Beer prices need minimum amount, currency, serving size, source URL, menu month where known and check date. Delivery prices and old reviews cannot be represented as current in-venue menu prices. Missing price stays unknown. Place records are not proof that a business is currently operating.

OpenStreetMap-derived exports are linked under downloads with ODbL attribution. Retain attribution, provenance and public database exports when updating places. Do not publish raw private chats or the user's home address.

Android checks published events and places on launch through its existing live-data bridge; preserve its cache and offline bundled fallback. Interface/native changes require rebuilding and signing with the existing private key outside the repository. Data-only updates do not require a new APK. Validate date filtering, unknown prices, branch matching, map grouping and saved plans before publishing. Report meaningful completion, failure or required action; do not send repetitive no-change reports.

## Belgrade source expansion, 8 October 2026

The verified import is preserved in `data/belgrade-expansion-2026-10-08.json`; public channel-check results are in `public/belgrade/expansion-audit.json`. These are dated evidence, not an evergreen schedule. Recheck Changeover's official timetable and KCB cinema listings, plus the Telegram histories for Black Cat, Vranin Tavan, Sreda Obitaniya, Avangarda, Scena Live, Tight Five Comedy and local aggregators. Preserve source links and deduplicate cross-posts against Afisha by date, title and venue. Do not re-add already imported posts or extend a weekly class beyond the current published schedule without checking. A festival overview is not a performance; keep individual set times inside venue programmes. Midnight sets belong to the following calendar day. Donation is not a zero-price ticket. Existing archival records can remain available to saved plans; report current-week coverage separately.

The site now has a Vinext/Worker backend with D1. Keep social API, migrations and Supabase runtime configuration. Never switch hosting back to a static manifest. Build from public/ using the Sites framework workflow; dist/ is generated output. Regenerate the trusted place catalog during every build.

## Source priorities and empty coverage

Use `public/source-priorities.json` as the prioritized queue for all three cities, alongside the full registry. `public/source-priorities.html` derives current-week counts from the published catalogues; notes and review dates still require editorial updates. Preserve its distinction between primary event sources and supplementary venue/price links. Review evidence is in `public/source-expansion-2026-10-08.json`.

Kinoteka's programme on Uzun Mirkova 1 is distinct from its Kosovska 11 branch. Imported October 8–14 screenings have unknown prices/languages; do not invent those. KC Grad calendar has dated small events. PoštoPiće prices must retain menu month and serving size; Docker 350 RSD refers to 0.33 l, not 0.5 l. Yandex individual cards can show beer price but the search API must not be assumed to expose it or return every business; no paid API license is configured. Do not retry cards that rate-limit as a bulk acquisition strategy.

## Reviewed research handoff (9 October 2026)

The October 9 batch is stored in `data/reviewed-events-2026-10-09.json`; source-page evidence is in `data/source-research-2026-10-09.json`. The machine-readable result is `public/research-update-2026-10-09.json`. These files contain public event facts only. The importer is `scripts/import-reviewed-research.py`.

For the next research batch:

1. Open this exact Site through the Sites source workflow and obtain its latest source before editing. Preserve current branding, audience, routes, Worker/D1 configuration, Android downloads, saved-event IDs, and unrelated changes. A rejected source push is a concurrency conflict: reconcile and revalidate; never force-push.
2. Revisit the original event/organizer pages. Capture source and check time, explicit year/date, local timezone, venue branch/address, authoritative or previously verified coordinates and their provenance, price qualifications, sale/registration status, and closure days. Do not copy a catalogue URL as a map location. Treat a programme with multiple starts as distinct confirmed sessions. Do not invent missing ends, availability, languages, prices, dates, or coordinates.
3. Compare with the latest city event files by source identifier and by venue/date/time/title, including translated titles and ongoing exhibitions. Preserve IDs for existing events and append/correct verified facts rather than duplicate them. Hold conflicting times, unclear venues, and unresolved public-entry conditions as pending examples. A registration-required public event can be included with a clear requirement and unknown capacity.
4. Prepare a dated reviewed bundle using the previous file's schema. Use `add` only for complete verified events, `update` with an existing ID and expected date, and `pending` for unresolved examples. The source-research file is a separate registry; unverified candidates never become events. Run the importer. Inspect its change report, the diff, record counts, preserved old IDs, semantic duplicate checks, city coordinate bounds, closed weekdays and overnight times. Keep the overall city coverage horizon unless the rest of that horizon was actually refreshed.
5. Run the existing nearby, map-layout and social checks, TypeScript check, and the Sites build. On Node 24 the existing `test-map-layout.cjs` has a pre-existing CommonJS/ESM loader mismatch; running the same assertions with `public/map-layout.js` loaded into a `vm` CommonJS sandbox works without changing application code. Refresh the generated trusted place registry during the normal build.
6. Use normal Sites save/deploy on the same project and current audience. Verify the exact commit, archive data and successful deployment version before reporting publication. Do not report success from a source commit alone. Do not claim that every city source was refreshed.
7. Send the user a concrete delta: newly added events with dates/venues/source links, already-present events that were corrected, pending items and exact blockers, source-page count separately from event and venue counts, and city map URLs. The existing map shows a rolling seven-day window, so later sessions are saved now but become visible closer to their dates. Send a no-change report only when requested or materially useful.

This batch verified that the Site's hosted event data is bundled from `public/*/events.json`; there is no authenticated event-ingestion endpoint in the current source. It does not prove a local scheduled run completed. The local 07:00 task described above was neither inspected on the computer nor modified. Any unattended updater must independently verify source access and writer access; do not claim the Site is continuously synchronized merely because research is scheduled.

## Publication resume, 9 October afternoon

The current verified public origin is https://happymap.app. Preserve the existing project and its public access. The resumed batch is `data/reviewed-events-afternoon-2026-10-09.json`; the complete delta relative to published version 23 is `public/publication-manifest-2026-10-09.json`. It combines the previously saved 32 additions with 69 newly verified, coordinate-ready records. Seven existing events are corrected, Night Market receives an unresolved-date warning without a date/status change, and two Tbilisi place details are corrected. The full source registry stays unchanged from saved version 24.

For subsequent authorized runs, use the current Sites skill and native source/save/deploy workflow. Reconcile the latest Site metadata, source head, saved versions and any deployment status before editing or retrying. Save-only is not publication. Reuse a matching saved archive; continue an existing pending deployment rather than create a second one. Treat a permission denial as a block: provide the exact action and reason to the parent, and retry the same native operation only when newly supplied user authorization covers it. Never change audience, use a private deploy, or change deployment routes to get around a refusal.

The reviewed importer supports events-only batches by omitting `sourceResearchFile`; this leaves `public/sources.json` byte-for-byte unchanged. Keep each new batch idempotent, preserve all unrelated records and stable IDs, and use exact venue evidence. Recheck same-day events and registration status before publication. Two previously verified Moscow schedules were withheld in this batch because their registration had closed, and Meteor Studio was withheld because its exact pin remained unverified. Do not describe events already underway or finished as upcoming. After successful native publication, validate the published data and report only the completed changes, concrete event links and important limitations.

## Yerevan — enabled October 15, 2026

Use checkout work/happymap-release-oct12 and preserve all other cities. Every morning check data/yerevan/telegram-registry.json, source-registry.json, instagram-registry.json and pending.json. Telegram has priority: read multiple public history pages and record actual depth, posts, dates, errors and duplicates. Instagram registry entries are discovery leads, not verified feeds. Read public organizer content where accessible; never mark inaccessible accounts as checked. No credentials in source or reports.

Update public/yerevan/events.json and places.json for the next seven local calendar days (Asia/Yerevan; AMD). Official city directory records in data/yerevan/official-places.json overlap with OSM; deduplicate by branch, address and coordinates before adding. Maintain attribution. Verify operating status separately; never invent hours, prices or addresses. Keep unresolved announcements pending. Broaden the initial four-event selection across Armenian, English and Russian calendars and organizers, libraries, museums, theatres and screenings. Investigate empty days.

Run existing English generation and factual-field preservation checks; verify RU/EN Yerevan, city switching, all-city markers, nearby circle, filters and personal plans. Publish with Sites; no APK rebuild for data changes. A scheduled check requires the local computer and Codex to be running; only count fully successful checks.

## Vienna — initial import October 15, 2026

Vienna is available at /vienna/ and /en/vienna/. Use data/vienna/source-registry.json and telegram-registry.json, and public/vienna/pending.json. Source tables and a public handoff live at /vienna/sources.html and /vienna/HANDOFF.txt. Prioritize English and German official calendars plus public Russian/English/German Telegram histories. A profile link alone is not a checked feed. Preserve per-source actual history depth and read counts.

Use Europe/Vienna (including DST) and EUR. Arena publishes doors-opening times; retain timeMeaning and the explanatory note. Exclude school/group-only appointments from public recommendations. Preserve sold-out status, exact session IDs, venue branches and verified coordinates. Recheck listings against primary calendars and do not extend exhibitions or recurring schedules without date evidence. Imported future dates become visible in the rolling local week. Place geometry derives from OSM and is not individual confirmation of current business operation. Keep ODbL attribution and source exports. Initial inclusion does not itself establish a successful unattended daily refresh.
