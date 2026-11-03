/* Focused basemap fault coverage. No network requests or tile prefetching. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(file, language, mode) {
  const container = {dataset:{}};
  const controls = [], tiles = [], timers = new Map(), glEvents = {}, mapEvents = {}, layers = new Set();
  let nextTimer = 0, vectorOptions;
  const map = {
    getContainer: () => container, hasLayer: layer => layers.has(layer),
    removeLayer(layer) { layers.delete(layer); },
    once(name, fn) { mapEvents[name] = fn; }
  };
  const L = {
    DomUtil: {create: () => ({style:{},setAttribute(name,value){this[name]=value;}})},
    control: () => ({addTo(){controls.push(this.onAdd());return this;}}),
    tileLayer(url, options) {
      const tile = {url, options, events:{},on(name,fn){this.events[name]=fn;return this;},addTo(){tiles.push(this);this.events.loading();return this;}};
      return tile;
    },
    maplibreGL(options) {
      vectorOptions = options;
      const layer = {
        addTo(){layers.add(this);if(mode==='throw')throw Error('WebGL unavailable');return this;},
        getMaplibreMap: () => ({on(name,fn){glEvents[name]=fn;}})
      };
      return layer;
    }
  };
  const window = mode==='missing' ? {} : {maplibregl:{}};
  const context = {window,L,document:{documentElement:{lang:language}},console:{warn(){}},
    setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  window.HappyMapBasemap.addTo(map);
  return {container,controls,tiles,timers,glEvents,mapEvents,layers,vectorOptions};
}
for (const [file, language] of [['public/map-basemap.js','ru'],['public/map-basemap.js','en'],['public/en/map-basemap.js','en']]) {
  for (const mode of ['missing','throw','timeout']) {
    const t=setup(file,language,mode);
    if (mode==='timeout') for(const fn of [...t.timers.values()])fn();
    assert.equal(t.tiles.length,1,`${file} ${mode}: one raster layer`);
    assert.equal(t.layers.size,0,'failed vector removed');
    assert.equal(t.container.dataset.basemapState,'fallback');
    const tile=t.tiles[0];
    assert.equal(tile.url,'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    assert.equal(tile.options.referrerPolicy,'strict-origin-when-cross-origin');
    assert.equal(tile.options.maxZoom,19);
    assert.equal(tile.options.updateWhenIdle,true);
    assert.equal(tile.options.updateWhenZooming,false);
    assert.match(tile.options.attribution,/href="https:\/\/www\.openstreetmap\.org\/copyright"/);
    assert.equal(t.controls.length,1);
    assert.equal(t.controls[0].role,'status');
    assert.match(t.controls[0].textContent,language==='ru'?/местном языке/:/local language/);
    tile.events.load(); assert.equal(t.container.dataset.basemapTiles,'ready');
    tile.events.loading(); tile.events.tileerror(); tile.events.load();
    assert.equal(t.container.dataset.basemapTiles,'error');
    assert.match(t.controls[0].textContent,language==='ru'?/не полностью/:/incomplete/);
    tile.events.loading(); tile.events.load();
    assert.equal(t.container.dataset.basemapTiles,'ready');
    assert.match(t.controls[0].textContent,language==='ru'?/местном языке/:/local language/);
    if (mode==='timeout') { t.glEvents.load(); assert.equal(t.container.dataset.basemapState,'fallback','late GL event must not overwrite fallback'); }
  }
  const ready=setup(file,language,'ready');
  assert.equal(ready.tiles.length,0,'working vector must not fetch fallback');
  assert.equal(ready.vectorOptions.style,`/assets/maplibre/positron-${language}.json`);
  ready.glEvents.load(); assert.equal(ready.container.dataset.basemapState,'ready');
  assert.equal(ready.timers.size,0);
  const unload=setup(file,language,'ready');unload.mapEvents.unload();assert.equal(unload.timers.size,0);
  console.log(`PASS ${file} (${language}): missing/WebGL/timeout, local labels, tile errors/recovery, vector success and unload`);
}
const source=fs.readFileSync('public/map-basemap.js','utf8');
assert.doesNotMatch(source,/cartocdn|no-cache|no-store|fetch\(/);
console.log('PASS fallback policy safeguards: direct browser images, no CARTO, proxy, custom cache or prefetch');
