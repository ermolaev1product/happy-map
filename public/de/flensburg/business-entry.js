(()=>{
const form=document.getElementById('organizerForm'),preview=document.getElementById('organizerPreview');
const en=true;
const t=(ru,eng)=>en?eng:ru;
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.getElementById('addOwnEvent').onclick=()=>document.getElementById('organizerButton').click();
const css=document.createElement('style');css.textContent='#organizerForm[hidden],#organizerPreview[hidden]{display:none!important}';document.head.append(css);
form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const d=new FormData(form);preview.innerHTML=`<strong>${esc(d.get('title'))}</strong><p>${esc(d.get('day'))} · ${esc(d.get('time'))}<br>${esc(d.get('venue'))}</p><p>${t("Dies ist eine Vorschau. Deine Veranstaltung wurde noch nicht veröffentlicht.","Dies ist eine Vorschau. Deine Veranstaltung wurde noch nicht veröffentlicht.")}</p><button type="button" id="editEvent" class="filter-button">${t("Bearbeiten","Bearbeiten")}</button><p>${t("Die Veröffentlichung wird vorbereitet. Für kostenlose Einträge ist kein Bankkonto nötig.","Die Veröffentlichung wird vorbereitet. Für kostenlose Einträge ist kein Bankkonto nötig.")}</p><button type="button" disabled class="primary-button">${t("Bewerbung · bald verfügbar","Bewerbung · bald verfügbar")}</button>`;form.hidden=true;preview.hidden=false;preview.querySelector('#editEvent').onclick=()=>{preview.hidden=true;form.hidden=false;};preview.scrollIntoView({block:'nearest'});};
})();
