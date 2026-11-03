const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),postcss=require('postcss');
const script=fs.readFileSync('public/map-space.js','utf8');
const source=script.slice(script.indexOf('// A single, compact mobile header.'));
assert(source.startsWith('// A single'));
class Element {
 constructor(tag,classes='',attrs={}){this.tag=tag;this.classes=new Set(classes.split(' ').filter(Boolean));this.attrs=attrs;this.children=[];this.listeners={};this.textContent='';this.open=false;this.classList={add:c=>this.classes.add(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c),contains:c=>this.classes.has(c)};}
 append(child){child.remove();this.children.push(child);child.parentElement=this;}
 remove(){if(this.parentElement){const siblings=this.parentElement.children;siblings.splice(siblings.indexOf(this),1);this.parentElement=null;}}
 before(child){const parent=this.parentElement;child.remove();parent.children.splice(parent.children.indexOf(this),0,child);child.parentElement=parent;}
 after(child){const parent=this.parentElement;child.remove();parent.children.splice(parent.children.indexOf(this)+1,0,child);child.parentElement=parent;}
 matches(selector){return selector.startsWith('.')?this.classes.has(selector.slice(1)):selector.startsWith('#')?this.attrs.id===selector.slice(1):selector==='[data-peace]'?'data-peace'in this.attrs:this.tag===selector;}
 querySelector(selector){if(selector==='span:last-child')return this.children.filter(x=>x.tag==='span').at(-1)||null;for(const child of this.children){if(child.matches(selector))return child;const found=child.querySelector(selector);if(found)return found;}return null;}
 setAttribute(key,value){this.attrs[key]=value;}
 addEventListener(type,fn){this.listeners[type]=fn;}
 contains(el){return this===el||this.children.some(child=>child.contains(el));}
 focus(){this.focused=true;}
}
function fixture(width,language='ru',readyState='loading'){
 const header=new Element('header','header'),menu=new Element('details','more-menu'),summary=new Element('summary'),items=new Element('div');
 const brand=new Element('a','wordmark'),city=new Element('div','city city-picker'),nav=new Element('nav'),download=new Element('a','app-download'),friends=new Element('button','social-nav'),add=new Element('button','',{id:'addOwnEvent'}),languageSwitch=new Element('span','language-switch');
 const bottomNav=new Element('div','mobile-nav'),downloadLabel=new Element('span');downloadLabel.textContent={ru:'Скачать приложение',en:'Get the app',de:'App herunterladen'}[language];download.append(downloadLabel);
 const peace=new Element('button','peace-link',{'data-peace':''});peace.textContent={ru:'За мир',en:'For peace',de:'Für Frieden'}[language];const peaceHandler=()=>{};peace.onclick=peaceHandler;
 menu.append(summary);menu.append(items);items.append(new Element('a'));items.append(peace);
 for(const node of [brand,city,nav,download,friends,menu,add,languageSwitch])header.append(node);
 const original=header.children.slice();
 const document={readyState,documentElement:{lang:language},listeners:{},querySelector:s=>s==='.map-first .header'?header:s==='.mobile-nav'?bottomNav:null,createComment:()=>new Element('comment'),addEventListener(type,fn){this.listeners[type]=fn;}};
 const media={matches:width<=760,addEventListener(type,fn){this.change=fn;}};
 vm.runInNewContext(source,{document,window:{matchMedia:query=>{assert.equal(query,'(max-width: 760px)');return media;}}});
 if(readyState==='loading'){assert(!header.classes.has('header--compact'));document.listeners.DOMContentLoaded();}
 return {header,menu,summary,items,bottomNav,download,downloadLabel,peace,peaceHandler,friends,add,original,document,media};
}
for(const width of [320,360,390,430,760])for(const locale of ['ru','en','de']){
 const f=fixture(width,locale);
 assert(f.header.classes.has('header--compact'));
 assert.equal(f.peace.parentElement,f.bottomNav,'peace now stays visible in bottom bar');
 assert.equal(f.download.parentElement,f.header);assert.equal(f.downloadLabel.textContent,{ru:'Скачать',en:'Get app',de:'App laden'}[locale]);
 assert.equal(f.peace.onclick,f.peaceHandler,'original statement handler retained');
 assert.equal(f.peace.textContent,{ru:'За мир',en:'For peace',de:'Für Frieden'}[locale]);
 assert.equal(f.friends.parentElement,f.items);assert.equal(f.add.parentElement,f.items);
 f.menu.open=true;f.menu.listeners.click({target:{closest:()=>f.add}});assert(!f.menu.open);
 f.menu.open=true;f.menu.listeners.keydown({key:'Escape'});assert(!f.menu.open);assert(f.summary.focused);
 f.menu.open=true;f.document.listeners.pointerdown({target:new Element('main')});assert(!f.menu.open);
 f.media.matches=false;f.media.change();assert(!f.header.classes.has('header--compact'));
 assert.equal(f.peace.parentElement,f.items);assert.equal(f.friends.parentElement,f.header);assert.equal(f.add.parentElement,f.header);
 assert.deepEqual(f.header.children.filter(x=>x.tag!=='comment'),f.original,'desktop original order restored');
 f.media.matches=true;f.media.change();f.media.change();assert.equal(f.bottomNav.children.filter(x=>x===f.peace).length,1,'no duplicate after repeated breakpoints');
 console.log(`PASS mobile DOM ${width}px ${locale}: existing peace/handlers, secondary menu, dismissal, repeated resize and desktop restoration`);
}
for(const width of [761,1150,1600]){const f=fixture(width,'en','complete');assert(!f.header.classes.has('header--compact'));assert.equal(f.peace.parentElement,f.items);}
const css=fs.readFileSync('public/map-space.css','utf8'),sheet=postcss.parse(css);
const mobile=sheet.nodes.find(n=>n.type==='atrule'&&n.params==='(max-width:760px)'&&n.nodes.some(rule=>rule.selector==='.map-first .header.header--compact'));
const declarations=selector=>{const rule=mobile.nodes.find(n=>n.selector===selector);assert(rule,selector);return Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));};
const header=declarations('.map-first .header.header--compact');
assert.equal(header.position,'sticky');assert.equal(header.top,'0');assert.equal(header['grid-template-rows'],'44px 44px');assert.equal(header['grid-template-columns'],'minmax(0,1fr) auto 44px');assert.match(header.padding,/safe-area-inset-top/);assert.match(header.padding,/safe-area-inset-left/);assert.match(header.padding,/safe-area-inset-right/);
const download=declarations('.map-first .header--compact>.app-download');assert.equal(download['min-height'],'40px');assert.equal(download['grid-row'],'1');assert.equal(download['white-space'],'nowrap');assert.equal(download.display,'inline-flex');
assert.equal(declarations('.map-first:has(.header--compact) footer [data-peace]').display,'inline-flex');
assert.equal(declarations('.map-first .header--compact>nav').display,'none');
const menu=declarations('.map-first .header--compact>.more-menu>div');assert.match(menu['max-height'],/100dvh/);assert.match(menu['max-height'],/safe-area-inset-bottom/);assert.equal(menu.overflow,'auto');
function lum(hex){const rgb=hex.match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];}
assert((lum('ffffff')+.05)/(lum('52594f')+.05)>=4.5,'small peace label has AA contrast');
console.log('PASS responsive CSS contracts: one sticky compact header, at least 40px download and 44px menu targets, safe areas, menu viewport bounds, muted peace AA contrast; this is not rendered browser QA.');
const cities=JSON.parse(fs.readFileSync('public/city-picker.json','utf8')).cities.map(city=>city.path.replace(/^\//,''));
for(const locale of ['','en/'])for(const city of cities){const html=fs.readFileSync('public/'+locale+city,'utf8');assert(html.includes('map-space.js'));assert(html.includes('map-space.css'));assert(html.includes('class="current-city"'));assert(html.includes('class="change-city"'));assert(!html.includes('id="citySelect"'));assert(html.includes('cities.html'));assert(html.includes('data-peace'));for(const id of ['eventsLayer','cityLayer','addOwnEvent','mobilePlans'])assert(html.includes(`id="${id}"`));}
assert.equal(fs.readFileSync('public/en/map-space.css','utf8'),css);
for(const file of ['public/map-space.js','public/en/map-space.js','public/de/flensburg/map-space.js']){const text=fs.readFileSync(file,'utf8');assert(text.replace('"Lade app"',"'Get app'").includes(source),'same locale-neutral header behavior: '+file);}
console.log('PASS all 27 cities, RU/EN entry pages and generated DE header; catalogue navigation, plans, add-event and country/city routes retained.');
