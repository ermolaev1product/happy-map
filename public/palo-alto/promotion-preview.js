/* A read-only single-event preview. Never changes filters, plans or local storage. */
(async function () {
  'use strict';
  const demo = globalThis.HappyMapPromotionDemo;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? esc(url.href) : ''; } catch { return ''; } };
  const talk = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 1-8 8H4l1.5-4A8 8 0 1 1 20 11Z"/><path d="M8 9h8M8 13h5"/></svg>';
  const clock = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const pin = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  let event, map, marker, opener;
  const dialog = $('#previewDetails');
  const enabled = () => $('#demoToggle').checked && demo.active(event);
  const date = () => new Date(event.startAt).toLocaleDateString('en-US', {timeZone:event.timezone,weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const time = value => new Date(value).toLocaleTimeString('en-US', {timeZone:event.timezone,hour:'numeric',minute:'2-digit'});
  const facts = () => '<ul class="preview-facts"><li>'+clock+'<div><strong>'+esc(date())+'</strong>'+esc(time(event.startAt))+'–'+esc(time(event.endAt))+' · Pacific Time</div></li><li>'+pin+'<div><strong>'+esc(event.venue)+'</strong>'+esc(event.address)+'</div></li></ul>';
  const badge = () => enabled() ? demo.badge(event) : '';
  function showDetails(source) {
    opener = source || document.activeElement;
    $('#detailsBody').innerHTML = '<p class="details-date">'+esc(date())+' · Palo Alto</p><h2 id="detailsTitle">'+esc(event.title)+'</h2>'+facts()+(enabled()?demo.disclosure(event):'<p>This is a visual experiment; no payment or partnership is implied.</p>')+'<p>'+esc(event.description)+'</p><p><strong>General admission: $'+esc(event.price)+'</strong><br>'+esc(event.priceNote)+'</p><p>'+esc(event.accessNote)+'</p><a class="details-source" href="'+safeUrl(event.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Check organizer details ↗</a>';
    if (!dialog.open) dialog.showModal();
  }
  $('#closeDetails').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus(); });
  dialog.addEventListener('click', e => { const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close(); });
  function render() {
    const on=enabled(), ended=Date.now()>=Date.parse(event.endAt);
    $('#demoState').textContent = on ? demo.label : ended ? 'Event has ended · preview only' : 'Original style · demo off';
    $('#previewCard').innerHTML = '<article class="preview-event-card'+(on?' is-promoted':'')+'">'+badge()+'<p class="event-category">TALKS · PALO ALTO</p><h2>'+esc(event.title)+'</h2>'+facts()+'<div class="preview-price"><strong>$'+esc(event.price)+'</strong><span>General admission</span></div><button type="button" id="openDetails" class="preview-button">View event details <span aria-hidden="true">↗</span></button><p class="preview-date-note">'+(ended?'This event has ended. This page is a design preview.':'Scheduled for October 22, 2026. This preview does not move the event into today’s results.')+'</p></article>';
    $('#openDetails').onclick = e => showDetails(e.currentTarget);
    if (map) {
      if (marker) marker.remove();
      const label=event.title+' · '+date()+(on?' · '+demo.label:'');
      const html='<button type="button" class="preview-pin'+(on?' promotion-demo-pin':'')+'" aria-label="'+esc(label)+'">'+(on?demo.marker(event):'')+'<span class="compact-dot">'+talk+'</span><span class="preview-pin-label">'+esc(event.title)+'</span></button>';
      marker=L.marker([event.lat,event.lng],{keyboard:false,icon:L.divIcon({className:'preview-pin-wrapper',html,iconSize:[44,44],iconAnchor:[22,22]})}).addTo(map);
      marker.bindTooltip(esc(label),{direction:'top',offset:[0,-20],className:'preview-tooltip'});
      marker.on('click',()=>showDetails(marker.getElement()?.querySelector('button')));
    }
  }
  $('#demoToggle').onchange=()=>{render();if(dialog.open)showDetails(opener);};
  try {
    const response=await fetch('events.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Catalogue unavailable');
    const catalogue=await response.json();event=catalogue.events.find(demo.isTarget);
    if(!event||!Number.isFinite(event.lat)||!Number.isFinite(event.lng))throw new Error('Demo listing unavailable');
    $('#mapCaption').textContent='Palo Alto · Oct 22, 2026 · 6:30–8:30 PM';
    $('#demoToggle').disabled=!demo.active(event);
    try { map=L.map('previewMap',{scrollWheelZoom:false,minZoom:9,maxZoom:18,zoomControl:false}).setView([event.lat,event.lng],15);L.control.zoom({position:'topright'}).addTo(map);HappyMapBasemap.addTo(map);new ResizeObserver(()=>map.invalidateSize()).observe($('#previewMap')); } catch { $('#mapError').hidden=false; }
    render();
  } catch (error) {
    $('#demoToggle').disabled=true;
    $('#demoState').textContent='Preview unavailable';
    $('#previewCard').innerHTML='<div class="preview-error">This demo listing could not be loaded. <a href="promotion-demo.html">Try again</a> or <a href="index.html">return to the map</a>.</div>';
    $('#mapCaption').textContent='Promotion demo · listing unavailable';
  }
})();
