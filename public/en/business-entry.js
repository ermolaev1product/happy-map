(()=>{
const form=document.getElementById('organizerForm'),preview=document.getElementById('organizerPreview');
const en=document.documentElement.lang==='en';
const t=(ru,eng)=>en?eng:ru;
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.getElementById('addOwnEvent').onclick=()=>document.getElementById('organizerButton').click();
const css=document.createElement('style');css.textContent='#organizerForm[hidden],#organizerPreview[hidden]{display:none!important}';document.head.append(css);
form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const d=new FormData(form);preview.innerHTML=`<strong>${esc(d.get('title'))}</strong><p>${esc(d.get('day'))} · ${esc(d.get('time'))}<br>${esc(d.get('venue'))}</p><p>${t("This is a preview. Your event has not been published.",'This is a preview. Your event has not been published.')}</p><button type="button" id="editEvent" class="filter-button">${t("Edit",'Edit')}</button><p>${t("Event publishing is being prepared. Free listings do not require a bank account.",'Event publishing is being prepared. Free listings do not require a bank account.')}</p><button type="button" disabled class="primary-button">${t("Promotion · 25 ₾ / 24 hours — coming soon",'Promotion · 25 ₾ / 24 hours — coming soon')}</button>`;form.hidden=true;preview.hidden=false;preview.querySelector('#editEvent').onclick=()=>{preview.hidden=true;form.hidden=false;};preview.scrollIntoView({block:'nearest'});};
})();
