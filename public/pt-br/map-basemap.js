/* Gray OpenStreetMap vector basemap with UI-language labels.
 * MapLibre GL JS 5.6.2 / Leaflet adapter 0.0.22; vendored licenses in assets/maplibre.
 * OpenFreeMap Positron style: https://tiles.openfreemap.org/styles/positron
 */
(function () {
  'use strict';
  const language = 'pt';
  window.HappyMapSearch = {
    // This is a geographic anchor, not a draggable control. Only an explicit
    // location/search action may replace the point; gestures belong to the map.
    origin(map, point, radiusKm, _changed) {
      const lang = document.documentElement.lang.toLowerCase();
      const title = lang.startsWith('ru') ? "Centro da área de busca" : lang.startsWith('de') ? 'Mittelpunkt des Suchgebiets' : "Centro da área de busca";
      const distance = lang.startsWith('ru') ? '500 m · Ø 1 km' : '500 m · Ø 1 km';
      const circle = radiusKm ? L.circle(point, {radius: radiusKm * 1000, color:'#4669ed', weight:2, fillOpacity:.04, interactive:false}).addTo(map) : null;
      const marker = L.marker(point, {
        draggable:false, interactive:false, keyboard:false, autoPan:false,
        zIndexOffset:1000, title, alt:title,
        icon:L.divIcon({className:'search-origin', iconSize:[36,36], iconAnchor:[18,18],
          html:'<span style="display:grid;place-items:center;width:36px;height:36px;border:3px solid white;border-radius:50%;background:#4669ed;color:white;box-shadow:0 1px 8px #0005;font-size:23px;pointer-events:none">✥</span>'})
      }).addTo(map).bindTooltip(radiusKm ? distance : title, {direction:'bottom',offset:[0,18],permanent:!!radiusKm,interactive:false});
      // Defensive inline rule also wins over old cached theme styles.
      if (marker.getElement()) marker.getElement().style.pointerEvents = 'none';
      if (circle?.getElement()) circle.getElement().style.pointerEvents = 'none';
      return {marker,circle};
    }
  };
  window.HappyMapBasemap = {
    addTo(map) {
      const container = map.getContainer();
      container.dataset.mapLanguage = language;
      let failed = false;
      const fallback = () => {
        if (failed) return;
        failed = true;
        container.dataset.basemapState = 'fallback';
        // Standard OSM raster tiles are a best-effort, viewport-only fallback.
        // Leave HTTP caching to the browser; do not add prefetch/offline downloads.
        // Policy: https://operations.osmfoundation.org/policies/tiles/
        const localLabels = language === 'ru'
          ? "Mapa alternativo: os nomes podem estar no idioma local."
          : "Mapa alternativo: os nomes podem estar no idioma local.";
        const tileError = language === 'ru'
          ? "O mapa de fundo está incompleto. Os lugares estão disponíveis na lista."
          : "O mapa de fundo está incompleto. Os lugares estão disponíveis na lista.";
        let statusElement;
        const status = L.control({position: 'bottomleft'});
        status.onAdd = () => {
          statusElement = L.DomUtil.create('div', 'map-label-status');
          statusElement.style.cssText = 'background:white;padding:6px 10px;border-radius:8px;max-width:240px;font-size:12px';
          statusElement.setAttribute('role', 'status');
          statusElement.textContent = localLabels;
          return statusElement;
        };
        status.addTo(map);
        const raster = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, maxNativeZoom: 19,
          updateWhenIdle: true, updateWhenZooming: false,
          referrerPolicy: 'strict-origin-when-cross-origin',
          attribution: "© <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> colaboradores"
        });
        raster.on('loading', () => {
          container.dataset.basemapTiles = 'loading';
          if (statusElement) statusElement.textContent = localLabels;
        });
        raster.on('tileerror', () => {
          container.dataset.basemapTiles = 'error';
          if (statusElement) statusElement.textContent = tileError;
        });
        raster.on('load', () => {
          if (container.dataset.basemapTiles !== 'error') container.dataset.basemapTiles = 'ready';
        });
        raster.addTo(map);
      };
      if (!window.maplibregl || !L.maplibreGL) { fallback(); return; }
      let layer;
      try {
        layer = L.maplibreGL({
          style: '/assets/maplibre/positron-' + language + '.json',
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://openmaptiles.org">OpenMapTiles</a> · <a href="https://openfreemap.org">OpenFreeMap</a>',
          interactive: false
        });
        // Retain the layer even if onAdd throws after Leaflet registers its events.
        layer.addTo(map);
        const gl = layer.getMaplibreMap();
        const timer = setTimeout(() => {
          if (container.dataset.basemapState !== 'ready') { map.removeLayer(layer); fallback(); }
        }, 20000);
        gl.on('load', () => { clearTimeout(timer); if (!failed) container.dataset.basemapState = 'ready'; });
        map.once('unload', () => clearTimeout(timer));
        return layer;
      } catch (error) {
        console.warn("Mapa de fundo indisponível", error);
        if (layer && map.hasLayer(layer)) map.removeLayer(layer);
        fallback();
      }
    }
  };
})();
