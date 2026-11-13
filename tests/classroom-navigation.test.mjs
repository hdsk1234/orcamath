import test from 'node:test';
import assert from 'node:assert/strict';
import {ADMIN_PAGES,LEARNING_PAGES,classroomPath,parseClassroomRoute,resolveClassroomNavigation,availableClassroomTabs} from '../app/lib/classroom-navigation.ts';
const viewer=role=>({role,userId:'test',name:'테스트',studentId:null,studentIds:[]});
const regular={id:'student'};
test('모든 메뉴는 새로고침 가능한 고유 주소로 왕복된다',()=>{
 for(const mode of ['student','parent','admin']){
  const pages=mode==='admin'?ADMIN_PAGES:LEARNING_PAGES;
  for(const tab of Object.keys(pages)){
   const url=classroomPath(mode,tab,'학생&1','orca');
   assert.deepEqual(parseClassroomRoute(new URL(url,'http://localhost').pathname.split('/').slice(2)),{mode,tab});
   assert.equal(new URL(url,'http://localhost').searchParams.get('studentId'),'학생&1');
  }
  assert.equal(new Set(Object.values(pages)).size,Object.keys(pages).length);
 }
});
test('잘못된 경로와 다른 공간의 메뉴는 유효한 페이지로 인식하지 않는다',()=>{
 for(const parts of [[],['admin'],['student','dashboard'],['admin','growth'],['unknown','today'],['admin','dashboard','extra'],['admin','toString']])assert.equal(parseClassroomRoute(parts),null);
});
test('기존 진단 링크를 유지하고 역할별 기본 페이지를 선택한다',()=>{
 assert.deepEqual(resolveClassroomNavigation(viewer('admin'),regular),{mode:'admin',tab:'overview'});
 assert.deepEqual(resolveClassroomNavigation(viewer('admin'),regular,undefined,'survey'),{mode:'student',tab:'survey'});
 assert.deepEqual(resolveClassroomNavigation(viewer('parent'),regular),{mode:'parent',tab:'today'});
 assert.deepEqual(resolveClassroomNavigation(viewer('admin'),regular,'student','plan'),{mode:'student',tab:'plan'});
});
test('주소를 입력해도 학생·학부모는 관리자 화면으로 전환되지 않는다',()=>{
 for(const role of ['student','parent'])assert.deepEqual(resolveClassroomNavigation(viewer(role),regular,'admin','members'),{mode:role,tab:'today'});
 for(const role of ['teacher','assistant'])for(const tab of ['members','finance'])assert.equal(resolveClassroomNavigation(viewer(role),regular,'admin',tab).tab,'overview');
 assert.equal(resolveClassroomNavigation(viewer('assistant'),regular,'admin','reminders').tab,'overview');
 assert(availableClassroomTabs('admin',viewer('teacher'),regular).includes('settlement'));
 assert(!availableClassroomTabs('admin',viewer('admin'),regular).includes('settlement'));
});
test('등록 전 학생은 주소로 정규 학습 메뉴를 열 수 없다',()=>{
 const trial={id:'trial',admission:{stage:'diagnosis'}};
 for(const tab of ['books','plan','growth','questions'])assert.equal(resolveClassroomNavigation(viewer('student'),trial,'student',tab).tab,'today');
 assert.equal(resolveClassroomNavigation(viewer('student'),trial,'student','result').tab,'result');
});
