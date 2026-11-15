(()=>{
const form=document.getElementById('organizerForm'),preview=document.getElementById('organizerPreview');
const en=true;
const t=(ru,eng)=>en?eng:ru;
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.getElementById('addOwnEvent').onclick=()=>document.getElementById('organizerButton').click();
const css=document.createElement('style');css.textContent='#organizerForm[hidden],#organizerPreview[hidden]{display:none!important}';document.head.append(css);
form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const d=new FormData(form);preview.innerHTML=`<strong>${esc(d.get('title'))}</strong><p>${esc(d.get('day'))} · ${esc(d.get('time'))}<br>${esc(d.get('venue'))}</p><p>${t("Esta es una vista previa. Tu evento no se ha publicado.","Esta es una vista previa. Tu evento no se ha publicado.")}</p><button type="button" id="editEvent" class="filter-button">${t("Editar","Editar")}</button><p>${t("La publicación de eventos está en preparación. Los anuncios gratuitos no requieren una cuenta bancaria.","La publicación de eventos está en preparación. Los anuncios gratuitos no requieren una cuenta bancaria.")}</p><button type="button" disabled class="primary-button">${t("Promoción · 25 ₾ / 24 horas — próximamente","Promoción · 25 ₾ / 24 horas — próximamente")}</button>`;form.hidden=true;preview.hidden=false;preview.querySelector('#editEvent').onclick=()=>{preview.hidden=true;form.hidden=false;};preview.scrollIntoView({block:'nearest'});};
})();
