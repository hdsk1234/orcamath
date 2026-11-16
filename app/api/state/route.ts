import {assignedStudentIds,isManagement} from '../../lib/permissions';
import {database} from '../../lib/server';
import type {Viewer} from '../../lib/domain';
import {installLeadExamples,CRM_EXAMPLE_VERSION} from '../../lib/crm';
import {installStudyGuideExamples,startTutorial} from '../../lib/study-guide';
import {regularStudent} from '../../lib/crm';
import {chargedFee} from '../../lib/billing';
import {installAdmissionExamples} from '../../lib/admissions';
import {studentStats} from '../../lib/domain';
import {installCompanionExamples,needsCompanionSync} from '../../lib/companions';
import {identity,loadWorkspace,mutateWorkspace,filterWorkspace,json,failure} from '../../lib/server';
import {installBillingExamples} from '../../lib/billing';
import {installQuestionExamples} from '../../lib/questions';
import {env} from 'cloudflare:workers';
import {needsScholarshipSync} from '../../lib/scholarships';
export async function GET(){try{const {viewer,workspaceId}=await identity(true);let state=await loadWorkspace(workspaceId);
 if(viewer.role==='admin'&&(state.workspace.billingExampleVersion!==1||state.workspace.questionExampleVersion!==2||state.workspace.companionExampleVersion!==1||(state.workspace.crmExampleVersion??0)<CRM_EXAMPLE_VERSION||state.workspace.admissionExampleVersion!==1)){const result=await mutateWorkspace(workspaceId,w=>{installBillingExamples(w);installQuestionExamples(w);installCompanionExamples(w,studentStats);installAdmissionExamples(w);installLeadExamples(w);return {};});state={workspace:result.workspace,revision:result.revision};}
 if(needsCompanionSync(state.workspace)||needsScholarshipSync(state.workspace)){const result=await mutateWorkspace(workspaceId,()=>({}));state={workspace:result.workspace,revision:result.revision};}
 if(viewer.role==='admin'&&state.workspace.studyGuideVersion!==1){const result=await mutateWorkspace(workspaceId,w=>{installStudyGuideExamples(w);return {};});state={workspace:result.workspace,revision:result.revision};}
 const self=state.workspace.students.find(s=>s.id===viewer.studentId);
 if(viewer.role==='student'&&self?.tutorial?.eligible&&!self.tutorial.startedAt&&regularStudent(self)&&!!self.billing&&!self.billing.stopped&&self.billing.received-self.billing.refund>=chargedFee(self.billing)&&self.startDate<=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date())){const result=await mutateWorkspace(workspaceId,w=>{const s=w.students.find(s=>s.id===viewer.studentId)!;if(s.tutorial?.eligible&&!s.tutorial.startedAt)startTutorial(s);return {};});state={workspace:result.workspace,revision:result.revision};}
 let teacherViewers:Viewer[]|undefined;
 if(isManagement(viewer.role)){
  const members=await database().prepare("SELECT user_id,name,teacher_id,student_ids FROM memberships WHERE workspace_id=? AND role='teacher'").bind(workspaceId).all<{user_id:string;name:string;teacher_id:string|null;student_ids:string}>();
  teacherViewers=members.results.map(member=>{
   let explicit:string[]=[];
   try{const ids:unknown=JSON.parse(member.student_ids);if(Array.isArray(ids))explicit=ids.filter((id):id is string=>typeof id==='string');}catch{}
   return {userId:member.user_id,name:member.name,role:'teacher',studentId:null,teacherId:member.teacher_id,studentIds:assignedStudentIds('teacher',member.teacher_id,explicit,state.workspace.students)};
  });
 }
 return json({...state,workspace:filterWorkspace(state.workspace,viewer),viewer,...(teacherViewers?{teacherViewers}:{})});}catch(e){return failure(e);}}
