const fs=require('fs'),vm=require('vm'),assert=require('assert');
const r=JSON.parse(fs.readFileSync('public/palo-alto/sources.json'));
const by=u=>r.sources.find(s=>s.url.includes(u));
assert(r.sources.length>=113);
for(const u of ['stanford-alumni-recital-fall26','alexis-madrigal','shimizu-distinguished','ewear-seminar','protest-and-politics','husnu-senlendirici-3']){assert.equal(by(u).importedCount,1,u);assert.equal(by(u).importedCountScope,'exact_url');}
assert.equal(by('6a3032c18ea300e2631dc5f1').importedCount,0);
assert.equal(by('pacificartleague.org/community-events').importedCount,2);assert.equal(by('pacificartleague.org/community-events').importedCountScope,'programme');
assert.equal(by('rationality-book-club').importedCount,4);assert.equal(by('rationality-book-club').importedCountScope,'group');
assert.equal(r.sources.find(s=>s.url==='https://events.stanford.edu/').importedCount,303);assert.equal(r.sources.find(s=>s.url==='https://events.stanford.edu/').importedCountScope,'domain');
const text=fs.readFileSync('public/palo-alto/sources-page.js','utf8');const ctx={document:{querySelector:()=>({})},fetch:()=>new Promise(()=>{})};vm.createContext(ctx);vm.runInContext(text,ctx);
assert.equal(vm.runInContext("countLabel({importedCount:1,importedCountScope:'exact_url'})",ctx),'1 exact-link listing');
assert.equal(vm.runInContext("countLabel({importedCount:303,importedCountScope:'domain'})",ctx),'303 stored listings from this domain');
assert.equal(vm.runInContext("statusLabel({status:'readable_web'})",ctx),'readable web');
console.log('PASS '+r.sources.length+' sources: exact detail counts, explicitly scoped overview totals, group isolation, readable status labels.');
