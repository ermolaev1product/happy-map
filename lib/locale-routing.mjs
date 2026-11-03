// Pure locale selection shared by the browser and first-party hosting resolver.
// Availability is deliberately separate from the target locale roadmap.
export function createLocalePolicy(registry) {
 const cities = new Map(registry.cities.map(city => [city.id, city]));
 const supported = new Set(Object.keys(registry.locales));
 const normalize = code => {
  if(typeof code!=='string')return null;
  return [...supported].find(value=>value.toLowerCase()===code.toLowerCase())||
   (code.toLowerCase().startsWith('de-')?'de':null);
 };
 const available = id => cities.get(id)?.availableLocales.filter(locale=>supported.has(locale))||Object.keys(registry.locales).filter(code=>registry.locales[code].uiAvailable!==false);
 const sharedAvailable = raw => registry.sharedLocalizedPages.includes(raw.replace(/^\//,'').replace(/\/$/,''))?Object.keys(registry.locales).filter(code=>registry.locales[code].uiAvailable!==false):['en','ru'];
 const defaultForCity = id => {const city=cities.get(id);return city&&available(id).includes(normalize(city.defaultLocale))?normalize(city.defaultLocale):'en';};
 const choose = (id, explicit, saved) => {
  const ready=available(id);
  for(const value of [explicit,saved,defaultForCity(id),'en','ru']){const locale=normalize(value);if(ready.includes(locale))return locale;}
  return 'en';
 };
 const prefix = locale => registry.locales[normalize(locale)]?.prefix||'';
 const path = (page,locale) => {const pieces=String(page).replace(/^\//,'').split('/');if(Object.values(registry.locales).some(value=>value.prefix&&value.prefix===pieces[0]))pieces.shift();const base='/'+pieces.join('/');const part=prefix(locale);return (part?'/'+part:'')+base;};
 const parse = pathname => {
  const pieces=pathname.split('/').filter(Boolean),match=Object.entries(registry.locales).find(([,value])=>value.prefix&&value.prefix===pieces[0]);
  const explicit=match?.[0]||null;if(match)pieces.shift();
  const city=cities.has(pieces[0])?pieces[0]:/^(?:map|plans)(?:\.html)?$/.test(pieces[0]||'')?'tbilisi':null;
  return {explicit,city,raw:'/'+pieces.join('/')+(pathname.endsWith('/')&&pieces.length?'/':'')};
 };
 return {normalize,available,sharedAvailable,defaultForCity,choose,prefix,path,parse,registry};
}
