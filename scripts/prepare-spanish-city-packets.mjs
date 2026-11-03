import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {normalizePacket} from './city-expansion/normalize-packet.mjs';
import {renderCity} from './city-expansion/render-city.mjs';

// Adapt already verified research to the existing renderer, without dropping admission caveats.
// No network, inferred hours, new research, or edits to the twenty existing city feeds.
const registry=JSON.parse(fs.readFileSync('data/city-expansion/registry.json'));
const baselineTranslations=JSON.parse(execFileSync('git',['show','1d7491a0cf1fcee42889b80a3e9a75b593e30549:data/i18n/english-reviewed.json'],{maxBuffer:50e6}));
const extraFields=['originalTitle','originalTitleLanguage','titleEs','titleCa','dateEvidence','evidenceUrls','availabilityNote','availabilityVerified','ageRecommendation','ageRestriction','doorsTime','durationMinutesApprox','conflictResolution','originalDateRange','scheduleNote','priceEvidence','priceSource','priceType','registrationRequired','registrationRecommended','registrationStatus','registrationUrl','registrationOpens','programmeId','languages','freeEntryWindows','freeEntrySource','lastEntry','lastEntrySource','accessibilityNoteEn','admissionNoteEn','coordinateNote'];
const reviewed=[];
for(const id of ['barcelona','madrid']){
  const raw=JSON.parse(fs.readFileSync(`data/city-expansion/research/${id}.json`));
  const adapted=structuredClone(raw);
  for(const place of adapted.places)if(place.category==='science')place.category='city';
  if(typeof adapted.coverage!=='string')adapted.coverage='Initial source-verified selection: 73 dated records across 28 programmes, with 25 separately listed venues. Not a comprehensive Madrid calendar. Ticket availability and reservations are not guaranteed; access conditions are stated on each listing. Instagram coverage remains unavailable.';
  for(const event of adapted.events){
    event.originalTitle=event.originalTitle||event.title;
    // Local names are more useful on Spanish venue signage; the explanatory text stays English.
    event.titleEn=event.originalTitle;
    if(id==='madrid'&&['dance','circus'].includes(event.category))event.category='theatre';
    if(event.category==='party')event.category='music';
    if(event.category==='conference')event.category='talk';
    for(const field of ['ageRating','ageRecommendation'])if(baselineTranslations[event[field]])event[field]=baselineTranslations[event[field]];
    if(event.languages&&!event.language)event.language=event.languages.map(x=>x.toUpperCase()).join(' / ');
    if(event.priceType==='from')event.min=true;
    if(event.room&&!event.hall)event.hall=event.room;
    const notes=[event.descriptionEn,event.admissionNoteEn,event.accessibilityNoteEn,event.coordinateNote];
    if(event.availabilityNote&&!notes.some(note=>note?.includes(event.availabilityNote)))notes.push(event.availabilityNote);
    if(event.registrationRequired&&!notes.some(note=>/reserv|registr|book|ticket/i.test(note||'')))notes.push('Advance registration or a ticket is required.');
    if(event.registrationOpens)notes.push('Registration opens: '+event.registrationOpens+'.');
    event.descriptionEn=[...new Set(notes.filter(Boolean))].join(' ');
    if(!event.description)event.description=event.descriptionEn;
    if(event.registrationRequired&&!event.accessType)event.accessType='registration';
    if(event.registrationUrl&&!event.ticketUrl)event.ticketUrl=event.registrationUrl;
    event.sourceURLs=[...new Set([...(event.sourceURLs||[]),...(event.secondarySourceUrls||[])])];
  }
  const config=registry.newCities.find(c=>c.id===id),packet=normalizePacket(adapted,config);
  for(const event of packet.events){
    const source=adapted.events.find(row=>row.id===event.id);
    for(const field of extraFields)if(source[field]!==undefined)event[field]=source[field];
    if(source.category!==raw.events.find(row=>row.id===event.id).category)event.sourceCategory=raw.events.find(row=>row.id===event.id).category;
    assert.equal(event.date,source.date);assert.equal(event.time,source.time);
    assert.equal(event.lat,source.lat);assert.equal(event.lng,source.lng);
    if(source.admissionNoteEn)assert(event.descriptionEn.includes(source.admissionNoteEn));
  }
  assert.equal(packet.events.length,raw.events.length,'No silently dropped verified records');
  const report=renderCity(packet,config,{templateRoot:process.cwd(),publishedRef:'1d7491a0cf1fcee42889b80a3e9a75b593e30549'});
  console.log(JSON.stringify({cityId:id,counts:report.counts,errors:report.errors}));
  for(const event of raw.events){
    let topics,format;
    if(event.id.includes('mozfest')){topics=['ai','it','future'];format='conference';}
    if(event.id.startsWith('mad-inspirational')){topics=['marketing'];format='conference';}
    if(event.id.startsWith('mad-srnicek')){topics=['ai','it'];format='talk';}
    if(event.id.startsWith('mad-planetario')){topics=event.title.includes('inteligencia')?['ai']:['science'];format='talk';}
    if(topics)reviewed.push({city:id,id:event.id,date:event.date,topics,format,sourceUrl:event.sourceUrl});
  }
}
fs.writeFileSync('data/city-expansion/spanish-conference-classifications.json',JSON.stringify(reviewed,null,2)+'\n');
const file='public/catalog-modes.js',code=fs.readFileSync(file,'utf8'),match=code.match(/ const reviewed=(\[.*?\]);\n/);
assert(match,'Reviewed classification registry');
const prior=JSON.parse(match[1]).filter(row=>!['barcelona','madrid'].includes(row.city));
fs.writeFileSync(file,code.replace(match[0],' const reviewed='+JSON.stringify([...prior,...reviewed])+';\n'));
// Generic labels (for example “14+”) can collide across research packets. Never replace
// a reviewed translation already used by the twenty deployed city feeds.
const translationsFile='data/i18n/english-reviewed.json';
fs.writeFileSync(translationsFile,JSON.stringify({...JSON.parse(fs.readFileSync(translationsFile)),...baselineTranslations},null,2)+'\n');
