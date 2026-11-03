# Happy Map city search entry pages

Added 2026-10-25 on top of published v183. No new event import is claimed.

- 27 existing cities; RU/EN guides plus DE Flensburg. These are seven-day, source-backed selections from the published catalogue, not complete city coverage.
- Rebuilt by scripts/ensure-english-build.mjs using scripts/build-seo-guides.mjs. Python-capable builds regenerate dated cards before and after language generation. Python-free builds validate the committed snapshot rather than fabricating a new checkedAt.
- Each card retains source checkedAt separately from guide generatedAt. Guide controls are ordinary map links: week/today/evening/nearest weekend day/category/event. The map applies explicit guide-only entry parameters. No 30-day user-facing mode. Client uses the existing discovery model for expiry, local dates, visit schedules, minute refresh and tab-return refresh. Static HTML states its snapshot date and scope.
- No individual event-rich-result claim: CollectionPage/ItemList only. No private plans/friends in sitemap; friends HTML is noindex. No analytics/visitor data exposed.
- Map titles/descriptions/canonicals corrected, map footer and city pickers link to the guides; first-entry flow, event IDs and language-independent filters unchanged.
- Genuine event deep links/individual Event schema require a separately verified architecture and are not invented here.
- Search Console ownership, indexing submissions and external promotion not configured; indexing/ranking is not guaranteed.
- Test Android file was not published: source push rejected its 38.2 MB Git object. APK/download metadata unchanged.

Validation: test-seo-guides.cjs, test-seo-guide-filters.cjs, test-origin-pan.cjs, test-control-system.cjs, English/German checks and normal framework build.
