import registry from '../data/i18n/market-locales.json' with {type:'json'};
import {createLocalePolicy} from './locale-routing.mjs';
const policy=createLocalePolicy(registry);
const normal=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-zа-яё0-9]/g,'');
// Trusted hosting metadata only. No caller-supplied geo headers, raw IP logging,
// external geolocation vendor, or GPS permission for interface language.
export function localeFromHosting(cf) {
 const country=typeof cf?.country==='string'?cf.country.toUpperCase():'';
 if(!/^[A-Z]{2}$/.test(country))return {language:'en',source:'fallback'};
 if(['RU','GE','AM'].includes(country))return {language:'ru',source:'hosting-ip'};
 const candidates=registry.cities.filter(city=>city.country===country);
 const cityName=normal(cf?.city),city=candidates.find(c=>normal(c.name)===cityName||normal(c.id)===cityName);
 if(city)return {language:policy.defaultForCity(city.id),source:'hosting-ip'};
 const defaults=[...new Set(candidates.map(c=>policy.defaultForCity(c.id)))];
 const language=candidates.length&&!candidates.some(c=>c.countryDefaultUncertain)&&defaults.length===1?defaults[0]:'en';
 return {language,source:'hosting-ip'};
}
