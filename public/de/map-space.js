(() => {
 const locale='en';
 const copy=locale==='de'?{home:'Startseite',filters:'Weitere Filter und Daten',events:'Veranstaltungen',city:'Ganze Stadt'}:locale==='en'?{home:"Startseite",filters:"Weitere Filter und Daten",events:"Veranstaltungen",city:"Ganze Stadt"}:{home:"Startseite",filters:"Weitere Filter und Daten",events:"Veranstaltungen",city:"Ganze Stadt"};
 document.querySelectorAll('a.wordmark').forEach(a=>{a.href=true?'/de/index.html':'/de/index.html';a.setAttribute('aria-label','Happy Map — '+copy.home)});
 const workspace=document.getElementById('workspace');if(!workspace)return;
 const drawer=document.createElement('details');drawer.className='map-options';
 const summary=document.createElement('summary');summary.textContent=copy.filters;drawer.append(summary);
 for(const selector of ['.filter-actions','#extraFilters','#catalogStatus','#coverageControls']){const el=document.querySelector(selector);if(el)drawer.append(el)}
 workspace.after(drawer);if(true){const note=document.createElement('p');note.className='muted';note.textContent="Die Bedienoberfläche ist auf Deutsch. Veranstaltungsbeschreibungen können auf Englisch oder in der Originalsprache erscheinen. Jeder Eintrag verlinkt die Originalankündigung.";drawer.append(note);}
 const events=document.getElementById('eventsLayer');if(events)events.textContent=copy.events;
 const city=document.getElementById('cityLayer');if(city)city.textContent=copy.city;
})();

// A single, compact mobile header. Move existing controls so their handlers,
// translated labels and destinations stay intact; restore them on wider screens.
(() => {
 function setupMobileHeader(){
  const header=document.querySelector('.map-first .header');
  const menu=header?.querySelector('.more-menu'),items=menu?.querySelector('div');
  const peace=items?.querySelector('[data-peace]');
  if(!header||!menu||!items||!peace)return;
  const media=window.matchMedia('(max-width: 760px)');
  const download=header.querySelector('.app-download');
  const bottomNav=document.querySelector('.mobile-nav');
  const downloadLabel=download?.querySelector('span:last-child');
  const fullDownloadLabel=downloadLabel?.textContent;
  if(download)download.setAttribute('aria-label',fullDownloadLabel||download.textContent);
  const movable=[peace,header.querySelector('.social-nav'),header.querySelector('#addOwnEvent')].filter(Boolean);
  const homes=movable.map(node=>{const home=document.createComment('mobile-header-home');node.before(home);return {node,home};});
  peace.classList.add('bottom-peace');
  function layout(){
   menu.open=false;
   header.classList.toggle('header--compact',media.matches);
   if(downloadLabel)downloadLabel.textContent=media.matches?({ru:String.fromCharCode(1057,1082,1072,1095,1072,1090,1100),de:'App laden'}[document.documentElement.lang]||"App laden"):fullDownloadLabel;
   for(const {node,home} of homes){
    if(media.matches){if(node===peace)(bottomNav||items).append(node);else items.append(node);}
    else home.after(node);
   }
  }
  // Menus dismiss after an action, outside interaction or Escape. The original
  // peace dialog and account/event buttons remain responsible for their actions.
  menu.addEventListener('click',event=>{if(event.target.closest('a,button'))menu.open=false;});
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}});
  document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))menu.open=false;});
  media.addEventListener('change',layout);
  layout();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupMobileHeader,{once:true});
 else setupMobileHeader();
})();
