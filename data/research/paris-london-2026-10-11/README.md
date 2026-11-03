# Happy Map: Paris and London — 11 October 2026

Project: appgprj_6ac16a77d7e4819194f0da0f9691ecfb (existing public Site).

Maps: https://happymap.app/paris/ and https://happymap.app/london/ .
Source tables: each city’s sources.html. Shared previews: each city’s invite-en.html.

Paris: 1,137 dated listings, including 1,114 Paris Data entries (807 distinct programmes), 20 Collège de France sessions and 3 Philharmonie concerts; 526 venue records. Exhibitions use explicit validDates and visiting windows. Permanent collections are excluded from dated events. Paris Data derivative is attributed to Ville de Paris under ODbL1.0 and publicly downloadable separately. Sources: 45 access points. No current-week Paris Telegram post was verified for import; the inspected old posts remain research only.

London: 138 dated entries, including 91 IanVisits, 21 Southbank Centre, 10 Wigmore Hall, 9 LSE and 7 standalone Telegram-discovered entries. Another Telegram announcement is merged with Wigmore, eight discovered sessions in total. 40 curated permanent places; event venues are also linked in the app. Sources: 124 access points. 108 event coordinates are postcode-area centroids, 21 are official venue coordinates, 9 are unknown. Approximate pins and address-based directions are clearly indicated.

827 Paris and 107 London prices are explicit free or published amounts. Unknown prices remain null. Language inferred from listing text is labelled as unconfirmed in details. Closed registration, fees, access conditions and no-end-time cases remain visible.

No new signed Android APK, automatic daily collection, continuous Telegram feed or organizer publication was implemented. Existing APK downloads and earlier city datasets are preserved. UI tests, data integrity checks and existing social privacy tests passed. Managed environment has no browser QA skill; no visual live-browser test or physical Android test was performed.

Reproduction: extract public-source-snapshots.tgz from repository root to restore work/paris-london-2026-10-11. Run scripts/import-paris.py, scripts/import-paris-venues.py, scripts/import-london.py and scripts/merge-europe-source-research.py for the bounded snapshot. Public JSON is the authoritative published result; these scripts do not install a scheduler. Recheck dates, cancellations and availability before a new publication.
