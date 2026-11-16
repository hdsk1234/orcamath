import type {Role,Viewer,Student} from './domain.ts';
export const ROLE_LABELS:Record<Role,string>={admin:'최종관리자 · 원장',manager:'총괄관리자',teacher:'강사 관리자',assistant:'조교',student:'학생',parent:'학부모'};
export const MANAGEMENT_ROLES:Role[]=['admin','manager'];
export const isManagement=(role:Role)=>MANAGEMENT_ROLES.includes(role);
export function canAssignRole(actor:Viewer,targetRole:Role|'blocked',currentRole?:Role|'blocked'){
 if(!['manager','teacher','assistant','student','parent','blocked'].includes(targetRole))return false;
 // Staff roles are granted by verified, preregistered Google email only.
 if(['manager','teacher'].includes(targetRole)&&targetRole!==currentRole)return false;
 if(['manager','teacher'].includes(currentRole??'')&&targetRole!==currentRole&&targetRole!=='blocked')return false;
 if(actor.role==='admin')return targetRole!=='admin'&&currentRole!=='admin';
 return actor.role==='manager'&&!['admin','manager'].includes(targetRole)&&!['admin','manager'].includes(currentRole??'');
}
export function assignedStudentIds(role:Role,teacherId:string|null,explicit:string[],students:Student[]){
 if(isManagement(role))return students.map(s=>s.id);
 if(role==='teacher')return students.filter(s=>explicit.includes(s.id)||(teacherId&&s.billing?.teacherId===teacherId)).map(s=>s.id);
 if(role==='assistant')return students.filter(s=>explicit.includes(s.id)).map(s=>s.id);
 return [];
}
export function canEditStudentPlan(viewer:Viewer){return isManagement(viewer.role)||viewer.role==='teacher';}
