import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';

const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJSON = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function replaceOnce(source, pattern, value, file) {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))];
  if (matches.length !== 1) throw Error(`${file}: expected exactly one ${pattern}, found ${matches.length}`);
  return source.replace(pattern, () => value);
}
function mergeLiteral(source, label, values, file) {
  const pattern = new RegExp(`(${label}=)(\\{[^;]*?\\})(?=[;,])`);
  const found = source.match(pattern);
  if (!found) throw Error(`${file}: missing ${label} object`);
  const old = vm.runInNewContext('(' + found[2] + ')');
  return source.replace(pattern, () => found[1] + JSON.stringify({...old, ...values}));
}

// Expand only cities with validated, rendered bundles. Existing data and storage keys stay intact.
export function syncRegistry(root = process.cwd()) {
  const file = relative => path.join(root, relative);
  const registry = readJSON(file('data/city-expansion/registry.json'));
  const activePath = file('data/city-expansion/launched.json');
  const activeIds = fs.existsSync(activePath) ? readJSON(activePath).cityIds : [];
  const active = activeIds.map(id => {
    const city = registry.newCities.find(c => c.id === id);
    if (!city) throw Error('Unapproved city ' + id);
    for (const name of ['index.html','map.html','events.json','places.json','sources.html','invite.html','share.html']) {
      if (!fs.existsSync(file(`public/${id}/${name}`))) throw Error(`Do not advertise incomplete city ${id}: missing ${name}`);
    }
    const events = readJSON(file(`public/${id}/events.json`));
    const places = readJSON(file(`public/${id}/places.json`));
    if (!events.events.length || !(places.places || places).length) throw Error(`Do not advertise empty city ${id}`);
    return city;
  });
  const picker = readJSON(file('public/city-picker.json'));
  for (const city of active) {
    const localeRegistry = readJSON(file('data/i18n/market-locales.json'));
    const reviewedLocales = localeRegistry.cities.find(c => c.id === city.id)?.availableLocales;
    const value = {id: city.id, country: city.countryCode, name: city.name, path: city.path, interfaceLanguages: reviewedLocales || city.interfaceLanguages};
    const old = picker.cities.find(c => c.id === city.id);
    if (old) Object.assign(old, value); else picker.cities.push(value);
    if (!picker.countries[city.countryCode]) picker.countries[city.countryCode] = registry.countries[city.countryCode];
    if (!picker.countries[city.countryCode]) throw Error('Missing country labels for ' + city.countryCode);
  }
  writeJSON(file('public/city-picker.json'), picker);
  const paths = Object.fromEntries(picker.cities.map(c => [c.id, c.path]));
  const ids = picker.cities.map(c => c.id);
  const edit = (relative, fn) => { const f = file(relative); const before = fs.readFileSync(f, 'utf8'), after = fn(before); if (before !== after) fs.writeFileSync(f, after); };
  for (const relative of ['public/index.html','public/app-start.html']) edit(relative, source => source.replace(/const (p|pages)=\{[^}]+\};/, (_, name) => `const ${name}=${JSON.stringify(paths)};`));
  edit('public/city-state.js', source => {
    source = mergeLiteral(source, 'cityPaths', paths, 'city-state');
    // Derive the actual selected ID from the route instead of a growing fallback chain.
    source = source.replace(/const name=target\.pathname\.includes\([\s\S]*?;try\{localStorage\.setItem\('morrow-city',name\)/, "const route=target.pathname.replace(/^\\/(?:en|de)\\//,'/');const name=Object.keys(cityPaths).find(id=>route==='/'+cityPaths[id]||id!=='tbilisi'&&route.startsWith('/'+id+'/'))||'tbilisi';try{localStorage.setItem('morrow-city',name)");
    source = mergeLiteral(source, 'cityShareNames', Object.fromEntries(active.map(c => [c.id, c.name.ru])), 'city-state');
    source = mergeLiteral(source, 'englishCityNames', Object.fromEntries(active.map(c => [c.id, c.name.en])), 'city-state');
    return source;
  });
  edit('public/social.js', source => {
    source = source.replace(/CITY=\[[^\]]+\]\.includes\(cityPath\)/, `CITY=${JSON.stringify(ids.filter(id => id !== 'tbilisi'))}.includes(cityPath)`);
    source = mergeLiteral(source, 'zones', Object.fromEntries(active.map(c => [c.id, c.ianaTimezone])), 'social');
    source = mergeLiteral(source, 'cityLabels', Object.fromEntries(active.map(c => [c.id, c.name.ru])), 'social');
    return mergeLiteral(source, 'roots', Object.fromEntries(active.map(c => [c.id, '/' + c.path])), 'social');
  });
  edit('public/plan-account.js', source => {
    source = replaceOnce(source, /const cities=\[[^\]]+\];/, `const cities=${JSON.stringify(ids.filter(id => id !== 'tbilisi'))};`, 'plan-account');
    return mergeLiteral(source, 'keys', Object.fromEntries(active.map(c => [c.id, 'morrow-' + c.id + '-plans-v1'])), 'plan-account');
  });
  edit('lib/plans.ts', source => replaceOnce(source, /if\(!\[[^\]]+\]\.includes\(city\)\)/, `if(!${JSON.stringify(ids)}.includes(city))`, 'plans.ts'));
  for (const relative of ['lib/traffic.ts','public/assets/traffic.js']) edit(relative, source => replaceOnce(source, /const cities=\[[^\]]+\];/, `const cities=${JSON.stringify(ids)};`, relative));
  edit('scripts/install-traffic-pages.mjs', source => {
    const found=source.match(/const cities=(\[[^\]]+\]);/);if(!found)throw Error('Traffic installer city list missing');
    const existing=vm.runInNewContext(found[1]);
    return source.replace(found[0],`const cities=${JSON.stringify([...new Set([...existing,...active.map(c=>c.id)])])};`);
  });
  edit('scripts/build-place-catalog.mjs', source => replaceOnce(source, /for\(const \[city,folder\] of \[[\s\S]*?\]\)\{/, `for(const [city,folder] of ${JSON.stringify(ids.map(id => [id, id === 'tbilisi' ? '' : id + '/']))}){`, 'place catalog'));
  edit('scripts/check-english.cjs', source => source.replace(/for\(const city of \[[^\]]+\]\)for\(const name of \['events\.json','places\.json'\]\)/, `for(const city of ${JSON.stringify(ids.map(id=>id==='tbilisi'?'':id+'/'))})for(const name of ['events.json','places.json'])`));
  edit('scripts/test-unified-share-metadata.cjs', source => {
    source=replaceOnce(source,/const cities=\[[^\]]+\];/,`const cities=${JSON.stringify(ids)};`,'share test cities');
    return source.replace(/assert\.equal\(appCount,\d+,'Every (?:existing|city) app metadata export is tested'\);/,`assert.equal(appCount,${ids.length+1},'Every city app metadata export is tested');`);
  });
  edit('public/language-switch.js', source => {
    const englishOnly=active.filter(c=>c.interfaceLanguages.length===1&&c.interfaceLanguages[0]==='en').map(c=>c.id);
    const block=`// BEGIN EXPANDED CITY LANGUAGES\nconst expandedEnglishOnly=${JSON.stringify(englishOnly)};\nconst expandedPath=location.pathname.replace(/^\\/(?:en|de)(?=\\/)/,'');\nif(expandedEnglishOnly.includes(expandedPath.split('/')[1])){\n const params=new URLSearchParams(location.search);if(params.has('lang'))params.set('lang','en');\n const query=params.toString(),target='/en'+expandedPath+(query?'?'+query:'')+location.hash;\n if(location.pathname+location.search+location.hash!==target){location.replace(target);return;}\n document.addEventListener('DOMContentLoaded',()=>{const label=document.createElement('span');label.className='language-switch';label.textContent='EN';label.setAttribute('aria-label','English interface');document.querySelector('.header,header')?.append(label);});\n return;\n}\n// END EXPANDED CITY LANGUAGES\n`;
    const existing=/\/\/ BEGIN EXPANDED CITY LANGUAGES[\s\S]*?\/\/ END EXPANDED CITY LANGUAGES\n/;
    return existing.test(source)?source.replace(existing,block):source.replace('// Flensburg keeps its own',block+'// Flensburg keeps its own');
  });
  // Generated pages rely on the same root registry; the default chooser is country → city.
  const scan = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() && !['en','de','fr','fr-ca','pt-br','it','downloads'].includes(e.name) ? scan(path.join(dir,e.name)) : e.isFile() ? [path.join(dir,e.name)] : []);
  for (const html of scan(file('public')).filter(f => f.endsWith('.html'))) {
    let source = fs.readFileSync(html, 'utf8');
    const selected = source.match(/data-city="([^"]+)"/)?.[1];
    if (selected && /<select id="citySelect"/.test(source)) {
      const lang = source.match(/<html\s+lang="([^"]+)"/)?.[1] === 'ru' ? 'ru' : 'en';
      const options = picker.cities.map(c => `<option value="/${c.path}"${selected === c.id ? ' selected' : ''}>${esc(c.name[lang] || c.name.en)}</option>`).join('');
      source = source.replace(/(<select id="citySelect"[^>]*>)[\s\S]*?(<\/select>)/, (_, start, end) => start + options + end);
    }
    if (path.basename(html) === 'cities.html') {
      const missing = active.filter(c => !source.includes(`data-city="${c.id}"`));
      const lang = source.includes('<html lang="ru"') ? 'ru' : 'en';
      const cards = missing.map(c => `<a href="${c.path}" class="city-card" data-city="${c.id}" data-country="${c.countryCode}"><span class="city-monogram">${esc(c.name[lang].slice(0,2))}</span><span><strong>${esc(c.name[lang])}</strong><small>${esc(picker.countries[c.countryCode][lang])} · ${esc(c.currency)}</small></span><span>↗</span></a>`).join('');
      if (cards) source = source.replace(/(<div class="city-cards"[^>]*>)([\s\S]*?)(<\/div>)/, (_, start, current, end) => start + current + cards + end);
    }
    fs.writeFileSync(html, source);
  }
  // Build-time aliases are real translations of short UI labels, never of event facts.
  const reviewed = readJSON(file('data/i18n/english-reviewed.json'));
  for (const city of active) {reviewed[city.name.ru] = city.name.en;reviewed[city.name.ru.slice(0,2)]=city.name.en.slice(0,2);}
  for (const country of Object.values(registry.countries)) reviewed[country.ru] = country.en;
  writeJSON(file('data/i18n/english-reviewed.json'), reviewed);
  const ui=readJSON(file('scripts/interface-en.json'));
  for(const city of active){
    reviewed[`Share this map · ${city.name.ru}`]=`Share this map · ${city.name.en}`;
    reviewed[`Map events в ${city.name.ru}`]=`${city.name.en} event map`;
    reviewed[`${city.name.ru} · sources and last update ↗`]=`${city.name.en} · sources and last update ↗`;
  }
  writeJSON(file('data/i18n/english-reviewed.json'),reviewed);
  for(const city of active){const country=picker.countries[city.countryCode];ui[`${country.ru} · ${city.currency}`]=`${country.en} · ${city.currency}`;}
  writeJSON(file('scripts/interface-en.json'),ui);
  return {cityIds: ids, newlyEnabled: active.map(c => c.id)};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) console.log(JSON.stringify(syncRegistry(), null, 2));
