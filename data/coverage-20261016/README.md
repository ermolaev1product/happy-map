# Source-reviewed city coverage, 16 October 2026

This incremental release is based on live v146. `release.json` is the reviewed import manifest, not an instruction to replace a city's catalog. Original source packets, hashes and exact OSM snapshots are retained under `evidence/`.

- Existing dated occurrences and directory rows remain intact, except the explicitly sourced Coperta point/end-time correction and two coordinate-only corrections reusing exact existing venue evidence (Almaty Museum of Arts and Moscow Tsaritsyno Great Palace).
- New cultural rows keep stable programme IDs, individual session times, source URLs, access warnings and unknown coordinates. A festival may contain many film screenings; report sessions, non-cinema sessions and programme groups separately.
- OSM additions cover the reviewed municipal boundaries, not entire metropolitan regions or every operating business. The source snapshot is 15 October 2026 20:21 UTC. ODbL attribution and source URLs remain in the public feeds; actual opening/operation has not been independently verified.
- Preserved proper-name aliases are search/provenance metadata, not translated event inventories.
- The legacy place ID manifest preserves an already issued social-place lookup after an event venue gains a source-backed catalog match. It does not create a duplicate UI place card.

## Future refreshes

Start from the currently published source commit. Merge new verified rows additively by stable identity and real session date/time; never replace the full directory with event venues or rerun a historical release importer as a general refresh. `import-city-coverage-release.py` is a reproducible historical release application, not a daily feed generator. The normal build reads the committed full directories and the reviewed conference identity list.

After every normal build, run `node --expose-gc scripts/test-conference-filters.cjs`, `python scripts/test-conference-release-data.py`, `python scripts/test-city-coverage-release.py`, and `node --expose-gc scripts/audit-city-coverage.cjs`. The strict release test deliberately fails on unexplained deletion, changed existing records, lost new IDs or unrelated GPS/URL/analytics changes. Future reviewed corrections must extend the manifest deliberately, never disable the preservation assertions.

Physical Android/phone performance was not tested in this release. Cloud Node and public browser checks do not establish handset performance.

## Hosting size

Large Berlin, Prague, Limassol and Paris place assets are stored losslessly as gzip in the deployment. The Worker streams identical JSON at all existing RU/EN URLs, retaining every field and translated value. Source JSON and normal client parsing are unchanged. `node scripts/test-compressed-place-assets.mjs` verifies bytes, headers, methods, failures and the expanded deployment budget. No APK/download or provenance files are removed.
