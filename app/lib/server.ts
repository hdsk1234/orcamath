import {staffLoginMatches} from './staff-access';
import {regularStudent,diagnosticAccess} from './crm';
import {reconcileFirstPayments} from './admissions';
import {assignedStudentIds} from './permissions';
import {reconcileCompanions} from './companions';
import {reconcileScholarships} from './scholarships';
import {reconcileRenewalInvoices} from './operations';
import { env } from 'cloudflare:workers';
import { getOrcaUser } from './social-auth';
import { canAccessStudent, visibleWorkspace, type Workspace, type Viewer, type Role } from './domain';
export class AppError extends Error { constructor(public status:number,message:string){super(message);} }
export function database(){if(!env.DB)throw new AppError(503,'데이터 저장소를 연결하는 중입니다.');return env.DB;}
export async function authenticated(){const user=await getOrcaUser();if(!user)throw new AppError(401,'로그인이 필요합니다.');return user;}
export async function identity(){
 const user=await authenticated();const db=database();

 const m=await db.prepare('SELECT user_id,workspace_id,role,student_id,name,email,teacher_id,student_ids FROM memberships WHERE user_id=?').bind(user.userId).first<{user_id:string;workspace_id:string;role:Role;student_id:string|null;name:string;email:string|null;teacher_id:string|null;student_ids:string}>();
 if(!m)throw new AppError(403,'가입 승인 신청 또는 초대코드로 학원 계정을 연결해 주세요.');
 if(!['admin','manager','teacher','assistant','student','parent'].includes(m.role))throw new AppError(403,'이 계정의 이용 권한이 중지되었습니다.');
 const owner=await db.prepare('SELECT owner_id FROM workspaces WHERE id=?').bind(m.workspace_id).first<{owner_id:string}>();
 if(m.role==='admin'&&owner?.owner_id!==user.userId)throw new AppError(403,'원장 계정의 권한을 확인해 주세요.');
 if(!staffLoginMatches(user,m))throw new AppError(403,'사전등록된 구글 이메일로 다시 로그인해 주세요. 직원 이메일이 미정이면 먼저 등록이 필요합니다.');
 if(user.email)await db.prepare('UPDATE memberships SET email=? WHERE user_id=? AND (email IS NULL OR email<>?)').bind(user.email,user.userId,user.email).run();
 const {workspace}=await loadWorkspace(m.workspace_id);let explicit:string[]=[];try{const ids=JSON.parse(m.student_ids);if(Array.isArray(ids))explicit=ids.filter((id:unknown)=>typeof id==='string');}catch{}
 return {viewer:{userId:user.userId,name:m.name,role:m.role,studentId:m.student_id,email:user.email||m.email||'',teacherId:m.teacher_id,studentIds:assignedStudentIds(m.role,m.teacher_id,explicit,workspace.students)} satisfies Viewer,workspaceId:m.workspace_id};
}
export function staff(v:Viewer,roles:Role[]=['admin','manager','teacher','assistant']){if(!roles.includes(v.role))throw new AppError(403,'이 작업을 처리할 권한이 없습니다.');}
export function canStudent(v:Viewer,id:string){if(!canAccessStudent(v,id))throw new AppError(403,'본인 학생 기록만 이용할 수 있습니다.');}
export async function loadWorkspace(id:string){const r=await database().prepare('SELECT data,revision FROM workspaces WHERE id=?').bind(id).first<{data:string;revision:number}>();if(!r)throw new AppError(404,'학원을 찾을 수 없습니다.');return {workspace:JSON.parse(r.data) as Workspace,revision:r.revision};}
export function filterWorkspace(w:Workspace,v:Viewer){return visibleWorkspace(w,v);}
export async function mutateWorkspace<T>(id:string,mutate:(w:Workspace)=>T){
 for(let n=0;n<6;n++){const {workspace,revision}=await loadWorkspace(id);reconcileCompanions(workspace);reconcileScholarships(workspace);reconcileFirstPayments(workspace);reconcileRenewalInvoices(workspace);const result=mutate(workspace);reconcileCompanions(workspace);reconcileScholarships(workspace);reconcileFirstPayments(workspace);reconcileRenewalInvoices(workspace);workspace.updatedAt=new Date().toISOString();const changed=await database().prepare('UPDATE workspaces SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(workspace),id,revision).run();if(changed.meta.changes===1)return {workspace,revision:revision+1,result};}
 throw new AppError(409,'다른 화면에서 기록을 변경했습니다. 다시 시도해 주세요.');
}
export function checkOrigin(r:Request){const o=r.headers.get('origin');if(o&&o!==new URL(r.url).origin)throw new AppError(403,'다른 사이트에서 요청할 수 없습니다.');}
export function json(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store'}});}
export function failure(e:unknown){console.error(e instanceof AppError?e.message:'Request failed');return json({error:e instanceof AppError?e.message:'처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'},e instanceof AppError?e.status:500);}
export async function sha(v:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(h)].map(n=>n.toString(16).padStart(2,'0')).join('');}

export function requireRegular(workspace:Workspace,viewer:Viewer){if(['student','parent'].includes(viewer.role)){const s=workspace.students.find(s=>s.id===viewer.studentId);if(!s||!regularStudent(s))throw new AppError(403,'정규 등록과 진단 완료 후 이용할 수 있습니다.');}}
export function requireStudentRegular(s:import('./domain').Student){if(!regularStudent(s))throw new AppError(403,'정규 등록과 진단 완료 후 과제와 수업을 진행할 수 있어요.');}
