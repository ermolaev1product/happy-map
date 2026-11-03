import fs from 'node:fs';
const registry=JSON.parse(fs.readFileSync('data/i18n/market-locales.json','utf8'));
const source=fs.readFileSync('lib/locale-routing.mjs','utf8').replace('export function createLocalePolicy','function createLocalePolicy');
fs.writeFileSync('public/locale-policy.js','// Generated from the reviewed availability registry, not the localization wish list.\n(()=>{\n'+source+'\nwindow.HappyMapLocalePolicy=createLocalePolicy('+JSON.stringify(registry)+');\n})();\n');
fs.writeFileSync('public/locale-registry.json',JSON.stringify(registry,null,2)+'\n');
