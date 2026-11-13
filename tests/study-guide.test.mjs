import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStudent,seedWorkspace} from '../app/lib/domain.ts';
import {submissionTiming,validWake,reviewedSubmission,koreaClock,assignmentDay} from '../app/lib/submission-time.ts';
import {startTutorial,tutorialStatus,bookTasks,missedDaily,installStudyGuideExamples} from '../app/lib/study-guide.ts';
import {discountPreview} from '../app/lib/billing.ts';
import {studentPerformance} from '../app/lib/performance.ts';
const s=()=>makeStudent('가상 학생','timing',true,'2026-10-01');
test('자정 경계와 한국 시간은 실행 호스트 시간대에 의존하지 않는다',()=>{
 const student=s(),id='daily:2026-10-14:problems';assert.equal(koreaClock(new Date('2026-10-14T14:59:59Z')).time,'23:59:59');
 assert.equal(submissionTiming(student,id,new Date('2026-10-14T14:59:59Z')).late,false);
 assert.equal(submissionTiming(student,id,new Date('2026-10-14T15:00:00Z')).late,true);
 const dawn=submissionTiming(student,'daily:2026-10-15:problems',new Date('2026-10-14T19:59:59Z'));assert.equal(dawn.taskId,id);assert.equal(dawn.late,true);
 const morning=submissionTiming(student,'daily:2026-10-15:problems',new Date('2026-10-14T20:00:00Z'));assert.equal(morning.taskId,'daily:2026-10-15:problems');assert.equal(morning.late,false);
 assert.equal(assignmentDay(new Date('2026-10-14T19:59:59Z')),'2026-10-14');assert.equal(assignmentDay(new Date('2026-10-14T20:00:00Z')),'2026-10-15');
 assert.throws(()=>submissionTiming(student,'daily:2026-10-16:problems',new Date('2026-10-14T20:00:00Z')),/미래/);
});
test('기상 인증은 값과 실제 서버 제출 시간 모두 05:00~06:30',()=>{
 assert.equal(validWake('05:00',new Date('2026-10-14T20:00:00Z')),true);
 assert.equal(validWake('06:30',new Date('2026-10-14T21:30:59Z')),true);
 assert.equal(validWake('06:30',new Date('2026-10-14T21:31:00Z')),false);
 assert.equal(validWake('04:59',new Date('2026-10-14T20:00:00Z')),false);
 assert.equal(validWake('05:30',new Date('2026-10-15T03:00:00Z')),false);
});
test('마감 안에 제출한 원본의 보완 재제출은 지각으로 바꾸지 않는다',()=>{
 const student=s();student.marks['daily:2026-10-14:writing']={status:'revision',submittedAt:'2026-10-14T10:00:00Z',onTimeSubmittedAt:'2026-10-14T10:00:00Z'};
 const timing=submissionTiming(student,'daily:2026-10-14:writing',new Date('2026-10-15T03:00:00Z'));assert.equal(timing.late,false);assert.equal(timing.onTimeSubmittedAt,'2026-10-14T10:00:00Z');
});
test('지각 제출은 확인받아도 성사율·랭킹·할인 성사에 넣지 않고 제출물을 보관',()=>{
 const student=s(),id='daily:2026-10-14:writing';student.marks[id]={status:reviewedSubmission({status:'missed',late:true},'approved'),late:true,value:5,files:[{key:'paper',name:'풀이.jpg',size:100,type:'image/jpeg'}]};
 assert.equal(student.marks[id].status,'approved');assert.equal(studentPerformance(student,[],'2026-10-15').writingItems,0);assert.equal(student.marks[id].files.length,1);
 student.billing={mode:'online',teacherId:'director',cycleNumber:2,discountPercent:5,startDate:'2026-10-14',endDate:'2026-10-14',sessions:[],received:473100,refund:0,scenario:'QA'};
 assert.equal(discountPreview(student,'2026-10-15').approved,0);
});
test('튜토리얼은 7일 후 자동 종료하며 시작과 확인 기록은 남긴다',()=>{
 const student=s(),date=new Date('2026-10-14T23:00:00Z');startTutorial(student,date);student.tutorial.readSteps.push('start');
 assert.equal(tutorialStatus(student,new Date(date.getTime()+7*86400000-1)).active,true);assert.equal(tutorialStatus(student,new Date(date.getTime()+7*86400000)).active,false);assert.equal(student.tutorial.readSteps.length,1);
});
test('부교재 과제는 학생별 마감과 30문제 포함 여부를 유지한다',()=>{
 const student=s();student.studyBooks=[{id:'b',title:'내신',publisher:'',subject:'대수',range:'',note:'',createdAt:''}];student.bookAssignments=[{id:'a',bookId:'b',range:'1~10번',dueDate:'2026-10-15',countsToward30:true,createdAt:'',createdBy:'담당자'}];
 assert.equal(bookTasks(student,'2026-10-14').length,0);assert.equal(bookTasks(student,'2026-10-15')[0].id,'extra:a');assert.match(bookTasks(student)[0].description,/30문제에 포함/);
});
test('문자 목록은 확인 대기·보완 요청·인정된 예외를 미제출로 중복 독촉하지 않는다',()=>{
 const student=s(),date='2026-10-01';student.marks[`daily:${date}:wake`]={status:'submitted'};student.marks[`daily:${date}:writing`]={status:'revision'};
 assert.deepEqual(missedDaily(student,date).map(t=>t.kind),['problems']);student.taskExceptions=[`daily:${date}:problems`];assert.equal(missedDaily(student,date).length,0);
});
test('기존 학생에게 튜토리얼을 일괄 시작하지 않고 예시 설치를 반복해도 중복하지 않는다',()=>{
 const w=seedWorkspace('2026-10-01');installStudyGuideExamples(w);assert.equal(w.students[0].tutorial,undefined);assert.equal(w.studyGuideVersion,1);installStudyGuideExamples(w);assert.equal(w.students.length,3);
});

test('기상은 과거 날짜로 지각 제출할 수 없고 당일 인증만 가능',()=>{
 const student=s(),morning=new Date('2026-10-14T20:30:00Z');
 assert.throws(()=>submissionTiming(student,'daily:2026-10-14:wake',morning),/지각 제출/);
 assert.throws(()=>submissionTiming(student,'daily:2026-10-15:wake',new Date('2026-10-14T19:00:00Z')),/지각 제출/);
 assert.equal(submissionTiming(student,'daily:2026-10-15:wake',morning).late,false);
 for(const kind of ['problems','writing'])assert.equal(submissionTiming(student,'daily:2026-10-14:'+kind,morning).late,true);
});
