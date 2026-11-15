const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),acorn=require('acorn'),{spawnSync}=require('node:child_process');
const source=fs.readFileSync('scripts/check-english.cjs','utf8'),ast=acorn.parse(source,{ecmaVersion:'latest'}),names=new Set(['inspectJSON','isSearchProvenance','isSearchSnippet','inspectSearchResults']);
const code=ast.body.filter(x=>x.type==='FunctionDeclaration'&&names.has(x.id.name)).map(x=>source.slice(x.start,x.end)).join('\n');
const ctx=vm.createContext({errors:[],ru:/[А-Яа-яЁё]/});vm.runInContext(code,ctx);
const search={id:'search-test',engine:'Google',cityId:'tbilisi',query:'что сегодня',results:[{text:'Афиша',url:'https://example.com/',readKind:'search_result_snippet',sourcePageRead:false,description:'English context'}]};
function count(value){ctx.errors.length=0;ctx.value=value;vm.runInContext("inspectJSON(value,'test.json')",ctx);return ctx.errors.length;}
assert.equal(count({searchHistory:[search]}),0,'exact performed query and source snippet allowed');
assert(count({events:[search]})>=2,'lookalike outside searchHistory must be checked');
assert(count({searchHistory:[{...search,description:'Посторонний текст'}]})===1,'search description must be checked');
assert(count({searchHistory:[{...search,results:[{...search.results[0],description:'Описание'}]}]})===1,'result description must be checked');
assert(count({searchHistory:[{...search,results:[{...search.results[0],readKind:'other'}]}]})===1,'unverified result shape must be checked');
assert.equal(count({searchHistory:[{...search,results:[{...search.results[0],text:{description:'Описание'}}]}]}),1,'object snippet text is not exempt');
assert.equal(count({searchHistory:[{...search,results:[{...search.results[0],url:'https:not-a-web-url'}]}]}),1,'invalid web URL is not exempt');
const py=spawnSync('python3',['-c',`import ast,re,json
from pathlib import Path
module=ast.parse(Path('scripts/complete-english.py').read_text())
selected=[n for n in module.body if isinstance(n,ast.FunctionDef) and n.name in {'walk','is_search_provenance','is_search_snippet','walk_search_results'}]
seen=[]
def collect(s):
 if re.search('[А-Яа-яЁё]',s):seen.append(s)
ns={'collect':collect,'tr':lambda s:'EN' if re.search('[А-Яа-яЁё]',s) else s,'immutable':set(),'original_names':set()}
exec(compile(ast.Module(body=selected,type_ignores=[]),'selected','exec'),ns)
search=json.loads(${JSON.stringify(JSON.stringify(search))})
def check(v):
 seen.clear();out=ns['walk'](v,apply=True);return len(seen),out
n,out=check({'searchHistory':[search]});assert n==0 and out['searchHistory'][0]['query']==search['query'] and out['searchHistory'][0]['results'][0]['text']=='Афиша'
assert check({'events':[search]})[0]>=2
assert check({'searchHistory':[{**search,'description':'Описание'}]})[0]==1
assert check({'searchHistory':[{**search,'results':[{**search['results'][0],'description':'Описание'}]}]})[0]==1
assert check({'searchHistory':[{**search,'results':[{**search['results'][0],'readKind':'other'}]}]})[0]==1
assert check({'searchHistory':[{**search,'results':[{**search['results'][0],'text':{'description':'Описание'}}]}]})[0]==1
assert check({'searchHistory':[{**search,'results':[{**search['results'][0],'url':'https:not-a-web-url'}]}]})[0]==1
print('Python scoped provenance positive/negative cases passed')`],{encoding:'utf8'});
if(py.status!==0)throw Error(py.stderr||py.stdout);console.log(py.stdout.trim());
let queries=0,snippets=0;for(const rel of ['sources.json','palo-alto/sources.json']){const root=JSON.parse(fs.readFileSync('public/'+rel)),en=JSON.parse(fs.readFileSync('public/en/'+rel));for(const q of root.searchHistory||[]){if(!ctx.isSearchProvenance(q,'searchHistory'))continue;const target=en.searchHistory.find(x=>x.id===q.id);assert(target,q.id);assert.equal(target.query,q.query);queries++;for(let i=0;i<(q.results||[]).length;i++){const r=q.results[i];if(ctx.isSearchSnippet(r)){assert.equal(target.results[i].text,r.text);snippets++;}}}}
console.log(JSON.stringify({passed:true,negativeCases:12,exactQueries:queries,exactResultSnippets:snippets}));
