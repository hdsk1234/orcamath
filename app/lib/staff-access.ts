import type {Role} from './domain.ts';

// Server-side configuration. Never import this list into a client component.
export type StaffRegistration={name:string;role:'admin'|'manager'|'teacher';teacherId:string|null;email:string|null};
export const STAFF_REGISTRATIONS:readonly StaffRegistration[]=[
 {name:'김한조',role:'admin',teacherId:null,email:null},
 {name:'박상우',role:'manager',teacherId:null,email:null},
 {name:'어동선',role:'teacher',teacherId:'eo',email:null},
 {name:'강신의',role:'teacher',teacherId:'kang',email:null},
 {name:'송서균',role:'teacher',teacherId:'song',email:null},
 {name:'변지석',role:'teacher',teacherId:'byun',email:null},
];
// The secret maps known staff names to verified Google email addresses.
// Missing or malformed configuration grants no staff access.
export function loadStaffRegistrations(raw:unknown):readonly StaffRegistration[]{
 if(typeof raw!=='string'||!raw.trim())return [];
 try{
  const emails=JSON.parse(raw);
  if(!emails||typeof emails!=='object'||Array.isArray(emails))return [];
  if(Object.keys(emails).some(name=>!STAFF_REGISTRATIONS.some(staff=>staff.name===name)))return [];
  const seen=new Set<string>();
  return STAFF_REGISTRATIONS.map(staff=>{
   const value=emails[staff.name];
   if(value===undefined||value===null)return {...staff};
   const email=normalizeStaffEmail(value);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||seen.has(email))throw Error('Invalid staff configuration');
   seen.add(email);
   return {...staff,email};
  });
 }catch{return [];}
}
export const normalizeStaffEmail=(email:unknown)=>typeof email==='string'?email.trim().toLowerCase():'';
export const isRegisteredStaffRole=(role:string)=>['admin','manager','teacher'].includes(role);
export function registeredStaff(provider:unknown,email:unknown,verified:unknown,registrations:readonly StaffRegistration[]=[]){
 if(provider!=='google'||verified!==true)return undefined;
 const normalized=normalizeStaffEmail(email);
 return normalized?registrations.find(s=>s.email&&normalizeStaffEmail(s.email)===normalized):undefined;
}
export function staffLoginMatches(user:{provider?:string;email:string;emailVerified?:boolean},member:{role:string;teacher_id:string|null},registrations:readonly StaffRegistration[]=[]){
 if(!isRegisteredStaffRole(member.role))return true;
 const expected=registeredStaff(user.provider,user.email,user.emailVerified,registrations);
 return !!expected&&expected.role===member.role&&expected.teacherId===member.teacher_id;
}
type Member={user_id:string;workspace_id:string;role:Role|'blocked';name:string;email:string|null;student_id:string|null;teacher_id:string|null;student_ids:string};
export async function provisionStaffLogin(db:D1Database,login:{userId:string;identityId:string;provider:string;email:string;emailVerified:boolean},now=new Date().toISOString(),registrations:readonly StaffRegistration[]=[]){
 const staff=registeredStaff(login.provider,login.email,login.emailVerified,registrations);
 if(!staff)return login.userId;
 const email=normalizeStaffEmail(login.email);
 const workspace=await db.prepare('SELECT id,owner_id FROM workspaces WHERE id=?').bind('orca').first<{id:string;owner_id:string}>();
 if(!workspace)throw Error('학원 데이터베이스를 먼저 준비해 주세요.');
 const current=await db.prepare('SELECT * FROM memberships WHERE user_id=?').bind(login.userId).first<Member>();
 if(current&&(current.workspace_id!==workspace.id||current.role==='blocked'))throw Error('기존 회원의 학원 또는 이용 중지 상태를 먼저 확인해 주세요.');
 const matches=await db.prepare('SELECT * FROM memberships WHERE workspace_id=? AND lower(trim(email))=?').bind(workspace.id,email).all<Member>();
 if(matches.results.length>1)throw Error('같은 이메일의 회원 기록이 여러 개입니다. 관리자에게 확인해 주세요.');
 const legacy=matches.results[0];
 if(current&&legacy&&current.user_id!==legacy.user_id)throw Error('이메일과 로그인에 연결된 회원 기록이 다릅니다.');
 // An explicitly registered owner claims the existing owner ID, preserving history.
 const targetId=staff.role==='admin'?workspace.owner_id:current?.user_id??legacy?.user_id??login.userId;
 if(legacy&&legacy.user_id!==targetId)throw Error('사전등록 이메일에 다른 회원 기록이 연결되어 있습니다.');
 if(!current&&legacy&&staff.role!=='admin'&&(legacy.role!==staff.role||legacy.teacher_id!==staff.teacherId))throw Error('기존 회원의 역할을 확인한 후 직원 계정을 연결해 주세요.');
 if(current&&current.user_id!==targetId)throw Error('기존 회원 기록을 원장 계정에 자동 병합할 수 없습니다.');
 const target=await db.prepare('SELECT * FROM memberships WHERE user_id=?').bind(targetId).first<Member>();
 if(target&&(target.workspace_id!==workspace.id||target.role==='blocked'||(target.role==='admin'&&staff.role!=='admin')))throw Error('기존 회원의 권한 또는 이용 중지 상태를 먼저 확인해 주세요.');
 if(targetId!==login.userId&&await db.prepare('SELECT user_id FROM registrations WHERE user_id=?').bind(login.userId).first())throw Error('기존 가입 신청을 확인한 후 계정을 연결해 주세요.');
 const mapping=await db.prepare('SELECT user_id FROM login_identities WHERE id=? AND provider=?').bind(login.identityId,'google').first<{user_id:string}>();
 if(mapping?.user_id!==login.userId)throw Error('구글 계정 연결 상태를 확인해 주세요.');
 const changed=!target||target.role!==staff.role||target.teacher_id!==staff.teacherId||target.name!==staff.name||target.email!==email;
 const statements=[
  db.prepare('UPDATE login_identities SET user_id=? WHERE id=? AND provider=? AND user_id=?').bind(targetId,login.identityId,'google',login.userId),
  db.prepare(`INSERT INTO memberships (user_id,workspace_id,role,student_id,name,email,teacher_id,student_ids)
   SELECT ?,?,?,NULL,?,?,?,'[]' WHERE EXISTS (SELECT 1 FROM login_identities WHERE id=? AND user_id=?)
   ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,name=excluded.name,email=excluded.email,teacher_id=excluded.teacher_id
   WHERE memberships.workspace_id=excluded.workspace_id AND memberships.role<>'blocked' AND (memberships.role<>'admin' OR excluded.role='admin')`)
   .bind(targetId,workspace.id,staff.role,staff.name,email,staff.teacherId,login.identityId,targetId),
  db.prepare("UPDATE registrations SET status='approved',reviewed_at=?,reviewed_by=? WHERE user_id=? AND workspace_id=? AND status='pending'").bind(now,'staff-email',targetId,workspace.id),
 ];
 if(changed)statements.push(db.prepare('INSERT OR IGNORE INTO member_audit (id,workspace_id,actor_id,actor_name,target_id,action,details,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(`staff-email:${login.identityId}:${staff.role}:${staff.teacherId??''}`,workspace.id,'staff-email','직원 이메일 사전등록',targetId,'staff-email',JSON.stringify({name:staff.name,from:target?.role??'pending',to:staff.role,teacherId:staff.teacherId}),now));
 await db.batch(statements);
 const saved=await db.prepare('SELECT * FROM memberships WHERE user_id=?').bind(targetId).first<Member>();
 const linked=await db.prepare('SELECT user_id FROM login_identities WHERE id=? AND provider=?').bind(login.identityId,'google').first<{user_id:string}>();
 if(!saved||saved.role!==staff.role||saved.teacher_id!==staff.teacherId||linked?.user_id!==targetId)throw Error('다른 화면에서 계정 상태가 변경됐습니다. 다시 로그인해 주세요.');
 return targetId;
}
