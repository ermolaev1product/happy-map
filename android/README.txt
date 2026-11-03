Prepared release candidate: Happy Map 2.5.0 / versionCode 24 (2026-10-29).
NOT compiled, signed, installed, or published. Distributed APK remains 2.4.9.
Includes all 87 cities in the current website registry. Local origin and saved-plan
storage are unchanged. Future new cities still require a new signed APK.
17 bundle tests passed; 2740 website assets synced and parity verified.
Build is blocked here by missing original signing material and Android SDK/JDK.
Use the original build machine and the Release workflow below to finish.

Historical release notes:
Happy Map 2.4.9 / versionCode 23, package ge.morrow.app.
Built and verified 2026-10-14 with the existing signing certificate.
Includes current RU/EN website client, independent map/search-point dragging,
500 m search radius (1 km diameter), and directory URL support in WebView.
Install over the existing application to retain local plans.
Physical Android device testing remains pending.

Build: python3 android/sync-assets.py; python3 android/build.py
Set MORROW_JAVA_HOME to a complete JDK 17 installation.
MORROW_SIGNING_DIR and MORROW_ANDROID_SDK override existing local paths.
Never transfer signing material through chat or store it in the repository.
The builder refuses a different certificate and never generates a replacement key.

2.4.9 keeps city places visible outside the search circle, highlights nearby places,
and removes the obstructing empty-map card in Places/Explore.

2.4.9 bundles the current bilingual client: circle dragging, total city counts,
wheel zoom, updated navigation, sharing and place cards without empty programmes.

Prepared source changes (2026-10-20), NOT a new signed APK:
- The source now generates an exact data-only URL allowlist from city-picker.json.
  All 27 currently published cities are checked and bundled from public/.
- The local appassets.androidplatform.net origin and storage keys are retained.
  No remote JavaScript/HTML execution, origin migration, new permissions or key
  replacement is introduced. Existing plans are not deliberately cleared.
- The native JSON byte cap is now 32 MiB. Existing APK 2.4.9 caps it at 12,000,000
  bytes and its places validator caps catalogs below 20,000 items. Current Paris
  and London data exceed that old byte cap; London also exceeds the item cap.
  The current website client already accepts place catalogs below 150,000 items.
- These source changes do not change the distributed 2.4.9 APK or update users.
  A signed release on the original build machine and physical-device tests remain
  necessary. In particular, current website JavaScript still aborts some catalog
  requests after 4.5 seconds; larger native timeouts do not override that budget.

Release workflow:
1. Finish the website build/localization and verify the core website scenario.
2. Set a new versionName and a greater versionCode in BOTH android/release.json
   and AndroidManifest.xml. Keep the package and pinned signing certificate.
   Do not edit public/android-release.json or download links at this stage.
3. Run python3 android/test_bundle.py
   Run python3 android/sync-assets.py
   Run python3 android/sync-assets.py --check
4. On the original build machine with its existing SDK, JDK and signing material,
   run python3 android/build.py. It verifies the current distributed APK's hash
   and certificate, the existing key, source/bundle parity, candidate APK
   package/version/signature and every bundled asset before emitting release.json.
   No signing material should be moved to another machine, chat or repository.
5. Install the candidate over 2.4.9 on a real Android device. Verify existing saved
   plans, all city selections, city events/places, map movement, online refresh,
   offline fallback, large Paris/London/Berlin catalogs and language switching.
   Also verify external links/auth remain in the intended browser flow.
6. Only after successful testing publish the verified APK and release metadata,
   update the download page, and verify the actual deployed URL/hash/signature.
   Keep the generated asset manifest with the release evidence. Public downloads
   are never copied or changed by these build scripts.

Recurring website-update guard:
- Inspect the actual distributed APK, not just README or source, for city paths,
  data allowlist, byte/item limits, bundled client and source/asset hashes.
- A data-only change is compatible only when its existing endpoint, schema,
  record count, size and the installed client's rendering remain compatible.
- A new city, client/UI change or exceeded limit needs a tested same-certificate
  signed APK release. Source preparation or asset sync is not an APK release.
- Report website and Android versions separately until deployed artifacts match.
  The app only offers an update link; it does not silently install a new APK.

Prepared UI source update (2026-10-24), NOT a new signed APK:
- Map headers now show the current city and a subtle Change city link to the
  existing country/city chooser, instead of the full city dropdown.
- Download action labels use plain Android app wording; URLs and APK unchanged.
- Exact current website assets can be synced with the workflow above. This does
  not change the distributed 2.4.9 build; signing and device QA are still required.
