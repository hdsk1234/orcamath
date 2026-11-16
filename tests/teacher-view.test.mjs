import test from 'node:test';
import assert from 'node:assert/strict';
import {teacherViewData,teacherViewOptions} from '../app/lib/teacher-view.ts';
import {seedWorkspace} from '../app/lib/domain.ts';
import {installBillingExamples} from '../app/lib/billing.ts';
import {assignedStudentIds} from '../app/lib/permissions.ts';
import {availableClassroomTabs} from '../app/lib/classroom-navigation.ts';
import {staffOwnDues} from '../app/lib/cashdesk.ts';

const manager={userId:'manager',name:'총괄',role:'manager',studentId:null};
function fixture(){const workspace=seedWorkspace();installBillingExamples(workspace);return {workspace,viewer:manager,revision:1};}

test('원장·총괄관리자가 실제 강사의 자동 연결과 추가 배정 학생 및 메뉴를 확인한다',()=>{
 const data=fixture();
 const extra=data.workspace.students.find(s=>s.billing?.teacherId==='song');
 const teacher={userId:'kang-account',name:'강신의',role:'teacher',teacherId:'kang',studentId:null,studentIds:assignedStudentIds('teacher','kang',[extra.id],data.workspace.students)};
 for(const role of ['admin','manager']){
  const source={...data,viewer:{...manager,role}};
  const view=teacherViewData(source,teacher.userId,[teacher]);
  assert.equal(view.viewer,teacher);
  assert(view.workspace.students.some(s=>s.id===extra.id));
  assert(view.workspace.students.length<data.workspace.students.length);
  assert(view.workspace.students.every(s=>teacher.studentIds.includes(s.id)));
  assert(view.workspace.students.every(s=>!s.billing));
  const tabs=availableClassroomTabs('admin',view.viewer);
  assert(tabs.includes('settlement'));
  assert(!tabs.includes('members'));assert(!tabs.includes('finance'));assert(!tabs.includes('leads'));
  assert(staffOwnDues(source.workspace,view.viewer).every(row=>row.personId==='kang'));
  assert.equal(source.viewer.role,role);
 }
 assert.equal(teacherViewOptions(data.workspace,[teacher]).filter(t=>t.teacherId==='kang').length,1);
});

test('화면 복귀·잘못된 강사 선택과 일반 계정의 임의 전환을 처리한다',()=>{
 const data=fixture();
 assert.equal(teacherViewData(data,''),data);
 assert.equal(teacherViewData(data,'unknown'),data);
 for(const role of ['teacher','assistant','student','parent']){
  const source={...data,viewer:{...manager,role}};
  assert.equal(teacherViewData(source,'teacher:kang'),source);
 }
 const view=teacherViewData(data,'teacher:byun');
 assert.equal(view.viewer.teacherId,'byun');
 assert(availableClassroomTabs('admin',view.viewer).includes('leads'));
 assert(availableClassroomTabs('admin',view.viewer).includes('sales'));
});
