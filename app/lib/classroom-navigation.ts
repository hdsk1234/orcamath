import type {Student, Viewer} from './domain.ts';
import {isStaffRole} from './domain.ts';
import {crmAccess, regularStudent} from './crm.ts';
import {isManagement} from './permissions.ts';

export type ClassroomMode = 'student' | 'parent' | 'admin';
export const LEARNING_PAGES = {
 today:'today', plan:'study-plan', books:'books', questions:'questions',
 result:'diagnostic-results', survey:'diagnostic', growth:'growth',
 guide:'guide', hall:'hall-of-fame',
} as const;
export const ADMIN_PAGES = {
 overview:'dashboard', submissions:'submissions', reminders:'reminders',
 students:'students', assessments:'assessments', questions:'questions',
 materials:'materials', leads:'leads', sales:'commissions', members:'members',
 finance:'billing', settlement:'payouts', guide:'guide', hall:'hall-of-fame',
} as const;
export function parseClassroomRoute(parts:string[]){
 if(parts.length!==2)return null;
 const [mode,slug]=parts;
 if(mode!=='student'&&mode!=='parent'&&mode!=='admin')return null;
 const pages=mode==='admin'?ADMIN_PAGES:LEARNING_PAGES;
 const tab=Object.entries(pages).find(([,value])=>value===slug)?.[0];
 return tab?{mode:mode as ClassroomMode,tab}:null;
}
export function classroomPath(mode:ClassroomMode,tab:string,studentId?:string,friend?:string|null){
 const pages:Record<string,string>=mode==='admin'?ADMIN_PAGES:LEARNING_PAGES;
 const slug=pages[tab]??(mode==='admin'?'dashboard':'today');
 const query=new URLSearchParams();
 if(studentId)query.set('studentId',studentId);
 if(friend)query.set('friend',friend);
 return `/classroom/${mode}/${slug}${query.size?'?'+query.toString():''}`;
}
export function availableClassroomTabs(mode:ClassroomMode,viewer:Viewer,student?:Student){
 if(mode!=='admin')return student&&!regularStudent(student)?['hall','today','survey','result']:Object.keys(LEARNING_PAGES);
 if(!isStaffRole(viewer.role))return [];
 return Object.keys(ADMIN_PAGES).filter(key=>
  key==='reminders'?['admin','manager','teacher'].includes(viewer.role):
  key==='finance'||key==='members'?isManagement(viewer.role):
  key==='leads'?crmAccess(viewer):
  key==='sales'?isManagement(viewer.role)||viewer.teacherId==='byun':
  key==='settlement'?['teacher','assistant'].includes(viewer.role):true);
}
export function resolveClassroomNavigation(viewer:Viewer,student:Student|undefined,requestedMode?:ClassroomMode,requestedTab='today'){
 const mode:ClassroomMode=isStaffRole(viewer.role)
  ?requestedMode??(['survey','result'].includes(requestedTab)?'student':'admin')
  :viewer.role==='parent'?'parent':'student';
 const allowed=availableClassroomTabs(mode,viewer,student);
 const tab=allowed.includes(requestedTab)?requestedTab:mode==='admin'?'overview':'today';
 return {mode,tab};
}

/** Read routes in the persistent client shell, including legacy diagnostic links. */
export function classroomLocation(pathname:string,search:{get:(key:string)=>string|null}){
 const parts=pathname.split('/').filter(Boolean);
 if(parts[0]!=='classroom')return null;
 const route=parts.length===1?null:parseClassroomRoute(parts.slice(1));
 if(parts.length>1&&!route)return null;
 const view=search.get('view');
 return {mode:route?.mode,tab:route?.tab??(view==='survey'?'survey':view==='result'?'result':'today'),studentId:search.get('studentId')??'',friend:search.get('friend')};
}
