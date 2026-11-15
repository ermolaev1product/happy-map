# Preparing and packaging reviewed source

`npm run build` always packages the exact final sealed source tree. Deployment
never runs broad generation merely because Python is installed on the host.
Use `npm run build:prepare` explicitly when regeneration is intended. The direct
orchestrator retains legacy auto-selection for compatibility, but package build
and deployment entry points choose prepared mode explicitly.

- `npm run build:prepare`: regenerate English, other UI, coverage and the shared
  publication; run semantic checks; seal final source; package and verify it.
  This can regenerate SEO/guides. Do not use it for an already reviewed scoped
  editorial merge when those pages must remain byte-identical.
- `npm run build:seal`: validate and atomically seal an already prepared, reviewed
  source tree. It does not regenerate public assets or build the application.
  Use only after all intended source edits and required generators are complete.
- `npm run build:prepared`: verify the committed seal first; derive only the
  non-public server place index/compression allowlist; build, compact and verify
  output; verify the source seal again. It never changes/reseals public sources.
- `npm run build:check`: verify the final source seal without generation/build.

For a reviewed data-only merge: apply precisely the approved data/guide patch,
run the required shared-catalog generator, run the relevant data QA, then
`npm run build:seal` and `npm run build:prepared`. Do not run broad SEO or locale
generation merely to refresh a checksum. Commit the final seal alongside the
reviewed source. A missing/mismatched seal must fail, not be silently refreshed.

The seal covers final public inventory, scripts, locale/SEO inputs and relevant
package/configuration inputs. It excludes itself and generated output. Plans,
credentials and external services are not read by the seal. A signed Android APK
still requires its own exact asset/signature/upgrade verification.

Focused pipeline test: `node scripts/test-build-pipeline.mjs`. It uses temporary
fixtures and an injected command runner; it is not a framework or device test.
