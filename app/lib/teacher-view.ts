import type {Viewer, Workspace} from './domain.ts';
import {visibleWorkspace} from './domain.ts';
import {assignedStudentIds, isManagement} from './permissions.ts';
import {TEACHERS} from './billing.ts';

export function teacherViewOptions(workspace:Workspace, members:Viewer[]=[]):Viewer[]{
 const connected=members.filter(member=>member.role==='teacher');
 const defaults=TEACHERS.filter(teacher=>teacher.id!=='director'&&!connected.some(member=>member.teacherId===teacher.id))
  .map(teacher=>({userId:`teacher:${teacher.id}`,name:teacher.name,role:'teacher' as const,studentId:null,teacherId:teacher.id,studentIds:assignedStudentIds('teacher',teacher.id,[],workspace.students)}));
 return [...connected,...defaults];
}

export function teacherViewData<T extends {viewer:Viewer;workspace:Workspace}>(data:T,key:string,members:Viewer[]=[]):T{
 if(!key||!isManagement(data.viewer.role))return data;
 const viewer=teacherViewOptions(data.workspace,members).find(member=>member.userId===key);
 return viewer?{...data,viewer,workspace:visibleWorkspace(data.workspace,viewer)}:data;
}
