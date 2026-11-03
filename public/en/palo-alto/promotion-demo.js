/* One isolated preview experiment. Never loaded by the regular map or feed. */
(function (root) {
  'use strict';
  const ENABLED = true; // Set false to disable the crown in this preview.
  const EVENT_ID = 'pa-0c5834ed4d0ef40b';
  const EVENT_DATE = '2026-10-22';
  const LABEL = 'Promotion demo';
  const DISCLOSURE = 'Visual experiment only. No payment was received and no organizer partnership is implied. Event order is unchanged.';
  const crown = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="m3 7 5 4 4-7 4 7 5-4-2 12H5L3 7Z" fill="currentColor"/><path d="M6 22h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const isTarget = event => !!event && event.kind !== 'place' && event.id === EVENT_ID && event.date === EVENT_DATE;
  const active = (event, enabled = ENABLED, now = Date.now()) => enabled && isTarget(event) && !event.cancelled && event.status !== 'cancelled' && Number.isFinite(Date.parse(event.endAt)) && now < Date.parse(event.endAt);
  const badge = event => active(event) ? '<span class="promotion-demo-badge" title="'+DISCLOSURE+'">'+crown+LABEL+'</span>' : '';
  const marker = event => active(event) ? '<span class="promotion-demo-crown" aria-hidden="true">'+crown+'</span>' : '';
  const disclosure = event => active(event) ? '<aside class="promotion-demo-disclosure" aria-label="'+LABEL+'">'+badge(event)+'<p>'+DISCLOSURE+'</p></aside>' : '';
  root.HappyMapPromotionDemo = Object.freeze({enabled:ENABLED,eventId:EVENT_ID,eventDate:EVENT_DATE,label:LABEL,disclosureText:DISCLOSURE,crown,isTarget,active,badge,marker,disclosure});
})(globalThis);
