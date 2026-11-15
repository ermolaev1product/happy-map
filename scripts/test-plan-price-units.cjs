const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const en=process.argv.includes('--english'),file='public/'+(en?'en/':'')+'app.js',s=fs.readFileSync(file,'utf8');
const take=p=>{const lines=s.split('\n').filter(l=>l.startsWith(p));assert.equal(lines.length,1,p);return lines[0];};
const c={};vm.createContext(c);vm.runInContext([take('const esc='),take('const priceText='),take('function hasSpecialPriceUnit('),take('function budgetPrice(')].join('\n')+'\nglobalThis.check={hasSpecialPriceUnit,budgetPrice};',c);
const q=c.check,card=en?'See event cards':'Смотрите карточки';let n=0;
for(const unit of ['one_child_and_one_adult','family','group','table','minimum_bar_deposit']){assert(q.hasSpecialPriceUnit([{price:15,priceUnit:unit}]));assert.equal(q.budgetPrice([{price:15,priceUnit:unit}]),card);assert.equal(q.budgetPrice([{price:15,priceUnit:unit},{price:20,priceUnit:'person'}]),card);n+=3;}
for(const unit of [undefined,'person','ticket']){assert(!q.hasSpecialPriceUnit([{price:15,priceUnit:unit}]));assert.match(q.budgetPrice([{price:15,priceUnit:unit}]),/15/);n+=2;}
assert.match(q.budgetPrice([{price:15},{price:20}]),/35/);assert.match(q.budgetPrice([{price:15,min:true},{price:null}]),/15/);assert.equal(q.budgetPrice([{price:0}]),en?'Free':'Бесплатно');n+=3;
assert(s.includes("specialBudget=hasSpecialPriceUnit(list)"));assert(s.includes(en?"specialBudget?'Pricing by event conditions':'Entry per person'":"specialBudget?'Стоимость по условиям':'Вход на одного'"));n+=2;
console.log(`PASS ${n} plan price-unit assertions (${en?'English':'source'}): family, groups, deposits and mixed plans cannot be presented as a per-person total; ordinary prices unchanged.`);
