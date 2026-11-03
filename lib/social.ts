import {plans} from './plans';
// Identity is supplied only by the verified server adapter, never by request JSON.
export type Principal={subject:string};
export type Place={id:string;title:string;address:string;lat:number;lng:number;city:string};
export type Catalog=Record<string,Record<string,Place>>;
type Profile={id:string;name:string};
const DAY=86400000,HOUR=3600000;
class Problem extends Error {constructor(public status:number,message:string){super(message);}}
const problem=(status:number,message:string):never=>{throw new Problem(status,message)};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, X-Noreli-Access-Token','X-Content-Type-Options':'nosniff'}});
const pair=(a:string,b:string)=>[a,b].sort();
const uid=()=>crypto.randomUUID();
async function digest(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');}
async function body(req:Request){if(!req.headers.get('content-type')?.startsWith('application/json'))problem(415,'Нужен JSON');if(Number(req.headers.get('content-length')||0)>4096)problem(413,'Слишком большой запрос');const raw=await req.text();if(raw.length>4096)problem(413,'Слишком большой запрос');try{const parsed=JSON.parse(raw);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))problem(400,'Нужен объект');return parsed}catch{problem(400,'Не удалось прочитать запрос')}}
function noCrossOrigin(req:Request){const origin=req.headers.get('origin');if(origin!==new URL(req.url).origin)problem(403,'Запрос должен идти с сайта Happy Map');if(req.headers.get('x-noreli-request')!=='1')problem(403,'Обнови страницу и попробуй снова');}
async function rate(db:D1Database,id:string,now:number){const bucket=Math.floor(now/60000);const r=await db.prepare('INSERT INTO social_limits(key,bucket,hits) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET bucket=excluded.bucket,hits=CASE WHEN social_limits.bucket=excluded.bucket THEN social_limits.hits+1 ELSE 1 END RETURNING hits').bind(id,bucket).first<{hits:number}>();if((r?.hits||0)>40)problem(429,'Слишком много действий. Подожди минуту.');}
export async function handleSocial(req:Request,db:D1Database,principal:Principal|null,catalog:Catalog,now=Date.now()):Promise<Response>{
 try{
  const path=new URL(req.url).pathname.replace(/^\/api\/social\/?/,'');
  if(!principal)return json({error:'Нужно войти в аккаунт',signedIn:false},401);
  const me=await db.prepare('SELECT id,name FROM social_profiles WHERE subject=?').bind(principal.subject).first<Profile>();
  if(req.method==='GET'&&path==='me')return json({signedIn:true,profile:me});
  if(req.method!=='GET'){noCrossOrigin(req);await rate(db,principal.subject,now);}
  if(path==='plans')return await plans(req,db,principal.subject,new URL(req.url).searchParams.get('city')||'tbilisi');
  if(req.method==='POST'&&path==='profile'){
   const b=await body(req);const name=typeof b.name==='string'?b.name.trim().replace(/[\p{Cc}\p{Cf}]/gu,''):'';
   if(name.length<2||name.length>40)problem(400,'Имя должно содержать от 2 до 40 символов');
   await db.prepare('INSERT INTO social_profiles(id,subject,name,created_at) VALUES(?,?,?,?) ON CONFLICT(subject) DO UPDATE SET name=excluded.name').bind(uid(),principal.subject,name,now).run();
   return json({profile:await db.prepare('SELECT id,name FROM social_profiles WHERE subject=?').bind(principal.subject).first()});
  }
  if(!me)problem(409,'Сначала выбери имя для друзей');
  const self=me!;
  if(req.method==='GET'&&path==='feed'){
   const friends=(await db.prepare(`SELECT p.id,p.name,f.state,f.requester FROM social_friendships f JOIN social_profiles p ON p.id=CASE WHEN f.a=? THEN f.b ELSE f.a END WHERE (f.a=? OR f.b=?) AND NOT EXISTS(SELECT 1 FROM social_blocks b WHERE (b.owner=? AND b.target=p.id) OR (b.target=? AND b.owner=p.id))`).bind(self.id,self.id,self.id,self.id,self.id).all()).results;
   const rows=(await db.prepare(`SELECT s.*,p.name FROM social_presences s JOIN social_profiles p ON p.id=s.owner WHERE s.expires_at>? AND (s.owner=? OR (s.visibility='friends' AND EXISTS(SELECT 1 FROM social_friendships f WHERE f.state='accepted' AND ((f.a=? AND f.b=s.owner) OR (f.b=? AND f.a=s.owner))) AND NOT EXISTS(SELECT 1 FROM social_blocks b WHERE (b.owner=? AND b.target=s.owner) OR (b.target=? AND b.owner=s.owner)))) ORDER BY s.starts_at LIMIT 500`).bind(now,self.id,self.id,self.id,self.id,self.id).all()).results as any[];
   const statuses=rows.flatMap(r=>{const place=catalog[r.city]?.[r.place_id];return place?[{id:r.id,owner:r.owner,name:r.name,kind:r.kind,visibility:r.visibility,startsAt:r.starts_at,expiresAt:r.expires_at,place,mine:r.owner===self.id}]:[]});
   return json({profile:self,friends,statuses,serverTime:now});
  }
  if(req.method==='POST'&&path==='invite'){
   const token=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');const hash=await digest(token);
   await db.batch([db.prepare('DELETE FROM social_invitations WHERE owner=? OR expires_at<=?').bind(self.id,now),db.prepare('INSERT INTO social_invitations(hash,owner,expires_at) VALUES(?,?,?)').bind(hash,self.id,now+7*DAY)]);
   return json({token,expiresAt:now+7*DAY});
  }
  if(req.method==='DELETE'&&path==='invite'){await db.prepare('DELETE FROM social_invitations WHERE owner=?').bind(self.id).run();return json({ok:true});}
  if(req.method==='POST'&&path==='redeem'){
   const b=await body(req);if(typeof b.token!=='string'||!/^[a-f0-9]{48}$/.test(b.token))problem(400,'Неверная ссылка приглашения');const hash=await digest(b.token);
   const inv=await db.prepare('SELECT owner FROM social_invitations WHERE hash=? AND expires_at>? AND (claimed_by IS NULL OR claimed_by=?)').bind(hash,now,self.id).first<{owner:string}>();
   if(!inv||inv.owner===self.id)problem(400,'Ссылка недоступна, уже использована или принадлежит тебе');
   const owner=inv!.owner;const [a,bid]=pair(self.id,owner);
   const blocked=await db.prepare('SELECT 1 FROM social_blocks WHERE (owner=? AND target=?) OR (owner=? AND target=?)').bind(self.id,owner,owner,self.id).first();if(blocked)problem(404,'Приглашение недоступно');
   const results=await db.batch([
    db.prepare(`INSERT INTO social_friendships(a,b,requester,state,created_at) SELECT ?,?,?,'pending',? FROM social_invitations WHERE hash=? AND expires_at>? AND (claimed_by IS NULL OR claimed_by=?) ON CONFLICT(a,b) DO NOTHING`).bind(a,bid,self.id,now,hash,now,self.id),
    db.prepare('UPDATE social_invitations SET claimed_by=? WHERE hash=? AND expires_at>? AND (claimed_by IS NULL OR claimed_by=?)').bind(self.id,hash,now,self.id)
   ]);
   if(!results[1].meta.changes)problem(409,'Эту ссылку уже использовали. Попроси новую.');return json({ok:true});
  }
  if(req.method==='POST'&&path==='friend'){
   const b=await body(req);if(typeof b.id!=='string'||b.id===self.id)problem(400,'Неверный друг');const [a,c]=pair(self.id,b.id);
   if(b.action==='accept'){
    const result=await db.prepare(`UPDATE social_friendships SET state='accepted' WHERE a=? AND b=? AND requester<>? AND state='pending' AND NOT EXISTS(SELECT 1 FROM social_blocks WHERE (owner=? AND target=?) OR (owner=? AND target=?))`).bind(a,c,self.id,self.id,b.id,b.id,self.id).run();if(!result.meta.changes)problem(404,'Запрос уже закрыт');
   }else if(b.action==='remove'||b.action==='block'){
    const statements=[db.prepare('DELETE FROM social_friendships WHERE a=? AND b=?').bind(a,c)];if(b.action==='block')statements.push(db.prepare('INSERT OR IGNORE INTO social_blocks(owner,target) VALUES(?,?)').bind(self.id,b.id));await db.batch(statements);
   }else problem(400,'Неизвестное действие');return json({ok:true});
  }
  if(req.method==='GET'&&path==='blocks')return json({blocks:(await db.prepare('SELECT p.id,p.name FROM social_blocks b JOIN social_profiles p ON p.id=b.target WHERE b.owner=?').bind(self.id).all()).results});
  if(req.method==='POST'&&path==='unblock'){const b=await body(req);await db.prepare('DELETE FROM social_blocks WHERE owner=? AND target=?').bind(self.id,String(b.id||'' )).run();return json({ok:true});}
  if(req.method==='POST'&&path==='presence'){
   const b=await body(req);const p=typeof b.city==='string'&&Object.hasOwn(catalog,b.city)&&typeof b.placeId==='string'&&Object.hasOwn(catalog[b.city],b.placeId)?catalog[b.city][b.placeId]:null;if(!p)problem(400,'Выбери место на карте');
   if(!['here','going'].includes(b.kind)||!['friends','private'].includes(b.visibility))problem(400,'Выбери вид и видимость отметки');
   const startsAt=b.kind==='here'?now:Date.parse(b.startsAt);if(!Number.isFinite(startsAt)||startsAt<now-60000||startsAt>now+7*DAY)problem(400,'Выбери время в ближайшие семь дней');
   const expiresAt=startsAt+2*HOUR;
   const count=await db.prepare('SELECT COUNT(*) AS n FROM social_presences WHERE owner=? AND expires_at>?').bind(self.id,now).first<{n:number}>();if((count?.n||0)>=30)problem(400,'Сначала убери один из старых планов');
   const id=uid();const statements=[db.prepare('DELETE FROM social_presences WHERE expires_at<=?').bind(now),db.prepare(`DELETE FROM social_presences WHERE owner=? AND ((city=? AND place_id=? AND kind=?) OR (?='here' AND kind='here'))`).bind(self.id,b.city,b.placeId,b.kind,b.kind)];
   // Arrival replaces this owner's plan for the same place only when its time is near.
   if(b.kind==='here')statements.push(db.prepare("DELETE FROM social_presences WHERE owner=? AND city=? AND place_id=? AND kind='going' AND starts_at BETWEEN ? AND ?").bind(self.id,b.city,b.placeId,now-2*HOUR,now+2*HOUR));
   statements.push(db.prepare('INSERT INTO social_presences(id,owner,city,place_id,kind,visibility,starts_at,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,self.id,b.city,b.placeId,b.kind,b.visibility,startsAt,expiresAt,now));await db.batch(statements);return json({id,expiresAt});
  }
  if(req.method==='DELETE'&&path==='presence'){const b=await body(req);await db.prepare('DELETE FROM social_presences WHERE id=? AND owner=?').bind(String(b.id||''),self.id).run();return json({ok:true});}
  if(req.method==='DELETE'&&path==='profile'){
   await db.batch([db.prepare('DELETE FROM social_presences WHERE owner=?').bind(self.id),db.prepare('DELETE FROM social_friendships WHERE a=? OR b=?').bind(self.id,self.id),db.prepare('DELETE FROM social_invitations WHERE owner=? OR claimed_by=?').bind(self.id,self.id),db.prepare('DELETE FROM social_blocks WHERE owner=? OR target=?').bind(self.id,self.id),db.prepare('DELETE FROM social_limits WHERE key=?').bind(principal.subject),db.prepare('DELETE FROM social_profiles WHERE id=?').bind(self.id)]);return json({ok:true});
  }
  return json({error:'Неизвестный запрос'},404);
 }catch(e){if(e instanceof Problem)return json({error:e.message},e.status);console.error('Social operation failed',e instanceof Error?e.name:'unknown');return json({error:'Не удалось связаться с сервером. Попробуй ещё раз.'},500);}
}
