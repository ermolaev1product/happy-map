/* Enhance source links; failed loading leaves the original directory usable. */
(() => {
  'use strict';
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  const label = (value, lang) => value?.[lang] || value?.en || value?.ru || '';
  function collectCities(data, cards, lang) {
    const registry = new Map(data.cities.map(city => [city.id, city]));
    const cities = cards.map(card => {
      const id = card.dataset.city, registered = registry.get(id);
      registry.delete(id);
      // Preserve newly added source cards even before their registry metadata is enriched.
      const sourceCountry = card.dataset.country || card.querySelector('small')?.textContent.split(' · ')[0] || '';
      const fallbackCountry = Object.keys(data.countries).find(key => key === sourceCountry || Object.values(data.countries[key]).some(name => normalize(name) === normalize(sourceCountry))) || sourceCountry;
      return {id, country: registered?.country || fallbackCountry, name: registered?.name || {[lang]: card.querySelector('strong')?.textContent || id}, href: card.getAttribute('href')};
    });
    for (const city of registry.values()) cities.push({...city, href: city.path});
    return cities;
  }
  function matching(cities, query) {
    const q = normalize(query);
    return cities.filter(city => normalize([city.id, ...Object.values(city.name)].join(' ')).includes(q));
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = {normalize, label, collectCities, matching}; return; }
  const script = document.currentScript;
  const dataURL = new URL('../city-picker.json', script ? script.src : location.href);
  const list = document.querySelector('.city-cards');
  if (!list) return;
  fetch(dataURL).then(response => { if (!response.ok) throw Error('City directory unavailable'); return response.json(); }).then(data => {
    const policy=window.HappyMapLocalePolicy;
    const lang=policy?.normalize(document.documentElement.lang)||'en';
    const t = data.copy[lang]||data.copy.en, cards = [...list.querySelectorAll('a[data-city]')];
    const cities = collectCities(data, cards, lang);
    const countryNames=new Intl.DisplayNames([lang],{type:'region'});
    const countryName = id => data.countries[id]?.[lang] || countryNames.of(id) || id;
    const countryIDs = [...new Set(cities.map(city => city.country))].sort((a, b) => countryName(a).localeCompare(countryName(b), lang));
    const create = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
    const remember = city => { try { localStorage.setItem('morrow-city', city.id); } catch {} };
    const cityLink = (city, cls) => { const a = create('a', cls); a.href = city.href; if (city.id === 'flensburg' && lang === 'de') a.href = '/de/' + 'flensburg/index.html'; const target=new URL(a.href,location.href);
      let manual;try{manual=localStorage.getItem('happymap-interface-language')}catch{}
      const entryParams=new URLSearchParams(location.search),requested=entryParams.get('lang');
      const explicit=policy?.normalize(requested)||(!entryParams.has('autoLang')?policy?.parse(location.pathname).explicit:null);
      const selected=policy?policy.choose(city.id,explicit,manual):'en';
      target.pathname=policy?policy.path(target.pathname,selected):target.pathname;
      target.searchParams.delete('autoLang');target.searchParams.delete('lang');if((explicit||manual)&&policy?.available(city.id).includes(policy.normalize(explicit||manual)))target.searchParams.set('lang',selected);
      target.searchParams.set('location','city');a.href=target.href;a.dataset.city = city.id; a.addEventListener('click', () => remember(city)); return a; };
    const intro = document.querySelector('.choose-intro');
    intro.querySelector('.eyebrow').textContent = t.eyebrow;
    intro.querySelector('h1').textContent = t.heading;
    intro.querySelector('p').textContent = t.intro;
    document.querySelector('.city-note').textContent = t.note;
    const download = document.querySelector('.city-top a[href*="android"]'); if (download) download.textContent = t.download;
    const privacy = document.querySelector('[data-traffic-privacy]'); if (privacy) privacy.textContent = t.privacy;
    const controls = create('section', 'picker-controls');
    const steps = create('div', 'picker-steps'), stepCountry = create('span', '', t.countryStep), stepCity = create('span', '', t.cityStep);
    steps.append(stepCountry, stepCity); controls.append(steps);
    let saved; try { saved = localStorage.getItem('morrow-city'); } catch {}
    const current = cities.find(city => city.id === saved);
    if (current) { const a = cityLink(current, 'picker-resume'); a.textContent = t.resume + label(current.name, lang) + ' →'; controls.append(a); }
    const search = create('form', 'picker-search'); search.setAttribute('role', 'search');
    const inputLabel = create('label', '', t.search); inputLabel.htmlFor = 'city-search';
    const input = create('input'); input.type = 'search'; input.id = 'city-search'; input.placeholder = t.placeholder; input.autocomplete = 'off'; input.setAttribute('aria-controls', 'picker-results');
    const clear = create('button', 'picker-clear', t.clear); clear.type = 'button'; clear.disabled = true;
    search.append(inputLabel, input, clear); controls.append(search);
    const back = create('button', 'picker-back', t.back); back.type = 'button'; controls.append(back);
    const heading = create('h2', 'picker-heading'); heading.tabIndex = -1; heading.setAttribute('aria-live', 'polite'); controls.append(heading);
    const status = create('p', 'picker-empty'); status.setAttribute('role', 'status'); status.hidden = true;
    list.id = 'picker-results'; list.before(controls); list.after(status);
    const state = () => { const p = new URLSearchParams(location.hash.slice(1)); return {country: countryIDs.includes(p.get('country')) ? p.get('country') : '', q: p.get('q') || ''}; };
    function render(focus = false) {
      const {country, q} = state(), searching = Boolean(q.trim());
      input.value = q; clear.disabled = !q;
      back.hidden = !country && !searching;
      for (const [step, active] of [[stepCountry, !country && !searching], [stepCity, Boolean(country || searching)]]) {
        if (active) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
      }
      heading.textContent = searching ? t.results : country ? countryName(country) + ' · ' + t.cities : t.countries;
      list.classList.toggle('picker-countries', !country && !searching); list.replaceChildren(); status.hidden = true;
      if (!country && !searching) {
        for (const id of countryIDs) {
          const button = create('button', 'city-card'); button.type = 'button'; button.dataset.country = id;
          const text = create('span'); text.append(create('strong', '', countryName(id)), create('small', '', t.count + cities.filter(city => city.country === id).length));
          const arrow = create('span', '', '→'); arrow.setAttribute('aria-hidden', 'true'); button.append(text, arrow);
          button.addEventListener('click', () => navigate(id, '')); list.append(button);
        }
      } else {
        const visible = (searching ? matching(cities, q) : cities.filter(city => city.country === country)).sort((a, b) => label(a.name, lang).localeCompare(label(b.name, lang), lang));
        for (const city of visible) {
          const a = cityLink(city, 'city-card'), name = label(city.name, lang);
          const monogram = create('span', 'city-monogram', name.slice(0, 2)); monogram.setAttribute('aria-hidden', 'true');
          const text = create('span'); text.append(create('strong', '', name), create('small', '', countryName(city.country)));
          const arrow = create('span', '', '↗'); arrow.setAttribute('aria-hidden', 'true'); a.append(monogram, text, arrow); list.append(a);
        }
        if (!visible.length) { status.textContent = t.empty; status.hidden = false; }
      }
      if (focus) heading.focus();
    }
    function navigate(country, q, replace = false, focus = true) {
      const params = new URLSearchParams(); if (country) params.set('country', country); if (q) params.set('q', q);
      const url = new URL(location.href); url.hash = params.toString();
      history[replace ? 'replaceState' : 'pushState'](null, '', url); render(focus);
    }
    input.addEventListener('input', () => { const s = state(); navigate(s.country, input.value, Boolean(s.q), false); });
    search.addEventListener('submit', event => { event.preventDefault(); const first = list.querySelector('a'); if (first) first.focus(); });
    clear.addEventListener('click', () => { navigate(state().country, '', true, false); input.focus(); });
    input.addEventListener('keydown', event => { if (event.key === 'Escape' && input.value) { event.preventDefault(); clear.click(); } });
    back.addEventListener('click', () => navigate('', ''));
    window.addEventListener('popstate', () => render(true)); window.addEventListener('hashchange', () => render(true));
    render();
  }).catch(() => { /* Keep source city links usable when fetching fails. */ });
})();
