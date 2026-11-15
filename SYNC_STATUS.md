# GitHub source synchronization

Updated 2026-11-15 from published Happy Map v326.

- Production source commit: `b234af9cb40e09e85c7104517410769b2f3df572`.
- Production deployment succeeded and the release writer completed live verification.
- The v325 synchronization copied 6,342 reviewed source/runtime files. The v326 delta updates 43 source/runtime files byte-for-byte from the current published commit; the same export exclusions remain in effect. Existing GitHub-only portfolio documentation and unrelated files were preserved.
- This repository remains a source/portfolio export, not a complete production backup. Existing `DATA_NOT_INCLUDED.md` and `.gitignore` exclusions still apply. Raw research, QA evidence, build output, archived datasets, spreadsheets, credentials, signing material and APK/AAB binaries were not newly exported. Previously included historical research remains historical; it is not a current import report.
- Android source changes present in the published source commit are included. This does not mean a new Android binary was built, signed, published or device-tested. Prepared Android release metadata was not advanced.
- No unpublished or held source package is included by this synchronization. Later releases require a separate verified sync.
- Production runtime tests were performed by the release workflow. The reduced GitHub export has not been validated as a standalone production deployment, because its intentionally omitted data and environment bindings are not supplied here.
