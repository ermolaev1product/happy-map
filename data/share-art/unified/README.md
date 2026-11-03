# Unified sharing previews · 2026-10-15

Five city-neutral PNGs, each 1200 × 630, in `public/assets/happy-map-unified-20261015-{ru,en,de,fr,it}.png`.

The SVG design extends the existing Happy Map preview's visual language: soft map, warm neutral background, green place markers, yellow music marker and a prominent raised white event card. Its map is deliberately schematic, not a screenshot or a depiction of a particular city. The jazz card is explicitly marked as an example. There are no performer, price, time, sponsorship or booking claims.

Text is maintained in `scripts/render-unified-share.mjs` and exported to `copy.json`. The SVGs are editable code-native sources. Regenerate with `node scripts/render-unified-share.mjs` (requires installed Sharp and DejaVu Sans fonts); generation is not part of the deployment build. Five PNGs are committed so deployment needs no graphics tooling.

## Locale integration

Existing Russian and English pages use matching RU/EN artwork; the existing German Flensburg interface uses DE artwork. Root paths that already serve English use EN, determined by their HTML language. German, French and Italian have dedicated city-neutral sharing landing pages at `/de/share.html`, `/fr/share.html` and `/it/share.html`. French and Italian explicitly link to the existing English chooser/map and explain the language fallback. German links to the German country/city chooser; only Flensburg currently has a German map. These are share-only localized pages, not full interface expansion.

OG and Twitter images use absolute URLs and the fresh `unified-20261015` filename. This avoids reuse of the earlier asset URL for newly crawled links; it does not guarantee Telegram or other services will recrawl a previously shared link or refresh existing messages.

## Verification

All five PNGs were individually opened and checked for consistent composition, localized text, legibility, accent/Cyrillic rendering, and clipped or overlapping copy. Metadata tests cover supported entry/invite routes and the full existing metadata inventory. No browser-runtime screenshot is claimed by this artwork QA.
