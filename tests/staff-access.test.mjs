import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {STAFF_REGISTRATIONS,loadStaffRegistrations,registeredStaff as matchStaff,staffLoginMatches as matchesLogin,provisionStaffLogin as provisionLogin} from '../app/lib/staff-access.ts';
import {bindSocialIdentity} from '../app/lib/login-identities.ts';
import {readSocialSession} from '../app/lib/social-session.ts';
import {encode} from '@auth/core/jwt';
const registrations=loadStaffRegistrations(JSON.stringify({'김한조':'owner@example.com','박상우':'manager@example.com','어동선':'eo@example.com','강신의':'kang@example.com','송서균':'song@example.com'}));
const registeredStaff=(provider,email,verified)=>matchStaff(provider,email,verified,registrations);
const staffLoginMatches=(user,member)=>matchesLogin(user,member,registrations);
const provisionStaffLogin=(db,login,now,staff=registrations)=>provisionLogin(db,login,now,staff);
function database(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 sqlite.prepare('INSERT INTO workspaces(id,owner_id,data,revision,created_at) VALUES(?,?,?,?,?)').run('orca','original-owner','{"students":[{"id":"student-kept"}]}',26,'2026-11-16');
 return {sqlite,prepare(sql){return {bind(...args){const query=sqlite.prepare(sql);return {first:async()=>query.get(...args)??null,all:async()=>({results:query.all(...args)}),run:async()=>query.run(...args),query,args};}};},async batch(items){sqlite.exec('BEGIN');try{const result=items.map(x=>x.query.run(...x.args));sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
}
function member(db,id,role='manager',email='manager@example.com',teacher=null){db.sqlite.prepare('INSERT INTO memberships(user_id,workspace_id,role,student_id,name,email,teacher_id,student_ids) VALUES(?,?,?,?,?,?,?,?)').run(id,'orca',role,null,'기존 이름',email,teacher,'["extra-student"]');}
function login(db,overrides={}){const value={userId:'google-new',identityId:'identity-new',provider:'google',email:'eo@example.com',emailVerified:true,...overrides};db.sqlite.prepare('INSERT OR IGNORE INTO login_identities VALUES(?,?,?,?)').run(value.identityId,value.provider,value.userId,'2026-11-16');return value;}
test('확정된 다섯 이메일만 등록되며 이름·미정·비검증 이메일로 직원 권한을 얻지 못한다',()=>{
 assert.deepEqual(registrations.filter(s=>s.email).map(s=>s.email),['owner@example.com','manager@example.com','eo@example.com','kang@example.com','song@example.com']);
 assert.equal(registeredStaff('google','  MANAGER@EXAMPLE.COM ',true).role,'manager');
 for(const [provider,email,verified] of [['google','김한조',true],['google','',true],['google',null,true],['google','manager+other@example.com',true],['google','manager@example.com',false],['google','manager@example.com','true'],['kakao','manager@example.com',true]])assert.equal(registeredStaff(provider,email,verified),undefined);
 assert.equal(registeredStaff('google','owner@example.com',true).role,'admin');
 assert.equal(registeredStaff('google','kang@example.com',true).teacherId,'kang');
 assert.equal(registeredStaff('google','song@example.com',true).teacherId,'song');
 assert.equal(STAFF_REGISTRATIONS.find(s=>s.teacherId==='byun').email,null);
});
test('어동선의 첫 구글 로그인은 승인 없이 eo 강사로 연결하고 학습 데이터를 보존한다',async()=>{
 const db=database(),before=db.sqlite.prepare('SELECT * FROM workspaces').get(),input=login(db);
 assert.equal(await provisionStaffLogin(db,input),'google-new');
 const saved=db.sqlite.prepare('SELECT * FROM memberships').get();
 assert.equal(saved.role,'teacher');assert.equal(saved.teacher_id,'eo');assert.equal(saved.name,'어동선');assert.equal(saved.student_ids,'[]');
 assert.deepEqual(db.sqlite.prepare('SELECT * FROM workspaces').get(),before);
 await provisionStaffLogin(db,input);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM memberships').get().n,1);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM member_audit').get().n,1);
});
test('박상우의 기존 회원 ID·추가 배정·원장 ID와 학습 기록을 보존한다',async()=>{
 const db=database();member(db,'existing-manager');const input=login(db,{userId:'existing-manager',email:'manager@example.com'});
 assert.equal(await provisionStaffLogin(db,input),'existing-manager');
 const saved=db.sqlite.prepare('SELECT * FROM memberships').get();assert.equal(saved.role,'manager');assert.equal(saved.name,'박상우');assert.equal(saved.student_ids,'["extra-student"]');
 assert.equal(db.sqlite.prepare('SELECT owner_id FROM workspaces').get().owner_id,'original-owner');
});
test('사전등록된 이메일에 연결된 기존 직원은 원래 ID로 연결하고 추가 학생 배정을 보존한다',async()=>{
 const db=database();member(db,'legacy-teacher','teacher','EO@example.com','eo');const input=login(db);
 assert.equal(await provisionStaffLogin(db,input),'legacy-teacher');
 assert.equal(db.sqlite.prepare('SELECT user_id FROM login_identities').get().user_id,'legacy-teacher');
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM memberships').get().n,1);
 assert.equal(db.sqlite.prepare('SELECT student_ids FROM memberships').get().student_ids,'["extra-student"]');
});
test('미등록·다른 공급자·비검증 로그인은 직원 회원이나 승인 기록을 만들지 않는다',async()=>{
 for(const overrides of [{email:'unknown@example.com'},{emailVerified:false},{provider:'naver'}]){
  const db=database(),input=login(db,overrides);assert.equal(await provisionStaffLogin(db,input),input.userId);
  assert.equal(db.sqlite.prepare('SELECT count(*) n FROM memberships').get().n,0);
  assert.equal(db.sqlite.prepare('SELECT count(*) n FROM member_audit').get().n,0);
 }
});
test('학원 데이터가 없을 때 첫 접속자를 원장으로 만들지 않는다',async()=>{
 const db=database();db.sqlite.exec('DELETE FROM workspaces');
 const unknown=login(db,{email:'first@example.com'});
 assert.equal(await provisionStaffLogin(db,unknown),unknown.userId);
 const configured=login(db,{identityId:'identity-manager',userId:'manager',email:'manager@example.com'});
 await assert.rejects(()=>provisionStaffLogin(db,configured),/데이터베이스/);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM workspaces').get().n,0);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM memberships').get().n,0);
});
test('직원으로 사전등록된 기존 가입 신청은 로그인 후 자동 승인된다',async()=>{
 const db=database(),input=login(db);db.sqlite.prepare("INSERT INTO registrations(user_id,workspace_id,name,email,requested_role,created_at) VALUES(?,?,?,?,?,?)").run(input.userId,'orca','어동선',input.email,'student','2026-11-16');
 await provisionStaffLogin(db,input);assert.equal(db.sqlite.prepare('SELECT status FROM registrations').get().status,'approved');
});
test('이용 중지 계정·중복 이메일·다른 회원 연결·원장 충돌은 자동 덮어쓰지 않는다',async()=>{
 for(const kind of ['blocked','duplicate','conflict','owner','pending-link','wrong-mapping','other-workspace','legacy-student']){
  const db=database();const input=login(db);
  if(kind==='blocked')member(db,'google-new','blocked',input.email);
  if(kind==='duplicate'){member(db,'legacy-1','teacher',input.email,'eo');member(db,'legacy-2','teacher',input.email,'eo');}
  if(kind==='conflict'){member(db,'google-new','student','other@example.com');member(db,'legacy','teacher',input.email,'eo');}
  if(kind==='owner')member(db,'google-new','admin',input.email);
  if(kind==='pending-link'){member(db,'legacy','teacher',input.email,'eo');db.sqlite.prepare('INSERT INTO registrations(user_id,workspace_id,name,email,requested_role,created_at) VALUES(?,?,?,?,?,?)').run(input.userId,'orca','회원',input.email,'student','2026-11-16');}
  if(kind==='legacy-student')member(db,'legacy-student','student',input.email);
  if(kind==='wrong-mapping')db.sqlite.exec("UPDATE login_identities SET user_id='other'");
  if(kind==='other-workspace'){member(db,'google-new','teacher',input.email,'eo');db.sqlite.exec("UPDATE memberships SET workspace_id='other'");}
  const before=db.sqlite.prepare('SELECT * FROM memberships ORDER BY user_id').all();
  await assert.rejects(()=>provisionStaffLogin(db,input));
  assert.deepEqual(db.sqlite.prepare('SELECT * FROM memberships ORDER BY user_id').all(),before);
 }
});
test('원장 이메일을 나중에 명시하면 기존 원장 ID에 연결하고 다른 직원으로 승격하지 않는다',async()=>{
 const db=database();member(db,'original-owner','admin','legacy@example.com');
 const input=login(db,{email:'owner@example.com'}),registrations=[{name:'김한조',role:'admin',teacherId:null,email:input.email}];
 assert.equal(await provisionStaffLogin(db,input,undefined,registrations),'original-owner');
 assert.equal(db.sqlite.prepare('SELECT name FROM memberships').get().name,'김한조');
 assert.equal(db.sqlite.prepare('SELECT owner_id FROM workspaces').get().owner_id,'original-owner');
});
test('현재 이메일·역할·담당 강사를 매 요청마다 확인하고 예전 직원 세션을 허용하지 않는다',()=>{
 const manager={role:'manager',teacher_id:null},teacher={role:'teacher',teacher_id:'eo'},user={provider:'google',email:'manager@example.com',emailVerified:true};
 assert(staffLoginMatches(user,manager));assert(staffLoginMatches({...user,email:'eo@example.com'},teacher));
 assert.equal(staffLoginMatches({...user,emailVerified:undefined},manager),false);
 assert.equal(staffLoginMatches({...user,provider:'kakao'},manager),false);
 assert.equal(staffLoginMatches({...user,email:'someone@example.com'},manager),false);
 assert.equal(staffLoginMatches(user,{role:'admin',teacher_id:null}),false);
 assert.equal(staffLoginMatches({...user,email:'eo@example.com'},{role:'teacher',teacher_id:'kang'}),false);
 assert(staffLoginMatches({email:'student@example.com'},{role:'student',teacher_id:null}));
});

test('비밀값 누락·형식 오류·중복 이메일·미등록 이름은 직원 접근을 허용하지 않는다',()=>{
 for(const raw of [undefined,'','invalid','null','[]','{"박상우":12}','{"박상우":"invalid"}','{"unknown":"user@example.com"}','{"박상우":"same@example.com","김한조":"SAME@example.com"}'])assert.deepEqual(loadStaffRegistrations(raw),[]);
 assert(STAFF_REGISTRATIONS.every(staff=>staff.email===null));
 assert.equal(matchStaff('google','manager@example.com',true),undefined);
 assert.equal(matchesLogin({provider:'google',email:'manager@example.com',emailVerified:true},{role:'manager',teacher_id:null}),false);
});
test('비밀값은 공백·대소문자를 정규화하고 미정 직원은 연결하지 않는다',()=>{
 const staff=loadStaffRegistrations('{"박상우":" MANAGER@EXAMPLE.COM ","변지석":null}');
 assert.equal(staff.find(s=>s.name==='박상우').email,'manager@example.com');
 assert.equal(staff.find(s=>s.name==='변지석').email,null);
});
test('기존 원장 이메일 수정 전후 모두 첫 구글 로그인과 재로그인이 기존 원장 ID·세션으로 연결된다',async()=>{
 for(const oldEmail of ['legacy@example.com','owner@example.com']){
  const db=database();member(db,'original-owner','admin',oldEmail);
  const before=db.sqlite.prepare('SELECT * FROM workspaces').get();
  for(let attempt=0;attempt<2;attempt++){
   const userId=await bindSocialIdentity(db,'owner-google','google');
   const input={userId,identityId:'owner-google',provider:'google',email:'owner@example.com',emailVerified:true};
   const ownerId=await provisionStaffLogin(db,input);
   assert.equal(ownerId,'original-owner');
   const saved=db.sqlite.prepare('SELECT * FROM memberships WHERE user_id=?').get(ownerId);
   assert.equal(saved.role,'admin');assert.equal(saved.name,'김한조');assert.equal(saved.email,'owner@example.com');
   assert.equal(saved.student_ids,'["extra-student"]');
   const secret='owner-test-secret-that-is-longer-than-32-characters',cookieName='orca.session-token';
   const token=await encode({secret,salt:cookieName,token:{orcaId:ownerId,identityId:'owner-google',provider:'google',email:input.email,emailVerified:true}});
   const user=await readSocialSession(new Headers({cookie:cookieName+'='+token}),db,secret,cookieName);
   assert.equal(user.userId,before.owner_id);
   assert(staffLoginMatches(user,saved));
   assert.deepEqual(db.sqlite.prepare('SELECT * FROM workspaces').get(),before);
   assert.equal(db.sqlite.prepare('SELECT count(*) n FROM memberships').get().n,1);
  }
 }
});
test('원장 구글 계정에 기존 회원·가입 신청·중복 이메일이 있으면 자동 합치지 않는다',async()=>{
 for(const kind of ['member','pending','duplicate','blocked-owner']){
  const db=database();member(db,'original-owner',kind==='blocked-owner'?'blocked':'admin','owner@example.com');
  const userId=await bindSocialIdentity(db,'owner-google','google');
  if(kind==='member')member(db,userId,'student','owner@example.com');
  if(kind==='pending'||kind==='rejected')db.sqlite.prepare('INSERT INTO registrations(user_id,workspace_id,name,email,requested_role,status,created_at) VALUES(?,?,?,?,?,?,?)').run(userId,'orca','원장','owner@example.com','student',kind,'2026-11-16');
  if(kind==='duplicate')member(db,'other-owner-email','student','owner@example.com');
  const before=db.sqlite.prepare('SELECT * FROM memberships ORDER BY user_id').all();
  await assert.rejects(()=>provisionStaffLogin(db,{userId,identityId:'owner-google',provider:'google',email:'owner@example.com',emailVerified:true}));
  assert.deepEqual(db.sqlite.prepare('SELECT * FROM memberships ORDER BY user_id').all(),before);
  assert.equal(db.sqlite.prepare('SELECT user_id FROM login_identities WHERE id=?').get('owner-google').user_id,userId);
 }
});
test('사전등록된 원장의 회원 미연결·거절된 가입 신청은 보존하며 기존 원장으로 연결한다',async()=>{
 const db=database();member(db,'original-owner','admin','owner@example.com');
 const userId=await bindSocialIdentity(db,'owner-google','google');
 db.sqlite.prepare('INSERT INTO registrations(user_id,workspace_id,name,email,requested_role,status,created_at) VALUES(?,?,?,?,?,?,?)').run(userId,'orca','기존 신청','owner@example.com','student','rejected','2026-11-16');
 const before=db.sqlite.prepare('SELECT * FROM registrations WHERE user_id=?').get(userId);
 assert.equal(await provisionStaffLogin(db,{userId,identityId:'owner-google',provider:'google',email:'owner@example.com',emailVerified:true}),'original-owner');
 assert.equal(db.sqlite.prepare('SELECT user_id FROM login_identities WHERE id=?').get('owner-google').user_id,'original-owner');
 assert.deepEqual(db.sqlite.prepare('SELECT * FROM registrations WHERE user_id=?').get(userId),before);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM memberships').get().n,1);
});
test('거절 신청이 있어도 다른 학원·미검증·일반 회원·기존 회원은 원장으로 연결하지 않는다',async()=>{
 for(const kind of ['other-workspace','unverified','unregistered','existing-member']){
  const db=database();member(db,'original-owner','admin','owner@example.com');
  const userId=await bindSocialIdentity(db,'owner-google','google');
  db.sqlite.prepare('INSERT INTO registrations(user_id,workspace_id,name,email,requested_role,status,created_at) VALUES(?,?,?,?,?,?,?)').run(userId,kind==='other-workspace'?'other':'orca','기존 신청','owner@example.com','student','rejected','2026-11-16');
  if(kind==='existing-member')member(db,userId,'student','owner@example.com');
  const input={userId,identityId:'owner-google',provider:'google',email:kind==='unregistered'?'unknown@example.com':'owner@example.com',emailVerified:kind!=='unverified'};
  if(kind==='unverified'||kind==='unregistered')assert.equal(await provisionStaffLogin(db,input),userId);
  else await assert.rejects(()=>provisionStaffLogin(db,input));
  assert.equal(db.sqlite.prepare('SELECT user_id FROM login_identities WHERE id=?').get('owner-google').user_id,userId);
 }
});
