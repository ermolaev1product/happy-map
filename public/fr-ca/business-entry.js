(()=>{
const form=document.getElementById('organizerForm'),preview=document.getElementById('organizerPreview');
const en=true;
const t=(ru,eng)=>en?eng:ru;
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.getElementById('addOwnEvent').onclick=()=>document.getElementById('organizerButton').click();
const css=document.createElement('style');css.textContent='#organizerForm[hidden],#organizerPreview[hidden]{display:none!important}';document.head.append(css);
form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const d=new FormData(form);preview.innerHTML=`<strong>${esc(d.get('title'))}</strong><p>${esc(d.get('day'))} · ${esc(d.get('time'))}<br>${esc(d.get('venue'))}</p><p>${t("Ceci est un aperçu. Votre événement n’a pas été publié.","Ceci est un aperçu. Votre événement n’a pas été publié.")}</p><button type="button" id="editEvent" class="filter-button">${t("Modifier","Modifier")}</button><p>${t("La publication d’événements est en préparation. Les annonces gratuites ne nécessitent pas de compte bancaire.","La publication d’événements est en préparation. Les annonces gratuites ne nécessitent pas de compte bancaire.")}</p><button type="button" disabled class="primary-button">${t("Promotion · 25 ₾ / 24 heures — bientôt disponible","Promotion · 25 ₾ / 24 heures — bientôt disponible")}</button>`;form.hidden=true;preview.hidden=false;preview.querySelector('#editEvent').onclick=()=>{preview.hidden=true;form.hidden=false;};preview.scrollIntoView({block:'nearest'});};
})();
