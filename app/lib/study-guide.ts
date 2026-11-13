import type {Student,Workspace,Task} from './domain.ts';
import {addDays,todayKST,dailyTasks} from './domain.ts';

export type Tutorial={eligible?:boolean;startedAt?:string;endsAt?:string;readSteps:string[]};
export type StudyBook={id:string;title:string;publisher:string;subject:string;range:string;note:string;createdAt:string;cover?:import('./domain.ts').Attachment};
export type BookAssignment={id:string;bookId:string;range:string;dueDate:string;countsToward30:boolean;createdAt:string;createdBy:string};
export type ManualReminder={date:string;recipient:'student'|'parent';at:string;actor:string};
export const TUTORIAL_STEPS=[
 {id:'start',title:'내 학습 공간 둘러보기',text:'오늘 과제와 다음 수업을 확인하고 함께 성장할 캐릭터를 골라요.',tab:'today',button:'오늘 할 일 보기'},
 {id:'submit',title:'사진으로 첫 과제 제출',text:'종이에 조건정리·구하는 것을 적고 풀이와 채점까지 마친 사진을 올려요.',tab:'today',button:'30문제 제출해 보기'},
 {id:'test',title:'예습과 TEST 준비',text:'시험 테마까지 예습하고 시험지의 제한시간을 확인해요. 점수는 선생님이 기록해요.',tab:'plan',button:'나의 수업 일정 보기'},
 {id:'lecture',title:'강의·필기 이어가기',text:'개념과 대표유형 설명을 듣고 손필기를 정리해요. 시험지에 단권화해 두면 좋아요.',tab:'today',button:'강의·필기 과제 보기'},
 {id:'writing',title:'내 말로 해설쓰기',text:'설명을 들은 문제를 내가 다시 가르치듯 써요. 다음 날 아침에 먼저 해보세요.',tab:'today',button:'해설쓰기 제출해 보기'},
 {id:'question',title:'확인 결과와 질문 익히기',text:'보완 요청을 확인하고, 막힌 부분을 글과 풀이 사진으로 질문하는 방법을 익혀요.',tab:'questions',button:'질문게시판 열기'},
 {id:'review',title:'한 주 돌아보기',text:'달력과 테스트 그래프를 보고 다음 주 계획을 확인해요. 이후에도 가이드는 계속 볼 수 있어요.',tab:'today',button:'내 학습 기록 보기'},
] as const;
export function tutorialStatus(s:Student,now=new Date()){
 const t=s.tutorial;if(!t?.startedAt||!t.endsAt)return {active:false,day:0,read:0};
 const start=new Date(t.startedAt).getTime(),end=new Date(t.endsAt).getTime();
 const day=Math.min(7,Math.max(1,Math.floor((now.getTime()-start)/86400000)+1));
 return {active:now.getTime()>=start&&now.getTime()<end,day,read:t.readSteps.length};
}
export function startTutorial(s:Student,now=new Date()){s.tutorial={eligible:false,startedAt:now.toISOString(),endsAt:new Date(now.getTime()+7*86400000).toISOString(),readSteps:[]};}
export function installStudyGuideExamples(w:Workspace){
 if(w.studyGuideVersion===1)return;const today=todayKST();
 const first=w.students.find(s=>s.demo&&s.id==='billing-demo-13');if(first&&!first.tutorial)startTutorial(first);
 const bookStudent=w.students.find(s=>s.demo&&s.id==='crm-demo-student-9')??w.students.find(s=>s.demo&&s.name==='가상 배준우');
 if(bookStudent){bookStudent.studyBooks??=[];if(!bookStudent.studyBooks.some(b=>b.id==='book-guide-example')){bookStudent.studyBooks.push({id:'book-guide-example',title:'학교 내신 부교재 · 예시',publisher:'학교 배부 자료',subject:'대수',range:'다항식 단원',note:'가상 교재 등록 · 담당자가 문제 범위 지정',createdAt:new Date().toISOString()});(bookStudent.bookAssignments??=[]).push({id:'book-task-example',bookId:'book-guide-example',range:'다항식 · 1~10번',dueDate:today,countsToward30:true,createdAt:new Date().toISOString(),createdBy:'변지석'});}if(!bookStudent.tutorial?.startedAt)startTutorial(bookStudent,new Date(Date.now()-3*86400000));}
 for(const s of w.students)if(s.wakeTime<'05:00'||s.wakeTime>'06:30')s.wakeTime='06:30';
 w.studyGuideVersion=1;
}
export function bookTasks(s:Student,date?:string):Task[]{return (s.bookAssignments??[]).filter(a=>!date||a.dueDate===date).map(a=>({id:`extra:${a.id}`,kind:'practice',label:`내신 부교재 · ${s.studyBooks?.find(b=>b.id===a.bookId)?.title??'등록 교재'}`,description:`${a.range} · ${a.dueDate} 마감 · ${a.countsToward30?'30문제에 포함':'별도 과제'}`,mark:s.marks[`extra:${a.id}`]}));}
export function tutorialDone(s:Student,w:Workspace){const marks=Object.entries(s.marks);return {
 start:!!s.companion?.chosen,
 submit:marks.some(([id,m])=>id.endsWith(':problems')&&!!m.submittedAt),
 test:marks.some(([id,m])=>id.endsWith(':test')&&m.status==='approved'),
 lecture:marks.some(([id,m])=>id.endsWith(':lecture')&&!!m.submittedAt),
 writing:marks.some(([id,m])=>id.endsWith(':writing')&&!!m.submittedAt),
 question:(w.questions??[]).some(q=>q.studentId===s.id),
 review:false,
};}
export function missedDaily(s:Student,date=addDays(todayKST(),-1)){
 if(date<s.startDate||date>=todayKST()||s.admission&&s.admission.stage!=='regular'||s.billing?.stopped)return [];
 return dailyTasks(s,date).filter(t=>!s.taskExceptions?.includes(t.id)&&(!t.mark||t.mark.late||t.mark.status==='missed'));
}
export function reminderText(s:Student,date:string,recipient:'student'|'parent'){
 const missing=missedDaily(s,date).map(t=>t.label).join(' · ');
 return recipient==='student'?`[ORCA 수학] ${s.name} 학생, ${date} 과제 중 ${missing}이 마감까지 제출되지 않았어요. 홈페이지에서 빠진 과제를 확인하고 마무리해 주세요. 지각 제출은 보관되지만 성사율에는 반영되지 않습니다. 막힌 부분은 질문게시판에 남겨 주세요.`:`[ORCA 수학] ${s.name} 학생의 ${date} 과제 중 ${missing}이 마감까지 제출되지 않았습니다. 홈페이지에서 제출 현황을 확인하실 수 있습니다. 학생이 과제를 마무리할 수 있도록 확인 부탁드립니다.`;
}
