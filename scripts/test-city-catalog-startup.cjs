/* Source-derived startup regression tests. No external requests or production writes.
 * Default deadline tests use a controlled, simulated clock, not browser/network timing.
 * --real-http also verifies a real 5.2-second delayed body on an ephemeral localhost server.
 * --english runs the same checks against the generated public/en source files.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const english = process.argv.includes('--english');
const localePrefix = english ? 'en/' : '';
const publicRoot = 'public/' + localePrefix;
const cities = ['berlin', 'vienna', 'oslo', 'vilnius', 'tbilisi'];
const folder = city => city === 'tbilisi' ? '' : city + '/';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sources = Object.fromEntries(cities.map(city => [city, read(publicRoot + folder(city) + 'app.js')]));
const fixture = {
  startDate: '2026-11-12', endDate: '2026-11-18', generatedAt: '2026-11-12T09:00:00Z',
  events: [{id: 'fixture', title: 'Future show', date: '2026-11-12', time: '20:00',
    category: 'music', price: 0, venue: 'Fixture venue', sourceUrl: 'https://example.com/event'}]
};
let checks = 0;
const pass = message => { checks++; console.log('PASS', message); };
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };

function line(source, prefix) {
  const found = source.split('\n').filter(value => value.startsWith(prefix));
  assert.equal(found.length, 1, 'one source declaration: ' + prefix);
  return found[0];
}
function loaderCode(source) {
  const start = source.indexOf('async function loadCatalog(){');
  const end = source.indexOf('const renderOriginal=render;', start);
  assert(start >= 0 && end > start);
  return [
    line(source, 'const esc='), line(source, 'const safeUrl='),
    line(source, 'function validCatalog('), line(source, 'async function readCatalog('),
    source.slice(start, end)
  ].join('\n');
}
function loaderContext(city, overrides = {}) {
  const ctx = {
    URL, AbortController, setTimeout, clearTimeout, fetch,
    isAndroid: false, catalogOrigin: '', ...overrides
  };
  vm.createContext(ctx);
  vm.runInContext(loaderCode(sources[city]), ctx, {filename: city + '/catalog-loader'});
  return ctx;
}
function fakeClock() {
  let now = 0, nextId = 0;
  const timers = new Map();
  return {
    timers,
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, {fn, at: now + delay}); return id; },
    clearTimeout(id) { timers.delete(id); },
    async advance(ms) {
      const until = now + ms;
      await flush();
      while (true) {
        const next = [...timers].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [id, timer] = next; timers.delete(id); now = timer.at; timer.fn(); await flush();
      }
      now = until; await flush();
    }
  };
}
function delayedBody(clock, signal, ms) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clock.clearTimeout(timer);
      reject(Object.assign(new Error('Simulated transfer abort'), {name: 'AbortError'}));
    };
    const timer = clock.setTimeout(() => {
      signal.removeEventListener('abort', abort); resolve(fixture);
    }, ms);
    signal.addEventListener('abort', abort, {once: true});
  });
}
function observe(promise) {
  const state = {done: false};
  state.finished = promise.then(value => { state.done = true; state.value = value; },
    error => { state.done = true; state.error = error; });
  return state;
}
async function catalogChecks(city) {
  const scenarios = [
    'success', 'body-5200ms', 'abort-retry', 'abort-exhausted', 'network-retry',
    'body-network-retry', 'http-401', 'http-403', 'invalid-json', 'invalid-catalogue'
  ];
  for (const scenario of scenarios) {
    const clock = fakeClock();
    let calls = 0, bodyReads = 0;
    const ctx = loaderContext(city, {
      setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
      fetch: async (url, options) => {
        calls++;
        assert.equal(url, city === 'berlin' ? '/' + localePrefix + 'berlin/events.json' : 'events.json', 'existing URL preserved');
        assert.equal(new URL(url, 'https://happymap.app/' + localePrefix + folder(city)).pathname, '/' + localePrefix + folder(city) + 'events.json', 'city catalogue route preserved');
        assert.equal(options.cache, 'no-store');
        assert(options.signal instanceof AbortSignal);
        if (scenario === 'network-retry' && calls === 1) throw new TypeError('Simulated network failure');
        const status = scenario.startsWith('http-') ? Number(scenario.slice(5)) : 200;
        const attempt = calls;
        return {ok: status === 200, status, json: async () => {
          bodyReads++;
          if (scenario === 'invalid-json') return JSON.parse('{broken');
          if (scenario === 'invalid-catalogue') return {...fixture, events: [{id: 42}]};
          if (scenario === 'body-network-retry' && attempt === 1) throw new TypeError('Simulated body transfer failure');
          if (scenario === 'body-5200ms') return delayedBody(clock, options.signal, 5200);
          if (scenario === 'abort-exhausted' || scenario === 'abort-retry' && attempt === 1)
            return delayedBody(clock, options.signal, 20000);
          return fixture;
        }};
      }
    });
    const outcome = observe(ctx.loadCatalog());
    await flush();
    if (scenario === 'body-5200ms') {
      await clock.advance(4501);
      assert.equal(outcome.done, false, 'body remains allowed after the old 4.5-second cutoff');
      assert.equal(calls, 1);
      await clock.advance(699);
    } else if (scenario === 'abort-retry' || scenario === 'abort-exhausted') {
      await clock.advance(14999);
      assert.equal(calls, 1, 'no premature retry before 15-second deadline');
      assert.equal(outcome.done, false);
      await clock.advance(scenario === 'abort-exhausted' ? 15001 : 1);
    }
    assert.equal(outcome.done, true, 'scenario settles within its expected simulated deadline');
    await outcome.finished;
    const fails = ['abort-exhausted', 'http-401', 'http-403', 'invalid-json', 'invalid-catalogue'].includes(scenario);
    const retries = ['abort-retry', 'abort-exhausted', 'network-retry', 'body-network-retry'].includes(scenario);
    assert.equal(calls, retries ? 2 : 1, 'bounded retry count');
    if (fails) {
      assert(outcome.error, 'failure is not silently accepted');
      if (scenario === 'invalid-json') assert.equal(outcome.error.name, 'SyntaxError');
      if (scenario === 'abort-exhausted') assert.equal(outcome.error.name, 'AbortError');
    } else {
      assert.ifError(outcome.error);
      assert.equal(outcome.value, fixture);
    }
    if (scenario.startsWith('http-')) assert.equal(bodyReads, 0, 'denied response body is not parsed');
    assert.equal(clock.timers.size, 0, 'deadline and body timers cleaned up');
    pass(city + ' ' + scenario + ' (controlled simulated clock)');
  }
}
function element() {
  return {
    innerHTML: '', textContent: '', hidden: false, disabled: false, dataset: {}, style: {},
    classList: {toggle() {}, add() {}, remove() {}}, setAttribute() {},
    querySelector: () => element(), querySelectorAll: () => [], addEventListener() {},
    closest: () => element(), after() {}, append() {}, insertAdjacentHTML() {}
  };
}
async function mapChecks(city) {
  assert.match(read(publicRoot + (city === 'tbilisi' ? 'map.html' : city + '/index.html')), /id="mapFallback"[^>]*hidden/);
  assert.match(sources[city], /function renderMap\(list\)\{\s*if\(!map\)return;/);
  const instant = Date.parse('2026-11-12T10:00:00Z');
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return instant; }
  }
  for (const failure of ['none', 'leaflet', 'basemap', 'cleanup', 'origin']) {
    const nodes = new Map(), warnings = [], errors = [];
    const get = selector => {
      if (!nodes.has(selector)) nodes.set(selector, element());
      return nodes.get(selector);
    };
    get('#mapFallback').hidden = true;
    let removed = 0;
    const map = {
      setView() { return this; }, on() {}, invalidateSize() {}, getSize: () => ({x: 900, y: 600}),
      getZoom: () => 15, latLngToContainerPoint: () => ({x: 400, y: 300}),
      remove() { removed++; if (failure === 'cleanup') throw Error('Injected cleanup failure'); }
    };
    const ctx = {
      console: {warn: (...args) => warnings.push(args), error: (...args) => errors.push(args)},
      Intl, Date: Clock, URL, URLSearchParams, Map, Set, AbortController,
      document: {querySelector: get, getElementById: id => get('#' + id), querySelectorAll: () => [], body: element(),
        documentElement: {lang: english ? 'en' : 'ru'}, createElement: element},
      localStorage: {getItem: () => null},
      location: {search: '?location=city', hash: '', pathname: '/' + localePrefix + (city === 'tbilisi' ? 'map.html' : city + '/'), hostname: 'happymap.app'},
      history: {}, innerWidth: 1200, setTimeout: () => 0, clearTimeout() {},
      requestAnimationFrame() {}, navigator: {}, ResizeObserver: class {observe() {}},
      L: {map() { if (failure === 'leaflet') throw Error('Injected map creation failure'); return map; }},
      HappyMapBasemap: {addTo() {
        if (failure === 'basemap' || failure === 'cleanup') throw Error('Injected basemap failure');
      }},
      HappyMapSearch: {origin() {
        if (failure === 'origin') throw Error('Injected search origin failure');
        return {marker: {remove() {}}, circle: {remove() {}}};
      }},
      MorrowMapLayout: () => []
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(read(publicRoot + 'discovery-model.js'), ctx);
    vm.runInContext(sources[city], ctx, {filename: city + '/app.js'});
    ctx.fixture = city === 'tbilisi'
      ? {...fixture, events: fixture.events.map(event => ({...event, lat: 41.7044, lng: 44.7935}))}
      : fixture;
    if (city === 'tbilisi') {
      assert.equal(vm.runInContext('nearKey', ctx), 'morrow-near-tbilisi-v1');
      assert.equal(vm.runInContext('cityFolder', ctx), '');
      assert.equal(vm.runInContext('radius', ctx), .5);
      assert(sources[city].includes("localStorage.getItem('morrow-real-plans-v1')"));
    }
    vm.runInContext('loadCatalog=async()=>fixture;loadPlaces=async()=>[];', ctx);
    await vm.runInContext('start()', ctx);
    assert.equal((get('#calendar').innerHTML.match(/data-day=/g) || []).length, 7, 'calendar rendered');
    assert.match(get('#eventList').innerHTML, /data-open="fixture"/, 'actual event card rendered');
    assert.match(get('#categories').innerHTML, /data-category=/);
    assert.equal(get('#sourcesButton').disabled, false);
    assert.equal(get('#eventsLayer').disabled, false);
    assert.equal(get('#cityLayer').disabled, false);
    assert.equal(errors.length, 0, 'optional map errors never become catalogue startup errors');
    if (['leaflet', 'basemap', 'cleanup'].includes(failure)) {
      assert.equal(vm.runInContext('map', ctx), null);
      assert.equal(get('#mapFallback').hidden, false);
      assert.equal(removed, failure === 'leaflet' ? 0 : 1);
      assert(warnings.some(args => args[0] === 'Map startup unavailable'));
    } else {
      assert.equal(vm.runInContext('map', ctx), map);
      assert.equal(get('#mapFallback').hidden, true);
      if (failure === 'origin') assert(warnings.some(args => args[0] === 'Search origin unavailable'));
    }
    pass(city + ' ' + failure + ' (actual app/card/calendar functions; stubbed DOM/map)');
  }
}
async function realHttpChecks() {
  const payload = Buffer.from(JSON.stringify(fixture));
  const requests = [], timers = new Set();
  const server = http.createServer((req, res) => {
    const row = {path: req.url, status: 200, completed: false};
    requests.push(row);
    res.writeHead(200, {'Content-Type': 'application/json', 'Content-Length': payload.length});
    res.write(payload.subarray(0, 20));
    const timer = setTimeout(() => { row.completed = true; res.end(payload.subarray(20)); }, 5200);
    timers.add(timer);
    res.on('close', () => { clearTimeout(timer); timers.delete(timer); });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const origin = 'http://127.0.0.1:' + server.address().port;
    await Promise.all(cities.map(async city => {
      const ctx = loaderContext(city);
      const start = performance.now();
      const result = await ctx.readCatalog(origin + '/' + city);
      assert.deepEqual(result, fixture);
      assert(performance.now() - start >= 5000);
      pass(city + ' real localhost delayed body: ' + Math.round(performance.now() - start) + ' ms');
    }));
    assert.equal(requests.length, cities.length, 'one request per delayed catalogue');
    assert(requests.every(row => row.completed), 'every complete body received');
  } finally {
    for (const timer of timers) clearTimeout(timer);
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
(async () => {
  for (const city of cities) { await catalogChecks(city); await mapChecks(city); }
  if (process.argv.includes('--real-http')) await realHttpChecks();
  console.log('PASS ' + checks + ' city catalogue/startup scenarios (' + (english ? 'generated English' : 'source apps') + '). Deployed browser UI not tested here.');
})().catch(error => { console.error(error); process.exitCode = 1; });
