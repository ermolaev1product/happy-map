const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=process.argv.find(arg=>arg.startsWith('--root='))?.slice(7)||process.cwd();
const candidate=process.argv.includes('--candidate');
const files=['public/app.js',...['en','sr','es','de','pt-br'].map(x=>'public/'+x+'/app.js')];
const old='const n=date?(catalog.cinemaCoverage?.dailyCounts?.[date]||0):null;';
const next="const n=date?events.filter(e=>e.cinemaSession&&!e.cancelled&&e.status!=='cancelled'&&e.date===date).length:null;";
const date='2026-11-14', other='2026-11-15';
const catalog=JSON.parse(fs.readFileSync(path.join(root,'public/events.json'),'utf8'));
const sample={id:'sample',date,cinemaSession:true,category:'film',time:'13:00'};
function wrapper(code){const from=code.indexOf('const render22=render;'),to=code.indexOf('const oldOpenPlace22=',from);assert(from>=0&&to>from);return code.slice(from,to);}
function run(code,events,meta={},extra={}){
 const info={hidden:false,innerHTML:''};
 const elements={'#cinemaInfo':info,'#mapResults':{setAttribute(){}},'#mapLabel':{textContent:'fixture'}};
 const context={render(){},requestAnimationFrame(){},categoryArrows(){},$:s=>{assert(elements[s],s);return elements[s];},events,catalog:meta,dates:[date,other],day:0,view:'explore',layer:'events',category:'film',cityFolder:'',...extra};
 const before=JSON.stringify({events,meta});vm.runInNewContext(wrapper(code)+';render();',context);assert.equal(JSON.stringify({events,meta}),before,'render must not update provenance or event records');
 return {message:info.innerHTML.match(/<p>(.*?)<\/p>/)?.[1],html:info.innerHTML,hidden:info.hidden};
}
let cases=0;
for(const file of files){
 const src=fs.readFileSync(path.join(root,file),'utf8');
 const code=candidate?src.replace(old,next).replace(/:n===1\?(?:'[^']*'|"[^"]*"):/,':'):src;
 if(candidate)assert(src.includes(old),'--candidate expects unpatched input: '+file);
 new vm.Script(code);
 const guidance=run(src,[],{}, {day:-1}).message;
 const empty=run(src,[],{cinemaCoverage:{dailyCounts:{[date]:0}}}).message;
 assert.notEqual(guidance,empty);
 const check=(name,events,meta,want,extra)=>{assert.equal(run(code,events,meta,extra).message,want,file+' '+name);cases++;};
 check('Nov14 real catalog sessions override missing dailyCounts',catalog.events,catalog,guidance);
 if(candidate)assert.equal(run(src,catalog.events,catalog).message,empty,'unpatched source reproduces the bug');
 check('missing metadata with one actual session',[sample],{},guidance);
 check('stale zero with one actual session',[sample],{cinemaCoverage:{dailyCounts:{[date]:0}}},guidance);
 check('stale one with multiple sessions',[sample,{...sample,id:'two'}],{cinemaCoverage:{dailyCounts:{[date]:1}}},guidance);
 check('missing metadata with no actual sessions',[],{},empty);
 check('explicit metadata zero with no actual sessions',[],{cinemaCoverage:{dailyCounts:{[date]:0}}},empty);
 check('stale positive metadata with no actual sessions',[],{cinemaCoverage:{dailyCounts:{[date]:42}}},empty);
 check('film club is not regular cinema',[{...sample,cinemaSession:false}],{},empty);
 check('session on another advertised date',[{...sample,date:other}],{},empty);
 check('cancelled boolean',[{...sample,cancelled:true}],{},empty);
 check('cancelled status',[{...sample,status:'cancelled'}],{},empty);
 check('whole week remains neutral',catalog.events,catalog,guidance,{day:-1});
 check('user filters do not change imported-schedule status',[sample],{},guidance,{searchTerm:'unmatched',radius:0.1,time:'night',language:'ZZ',visible(){throw Error('Do not base schedule status on UI filters');}});
 check('arrival cutoff does not erase loaded schedule',[{...sample,time:'00:01'}],{},guidance,{NoreliDiscovery:{availableOnDate(){throw Error('Do not base imported-schedule status on arrival cutoff');}}});
 for(const extra of [{view:'plans'},{layer:'city'},{category:'music'},{cityFolder:'belgrade/'}]){assert(run(code,[sample],{},extra).hidden);cases++;}
 assert(run(code,[sample]).html.includes('date=14-11-2026'));
 assert(!wrapper(code).includes('n===1'),'a row count must not infer repertoire completeness');
}
assert(catalog.events.some(e=>e.cinemaSession&&e.date===date),'Nov14 regression fixture exists');
console.log(JSON.stringify({passed:cases,sourceFiles:files.length,mode:candidate?'in-memory candidate':'on-disk source',actualNov14Sessions:catalog.events.filter(e=>e.cinemaSession&&e.date===date&&!e.cancelled&&e.status!=='cancelled').length,sourceMutations:0,browserRun:false}));
