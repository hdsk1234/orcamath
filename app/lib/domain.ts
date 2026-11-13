import {carriedMakeups} from './lesson-attendance.ts';
import {publicOperations} from './operations.ts';
import {DIAGNOSTIC_VERSION,originalGroupScore,originalPotential,originalNarrative,safeDiagnostic,type DiagnosticState} from './diagnostic.ts';
import {regularStudent,diagnosticAccess,reportVisible,type Lead,type Admission} from './crm.ts';
import type {SaleConsultation} from './admissions.ts';
import type {CompanionProfile} from './companions.ts';
import {effectiveCompanionLevel,companionRemainder} from './companions.ts';
import type { BillingProfile } from './billing';
import {publicScholarshipRecords,type ScholarshipRecord} from './scholarships.ts';
import {visibleQuestions,type Question} from './questions.ts';
export type Role = 'admin' | 'manager' | 'teacher' | 'assistant' | 'student' | 'parent';
export type MarkStatus = 'submitted' | 'approved' | 'revision' | 'missed';
export type Attachment = { key: string; name: string; size: number; type: string };
export type Mark = { late?:boolean;onTimeSubmittedAt?:string;paperConfirmed?:boolean;graded?:boolean; status: MarkStatus; note?: string; files?: Attachment[]; value?: number | string; confirmedWritingCount?:number; submittedAt?: string; reviewedAt?: string; reviewer?: string; score?: number; xpEfficiency?:number };
export type Theme = { id: string; number: string; subject: string; title?:string; practice: boolean; minutes: number; essential?: boolean; lectureUrl?: string; testFile?: Attachment; practiceFile?: Attachment };
export type Assessment = { content: number | null; action: number | null; note: string; reviewedAt?: string };
export type Student = { carriedMakeups?:{cycleNumber:number;round:number;session:import('./billing.ts').LessonSession;teacherId:string;mode:import('./billing.ts').CourseMode;stopped:boolean}[]; enrollment?:import('./operations.ts').Enrollment; billingHistory?:BillingProfile[]; approvedDiagnostic?:import('./diagnostic-ai.ts').ApprovedDiagnosis; reportGuidance?:import('./diagnostic-report.ts').ReportGuidance; diagnostic?:DiagnosticState;diagnosticHistory?:{createdAt:string;report:ReturnType<typeof diagnosis>;guidance?:import('./diagnostic-report.ts').ReportGuidance}[]; tutorial?:import('./study-guide.ts').Tutorial;studyBooks?:import('./study-guide.ts').StudyBook[];bookAssignments?:import('./study-guide.ts').BookAssignment[];contacts?:{studentPhone:string;parentPhone:string};manualReminders?:import('./study-guide.ts').ManualReminder[];taskExceptions?:string[]; admission?:Admission; diagnosticReport?:ReturnType<typeof diagnosis>; resultWithheld?:boolean; id: string; name: string; demo: boolean; grade: string; target: string; korean: number[]; startDate: string; zoomDays: number[]; zoomTime: string; wakeTime: string; writingCount: number; selected: string[]; marks: Record<string, Mark>; answers: Record<string, number | null>; potential: number[]; surveyAt?: string; assessment: Assessment; availability: string; currentBooks: string; delayReason: string; invitationStatus?: string; beginner?:boolean; billing?: BillingProfile; companion?:CompanionProfile; scholarships?:ScholarshipRecord[] };
export type Workspace = { operations?:import('./operations.ts').Operations; aiCases?:import('./diagnostic-ai.ts').AiCase[]; studyGuideVersion?:number; leads?:Lead[];crmExampleVersion?:number; students: Student[]; themes: Theme[]; consultations: { id: string; studentId: string; note: string; createdAt: string; status: string }[]; updatedAt: string; salesConsultations?:SaleConsultation[];admissionExampleVersion?:number;billingExampleVersion?: number; questions?:Question[]; questionExampleVersion?:number; companionExampleVersion?:number };
export type Viewer = { userId: string; name: string; role: Role; studentId: string | null; studentIds?:string[]; teacherId?:string|null; email?:string };
export const isStaffRole=(role:Role)=>['admin','manager','teacher','assistant'].includes(role);
export const isLinkedViewer=(role:Role)=>role==='student'||role==='parent';
export const canWriteRecords=(role:Role)=>role==='student'||isStaffRole(role);
export function canAccessStudent(viewer:Viewer,id:string){return ['admin','manager'].includes(viewer.role)||(['teacher','assistant'].includes(viewer.role)&&(viewer.studentIds??[]).includes(id))||(isLinkedViewer(viewer.role)&&!!viewer.studentId&&viewer.studentId===id);}
export function visibleWorkspace(w:Workspace,v:Viewer){
 if(v.role==='admin')return w;
 if(v.role==='manager')return w.aiCases?{...w,aiCases:undefined}:w;
 const students=w.students.filter(s=>canAccessStudent(v,s.id)||diagnosticAccess(v,s)).map(s=>{
  if(!regularStudent(s)){const {billing,scholarships,companion,diagnosticHistory,reportGuidance,approvedDiagnostic,...trial}=s;return {...trial,...(reportVisible(v,s)?{diagnosticHistory,reportGuidance,approvedDiagnostic}:{}),diagnostic:safeDiagnostic(s.diagnostic,reportVisible(v,s)),marks:{},selected:[],assessment:reportVisible(v,s)?s.assessment:{content:null,action:null,note:''},diagnosticReport:reportVisible(v,s)?diagnosis(s):undefined,resultWithheld:!reportVisible(v,s)};}
  const {billing,billingHistory,scholarships,diagnosticHistory,reportGuidance,approvedDiagnostic,...base}=s;
  const rest={...base,assessment:reportVisible(v,s)?s.assessment:{content:null,action:null,note:''},diagnosticReport:reportVisible(v,s)?diagnosis(s):undefined,resultWithheld:!reportVisible(v,s),diagnostic:safeDiagnostic(s.diagnostic,reportVisible(v,s)),...(reportVisible(v,s)?{diagnosticHistory,reportGuidance,approvedDiagnostic}:{}),...(scholarships?{scholarships:publicScholarshipRecords(scholarships)}:{}),rankingInactive:!!billing?.stopped,rankingClosedDate:billing?.stopped?billing.refundDate?.slice(0,10):undefined};
  if(!isLinkedViewer(v.role)||!billing)return rest;
  const {paidOut,settlementClosed,settlementAmount,...visible}=billing;
  return {...rest,billing:visible,carriedMakeups:carriedMakeups(s),diagnosticReport:reportVisible(v,s)?diagnosis(s):undefined};
 });
 return {...w,operations:publicOperations(w,v),aiCases:undefined,students,leads:undefined,themes:isLinkedViewer(v.role)&&students.every(s=>!regularStudent(s))?[]:w.themes,salesConsultations:undefined,consultations:w.consultations.filter(c=>canAccessStudent(v,c.studentId)),...(w.questions?{questions:isLinkedViewer(v.role)&&students.every(s=>!regularStudent(s))?[]:visibleQuestions(w,v)}:{})};
}
export type Task = { id: string; label: string; kind: 'wake' | 'problems' | 'writing' | 'test' | 'lecture' | 'practice' | 'attendance'; themeId?: string; description: string; mark?: Mark; minutes?: number };
export type PlanDay = { date: string; tasks: Task[]; zoom?: { themeId: string; purpose: 'test' | 'remedial' | 'finished'; label: string }; forecast: boolean };
export const GROUPS = [{ id: 'G1', label: '태도와 실행', short: '태도·실행' }, { id: 'G2', label: '생활과 환경', short: '생활습관' }, { id: 'L3', label: '개념을 공부하는 방식', short: '개념 이해' }, { id: 'L4', label: '문제풀이 방식', short: '풀이 접근' }, { id: 'P5', label: '실수 예방과 점검', short: '실수 관리' }, { id: 'P6', label: '시험운용', short: '시험운용' }];
export const QUESTION_ROWS: [string, string, '생각' | '행동' | '시험', number][] = [
 ['G1-01','수학 공부를 통해 이루려는 구체적인 목표가 있다.','생각',5],
 ['G1-02','성적이 정체되면 공부 방법을 바꿔 개선할 수 있다고 생각한다.','생각',5],
 ['G1-03','풀이가 빠르다면, 그 방법이 성립하는 조건을 몰라도 우선 외우는 편이 낫다고 생각한다.','생각',1],
 ['G1-04','피드백을 받으면 다음 공부에서 지적받은 부분을 고치려고 시도한다.','행동',5],
 ['G1-05','혼자 해결되지 않는 부분은 어디서 막혔는지 정리해서 질문한다.','행동',5],
 ['G1-06','하루에 하기로 정한 수학 공부를 그날 마친다.','행동',5],
 ['G1-07','전날 끝내지 못한 수학 공부를 다음 공부 시간에 다시 시작한다.','행동',5],
 ['G1-08','시험이나 과제 결과가 좋지 않으면 다음에 하기로 한 공부를 피한다.','행동',1],
 ['G2-01','일어나기로 정한 시간에 일어난다.','행동',5],
 ['G2-02','잠자리에 들기로 정한 시간에 눕는다.','행동',5],
 ['G2-03','졸려서 예정한 공부를 중단한다.','행동',1],
 ['G2-04','잠들기 전 휴대폰을 보느라 예정한 취침 시간이 늦어진다.','행동',1],
 ['G2-05','휴대폰을 보느라 수학 공부를 시작하기로 한 시간이 늦어진다.','행동',1],
 ['G2-06','끼니를 비슷한 시간대에 챙겨 먹는다.','행동',5],
 ['G2-07','음식이나 간식을 고를 때 영양 구성을 살펴 선택한다.','행동',5],
 ['G2-08','산책이나 가벼운 운동을 생활 속에서 규칙적으로 한다.','행동',5],
 ['L3-01','배운 개념의 정의를 내 말로 설명해 본다.','행동',5],
 ['L3-02','공식이나 정리를 사용할 수 있는 조건을 확인한다.','행동',5],
 ['L3-03','공식이나 정리가 왜 성립하는지 확인한다.','행동',5],
 ['L3-04','개념 공부를 마치면 자료를 덮고 핵심 내용을 다시 써 보거나 말해 본다.','행동',5],
 ['L3-05','설명을 들을 때 이해되면 스스로 다시 설명하지 못해도 개념을 안다고 판단한다.','생각',1],
 ['L4-01','계산을 시작하기 전에 문제에서 무엇을 구하라는지 확인한다.','행동',5],
 ['L4-02','풀이에 필요한 조건을 식이나 그림으로 정리한다.','행동',5],
 ['L4-03','풀이 방법을 선택할 때 어떤 조건 때문에 그 방법을 쓰는지 생각한다.','행동',5],
 ['L4-04','막힌 부분의 힌트를 받으면 다음 단계는 스스로 풀어 본다.','행동',5],
 ['L4-05','해설을 공부할 때 풀이를 옮겨 적는 것으로 끝내고, 각 단계를 왜 했는지는 설명하지 않는다.','행동',1],
 ['P5-01','반복되는 실수도 원인을 찾아 연습하면 줄일 수 있다고 생각한다.','생각',5],
 ['P5-02','실수를 줄이기 위해 사용하는 나만의 점검 방법이 있다.','생각',5],
 ['P5-03','문제를 풀 때 실수를 예방하려고 의식적으로 신경 쓰는 것이 중요하다고 생각한다.','생각',5],
 ['P5-04','문제를 풀 때 내가 정해 둔 실수 방지 방법을 실제로 사용한다.','행동',5],
 ['P5-05','틀린 문제에서 내가 어느 단계에서 실수했는지 찾아본다.','행동',5],
 ['P5-06','정답을 확인하기 전에 내 풀이를 한 번 점검한다.','행동',5],
 ['P5-07','시간에 쫓기면 평소에는 하지 않던 실수가 늘어난다.','행동',1],
 ['P6-01','접근이 떠오르지 않는 문제는 표시하고 다른 문제로 넘어간다.','시험',5],
 ['P6-02','확실히 풀 수 있는 문제를 먼저 처리한다.','시험',5],
 ['P6-03','이미 푼 문제를 검토할 시간을 남겨 둔다.','시험',5],
 ['P6-04','끝까지 풀지 못한 객관식은 남은 시간에 조건에 맞지 않는 선지를 지우는 등 근거를 찾아 답을 선택한다.','시험',5],
 ['P6-05','넘긴 문제가 계속 신경 쓰여서 지금 푸는 문제에 집중하지 못한다.','시험',1],
 ['P6-06','시험 중 긴장 때문에 평소 하던 풀이를 이어 가지 못한다.','시험',1],
 ['P6-07','시험 중 예상보다 오래 걸리면 남은 문제를 푸는 순서를 조정한다.','시험',5]
];
export const POTENTIAL_QUESTIONS = ['과거에 공부 방법을 익힌 뒤 학교 공부에서 좋은 성과를 낸 경험이 있다.', '전략이 필요한 게임이나 운동에서 배운 원리를 다른 상황에도 적용하는 편이다.', '한 번 받은 학습 피드백을 다음의 비슷한 새 문제에 적용하는 편이다.', '이해한 내용을 다른 사람이 알아들을 수 있게 내 말로 설명하는 편이다.'];
export const todayKST = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
export function addDays(date: string, n: number) { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function weekday(date: string) { return new Date(date + 'T12:00:00Z').getUTCDay(); }
export function monday(date: string) { return addDays(date, -((weekday(date) + 6) % 7)); }
export function dateLabel(date: string, full = false) { const d = new Date(date + 'T12:00:00Z'); return `${full ? d.getUTCFullYear() + '. ' : ''}${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; }
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function makeThemes(): Theme[] {
 const specifications: [string, string, number][] = [['h','공통수학',18],['a','대수 · 지수로그',9],['b','대수 · 삼각함수',8],['s','대수 · 수열',5],['c','수2',16],['pa','피어싱 · 대수',4],['pc','피어싱 · 수2',6],['pp','피어싱 · 확통',10]];
 const list: Theme[] = [];
 for (const [prefix, subject, count] of specifications) for (let i = 1; i <= count; i++) {
  list.push({ id: `${prefix}-${i}`, number: String(i), subject, practice: !(prefix === 'c' && [3,6,13].includes(i)), minutes: 45, essential: prefix === 'h' && [1,3,4,5,6].includes(i) });
  if(prefix === 'c' && i === 12) list.push({id:'c-12.2', number:'12.2', subject, practice:true, minutes:45});
 }
 return list;
}
export const themeLabel = (t?: Theme) => t ? `${t.subject} · ${t.title?t.title+' · ':''}Theme ${t.number}` : '테마';
export function stageId(themeId: string, stage: string) { return `${stage === 'practice' && themeId === 'c-12.2' ? 'c-12' : themeId}:${stage}`; }
export function approved(student: Student, id: string) { return student.marks[id]?.status === 'approved'; }
export function themeDone(student: Student, theme: Theme) { return ['test','lecture',...(theme.practice ? ['practice']:[])].every(stage=>approved(student,stageId(theme.id, stage))); }
export function currentTheme(student: Student, themes: Theme[]) { return student.selected.map(id=>themes.find(t=>t.id===id)).find(t=>t && !themeDone(student,t)); }
export function themeTasks(student: Student, t: Theme): Task[] { return [
 { id:stageId(t.id,'test'),label:`Theme ${t.number} TEST`,kind:'test' as const,themeId:t.id,description:'Zoom에서 TEST 응시 · 선생님 확인',minutes:t.minutes },
 { id:stageId(t.id,'lecture'),label:`Theme ${t.number} 인강·필기`,kind:'lecture' as const,themeId:t.id,description:'인강에 나오는 선생님 손필기 전부 제출',minutes:t.minutes },
 ...(t.practice ? [{id:stageId(t.id,'practice'),label:t.id==='c-12'||t.id==='c-12.2'?'Theme 12 · 12.2 공통 연습':`Theme ${t.number} 연습문제`,kind:'practice' as const,themeId:t.id,description:'지정 연습문제 풀이 제출 · 오늘 총문제 수에 포함',minutes:t.minutes}]:[])
 ].map(task=>({...task, mark:student.marks[task.id]})); }
export function dailyTasks(student: Student,date:string): Task[] { return [
 {id:`daily:${date}:wake`,kind:'wake' as const,label:'기상',description:'05:00~06:30 기상 인증 · 06:31부터 인정되지 않아요'},
 {id:`daily:${date}:problems`,kind:'problems' as const,label:'하루 총 30문제',description:'연습문제 포함 · 하루에 푼 전체 문제 · 조교가 유연하게 확인'},
 {id:`daily:${date}:writing`,kind:'writing' as const,label:`해설쓰기 ${student.writingCount}개`,description:'설명을 들은 문제를 내가 다시 가르치듯 작성 · 아침에 먼저 해봐요'}
 ].map(t=>({...t,mark:student.marks[t.id]})); }
export function nextZoom(student: Student, themes: Theme[], date=todayKST()) {
 let scheduled=date < student.startDate ? student.startDate : date;
 for(let i=0;i<7 && !student.zoomDays.includes(weekday(scheduled));i++)scheduled=addDays(scheduled,1);
 const theme=currentTheme(student,themes);
 const purpose= !theme ? 'finished' : approved(student,stageId(theme.id,'test')) ? 'remedial' : 'test';
 return {date:scheduled,themeId:theme?.id??'',purpose:purpose as 'test'|'remedial'|'finished', label:!theme?'선택 진도 완료 · 다음 계획 확인':purpose==='remedial'?`Theme ${theme.number} 미완료 학습 보완`:`Theme ${theme.number} TEST`};
}
export function planDays(student:Student,themes:Theme[],start:string,days=14,today=todayKST()):PlanDay[] {
 const selected=student.selected.map(id=>themes.find(t=>t.id===id)).filter(Boolean) as Theme[];
 const output:PlanDay[]=Array.from({length:days},(_,i)=>({date:addDays(start,i),tasks:[],forecast:addDays(start,i)>today}));
 const end=addDays(start,days-1);
 // Historical planned entries retain their original dates. Future entries begin
 // at the first actually incomplete theme, never at an unchecked daily habit.
 let historicalIndex=0;
 for(let date=student.startDate;date<=end&&date<today;date=addDays(date,1)){
  if(!student.zoomDays.includes(weekday(date)))continue;
  const t=selected[historicalIndex++];if(!t)break;
  const day=output.find(x=>x.date===date);
  if(day){day.zoom={themeId:t.id,purpose:'test',label:`Theme ${t.number} TEST`};day.tasks.push(themeTasks(student,t)[0]);}
  for(const [offset,stage] of [[1,'lecture'],[2,'practice']] as const){const target=output.find(x=>x.date===addDays(date,offset));const task=themeTasks(student,t).find(x=>x.kind===stage);if(target&&task&&target.date<today&&!target.tasks.some(x=>x.id===task.id))target.tasks.push(task);}
 }
 let cursor=selected.findIndex(t=>!themeDone(student,t));if(cursor<0)cursor=selected.length;
 let first=true;const usedPractice=new Set<string>();
 for(const day of output){
  if(day.date<today||day.date<student.startDate||!student.zoomDays.includes(weekday(day.date)))continue;
  const t=selected[cursor];
  if(!t){day.zoom={themeId:'',purpose:'finished',label:'선택 진도 완료'};continue;}
  const remedial=first&&approved(student,stageId(t.id,'test'));
  day.zoom={themeId:t.id,purpose:remedial?'remedial':'test',label:remedial?`Theme ${t.number} 미완료 학습 보완`:`Theme ${t.number} TEST`};
  if(remedial){const remaining=themeTasks(student,t).filter(x=>x.kind!=='test'&&!approved(student,x.id)&&(x.kind!=='practice'||!usedPractice.has(x.id)));day.tasks.push(...remaining);for(const task of remaining)if(task.kind==='practice')usedPractice.add(task.id);}
  else day.tasks.push(themeTasks(student,t)[0]);
  for(const [offset,stage] of [[1,'lecture'],[2,'practice']] as const){
   const target=output.find(x=>x.date===addDays(day.date,offset));const task=themeTasks(student,t).find(x=>x.kind===stage);
   if(target&&task&&!approved(student,task.id)&&!remedial){
    if(stage==='practice'&&usedPractice.has(task.id))continue;
    target.tasks.push(task);if(stage==='practice')usedPractice.add(task.id);
   }
  }
  cursor++;first=false;
 }
 return output;
}
export function scoreGroup(student:Student,group:string){
 if(student.approvedDiagnostic)return student.approvedDiagnostic.report.areas.find(a=>a.id===group)?.score??null;
 if(group==='L3')return student.assessment.content;
 if(group==='L4')return student.assessment.action;
 if(student.diagnostic?.version===DIAGNOSTIC_VERSION)return originalGroupScore(student.diagnostic,group);
 const rows=QUESTION_ROWS.filter(q=>q[0].startsWith(group));
 const values=rows.filter(q=>typeof student.answers[q[0]]==='number').map(q=>5-Math.abs((student.answers[q[0]] as number)-q[3]));
 if(values.length<Math.max(4,Math.ceil(rows.length*.75)))return null;
 return Math.round(((values.reduce((a,b)=>a+b,0)/values.length)-1)/4*100)/10;
}
export function potentialRating(student:Student){
 if(student.approvedDiagnostic)return student.approvedDiagnostic.report.potential;
 if(student.diagnostic?.version===DIAGNOSTIC_VERSION)return originalPotential(student.diagnostic);
 const grades=student.korean.filter(n=>n>=1&&n<=9).slice(-3);
 if(grades.length && grades.every(n=>n<=2))return {label:'상',reason:`최근 국어 ${grades.join('·')}등급`,provisional:grades.length<2};
 if(grades.length && grades.every(n=>n<=3)&&grades.some(n=>n<=2)&&grades.some(n=>n===3))return {label:'중상',reason:'국어 1~3등급 범위의 기복',provisional:false};
 const positives=student.potential.filter(n=>n>=4).length;
 return {label:positives>=3?'중상':positives===2?'중':'판단 보류',reason:positives?`보조 항목에서 강점 ${positives}개`:'성장에 활용할 근거를 더 확인합니다',provisional:student.potential.filter(n=>n>0).length<4||!grades.length};
}
export function diagnosis(student:Student){
 if(student.approvedDiagnostic){const r=student.approvedDiagnostic.report,a=r.areas.find(a=>a.id===r.priorities[0])??r.areas[0];return {primary:{type:r.type,title:r.title,evidence:a.evidence,meaning:r.summary,action:a.action,risk:'원장이 확정한 개선 계획을 실천해 보세요.',service:'개선 가이드와 첫 학습 계획을 담당자와 함께 이어갑니다.'},secondary:null,strengths:r.strengths.map(title=>({title,text:title,evidence:'원장 확정 진단'})),potential:r.potential,scores:GROUPS.map(g=>({...g,score:scoreGroup(student,g.id),source:r.areas.find(a=>a.id===g.id)?.source??'원장 확정'})),reviewed:true};}
 if(student.diagnostic?.version===DIAGNOSTIC_VERSION)return {...originalNarrative(student),potential:potentialRating(student),scores:GROUPS.map(g=>({...g,score:scoreGroup(student,g.id),source:g.id.startsWith('L')?'교사 평가':'원문 설문 기반'})),reviewed:!!student.diagnostic.finalizedAt};
 const assessment=student.assessment;
 const low=(id:string)=>typeof student.answers[id]==='number' && (student.answers[id] as number)<=2;
 const high=(id:string)=>typeof student.answers[id]==='number' && (student.answers[id] as number)>=4;
 const strengths:{title:string;text:string;evidence:string}[]=[];
 if(high('G1-04'))strengths.push({title:'피드백을 반영하려는 태도',text:'우선 수정할 행동을 정하고 다음 과제에서 적용하는 훈련에 활용합니다.',evidence:'피드백을 다음 공부에 반영하려고 시도한다고 응답했습니다.'});
 if(high('G1-05'))strengths.push({title:'막힌 지점을 질문하는 습관',text:'어려운 단계의 도움을 받고 다음 단계는 직접 시도하는 데 활용합니다.',evidence:'막힌 지점을 정리해 질문한다고 응답했습니다.'});
 if(high('G2-01'))strengths.push({title:'정한 기상 시각을 지키는 습관',text:'확보된 시간에 매일 할 일을 배치해 학습을 이어 갑니다.',evidence:'정해 둔 기상 시각을 지킨다고 응답했습니다.'});
 if(high('G1-07'))strengths.push({title:'밀린 공부로 다시 돌아오는 행동',text:'끝내지 못한 과제를 다음 계획에 연결하는 데 활용합니다.',evidence:'전날 미완료 학습을 다음 시간에 다시 시작한다고 응답했습니다.'});
 let primary={type:'학습 방향 확인',title:'나의 공부를 다음 행동으로 연결할 시간입니다.',evidence:'입력한 응답을 바탕으로 공부 방법과 실행 조건을 확인합니다.',meaning:'실제 개념과 풀이 수준은 선생님 평가가 반영되면 더 구체적으로 정할 수 있습니다.',action:'진단검사를 마치고 선생님 평가로 시작 범위를 확인합니다.',risk:'확인된 문제에 맞춰 다음 공부부터 실행할 행동을 정해 보세요.',service:'학생별 테마와 과제표를 구성하고 제출과 TEST로 진행을 확인합니다.'};
 if(assessment.content!==null && assessment.content<4){primary={type:'개념과 접근 보완',title:'개념을 스스로 설명하고 문제에 연결하는 단계부터 채웁니다.',evidence:`선생님이 내용영역 ${assessment.content}점을 입력했습니다. ${assessment.note}`,meaning:'검사한 범위의 개념을 보완하고 짧은 적용 문제로 이어 갈 필요가 있습니다.',action:'필요한 선수 테마를 배정하고 정의·조건·원리를 스스로 확인합니다.',risk:'설명 듣기에서 끝내면 필요한 개념을 혼자 꺼내 쓰는 연습이 부족한 채 남을 수 있습니다.',service:'수준에 맞는 강의·필기와 연습을 배치하고 TEST에서 적용을 확인합니다.'};}
 if(assessment.action!==null && assessment.action<4 && (assessment.content??0)>=4){primary={type:'풀이 접근 훈련',title:'문제를 읽고 무엇부터 할지 정하는 훈련이 먼저입니다.',evidence:`선생님이 행동영역 ${assessment.action}점을 입력했습니다. ${assessment.note}`,meaning:'조건의 의미와 선택할 풀이 방법을 연결하는 과정에 우선 집중합니다.',action:'조건 → 의미 → 선택한 풀이의 이유를 해설쓰기에 기록합니다.',risk:'풀이를 보는 데서 끝내면 새로운 문제의 첫 단계를 직접 정하는 연습은 부족할 수 있습니다.',service:'해설쓰기와 연습문제를 실제 풀이에 연결하고 교사 피드백과 TEST로 확인합니다.'};}
 if(low('G1-06')&&low('G1-07')&&student.delayReason){primary={type:'실행 관리 우선',title:'오늘의 계획을 시작과 제출까지 이어 가는 관리가 먼저입니다.',evidence:`계획 이행과 밀림 회복이 어렵다고 응답했습니다. 지연 이유: ${student.delayReason}`,meaning:'하루 분량과 시작 조건을 정리하고 미완료가 다음 계획에 이어지게 합니다.',action:'가용 시간 안에서 오늘 첫 과제를 정하고 제출합니다.',risk:'미완료를 정리하지 못한 채 새 과제가 더해지면 무엇부터 할지 더 어려워질 수 있습니다.',service:'오늘 할 일을 배정하고 조교 확인과 밀림 반영으로 다음 Zoom의 목적을 정합니다.'};}
 else if((high('P5-02')||high('P5-03'))&&low('P5-04')&&(assessment.content??7)>=4){primary={type:'실수 관리 보완',title:'알고 있는 실수 방지법을 풀이 중에 사용하는 훈련이 먼저입니다.',evidence:'실수 예방의 중요성·대비책은 인식하지만 실제 사용하는 빈도는 낮다고 응답했습니다.',meaning:'예방 의지는 강점입니다. 이를 풀이 중 점검 행동으로 이어 가야 합니다.',action:'현재 풀이에서 적용할 점검 위치와 방법을 정합니다.',risk:'점검 방법을 알고도 사용하지 않으면 반복 오류를 막는 데 활용되지 않을 수 있습니다.',service:'기존 30문제와 해설쓰기, TEST에 점검 방법을 적용하고 교사 피드백에서 확인합니다.'};}
 const secondary=low('G1-06')?{title:'함께 관리할 부분 · 계획 실행',text:'계획한 공부를 마치기 어렵다고 응답했습니다. 실제 가용 시간과 과제 분량을 확인합니다.'}:low('P6-01')?{title:'함께 관리할 부분 · 시험 손절',text:'접근이 막혀도 다른 문제로 넘어가는 빈도가 낮다고 응답했습니다. TEST에서 전환 기준을 훈련합니다.'}:null;
 return {primary,secondary,strengths:strengths.slice(0,2),potential:potentialRating(student),scores:GROUPS.map(g=>({...g,score:scoreGroup(student,g.id),source:g.id.startsWith('L')?'교사 평가':'설문 기반'})),reviewed:assessment.content!==null&&assessment.action!==null};
}
export const THEME_COMPLETION_XP=50;
export function studentStats(student:Student,themes:Theme[]){
 if(!regularStudent(student))return {done:0,total:0,percent:0,xp:0,rawXp:0,demoXpOffset:0,activityXp:0,progressXp:0,completedThemeIds:[] as string[],level:1,levelXp:0,nextLevel:100,submitted:0,revision:0,tests:[] as {id:string;score:number|null}[]};
 const tasks=student.selected.flatMap(id=>{const t=themes.find(x=>x.id===id);return t?themeTasks(student,t):[];});
 const unique=[...new Map(tasks.map(t=>[t.id,t])).values()];const count=unique.filter(t=>approved(student,t.id)).length,total=unique.length;
 const activityXp=Object.entries(student.marks).reduce((n,[id,m])=>n+(m.status==='approved'&&!m.late?Math.floor((id.endsWith(':test')?30+Math.floor((m.score??0)/10):10)*(m.xpEfficiency??1)):0),0);
 const completedThemeIds=[...new Map(themes.map(t=>[t.id,t])).values()].filter(t=>themeDone(student,t)).map(t=>t.id);
 const progressXp=completedThemeIds.reduce((n,id)=>n+Math.floor(THEME_COMPLETION_XP*(student.companion?.themeXpMultipliers[id]??1)),0);
 const demoXpOffset=student.demo?student.companion?.demoXpOffset??0:0,rawXp=activityXp+progressXp,xp=Math.max(0,rawXp+demoXpOffset);
 const level=effectiveCompanionLevel(student,xp),levelXp=companionRemainder(student,xp);
 return {done:count,total,percent:total?Math.round(count/total*100):0,xp,rawXp,demoXpOffset,activityXp,progressXp,completedThemeIds,level,levelXp,nextLevel:level===50?0:100-levelXp,submitted:Object.values(student.marks).filter(m=>m.status==='submitted').length,revision:Object.values(student.marks).filter(m=>m.status==='revision').length,tests:Object.entries(student.marks).filter(([id,m])=>id.endsWith(':test')&&m.status==='approved').map(([id,m])=>({id,score:m.score??null}))};
}
export function makeStudent(name:string, id:string, demo=false, date=todayKST()):Student{
 return {id,name,demo,grade:'고3',target:'2등급',korean:[],startDate:monday(date),zoomDays:[1,4],zoomTime:'19:00',wakeTime:'06:00',writingCount:1,selected:['h-1','h-3','h-4','h-5'],marks:{},answers:{},potential:[],assessment:{content:null,action:null,note:''},availability:'평일 90분 · 주말 120분',currentBooks:'',delayReason:''};
}
export function seedWorkspace(date=todayKST()):Workspace{
 const themes=makeThemes();const names=['김하준','이서윤','박민재'];
 const students=names.map((name,i)=>{
  const s=makeStudent(name,`sample-${i+1}`,true,date);
  s.korean=i===0?[1,2,2]:i===1?[1,3,2]:[3,3,4];s.potential=i===2?[4,4,4,2]:[2,2,2,2];
  for(const q of QUESTION_ROWS)s.answers[q[0]]=q[3]===5?4:2;
  s.answers['G1-06']=i===0?2:4;s.answers['G2-01']=i===0?2:4;s.answers['P5-04']=i===2?2:4;
  s.assessment={content:i===0?4:6,action:i===0?2:5,note:i===0?'샘플 평가: 기본 개념 일부를 설명했지만 첫 접근에서 어려움이 확인되었습니다.':'샘플 평가: 기본 풀이를 이어 갈 수 있으며 적용을 연습할 단계입니다.',reviewedAt:new Date().toISOString()};
  s.surveyAt=new Date().toISOString();s.selected=i===1?['c-3','c-4','c-6','c-7']:['h-1','h-3','h-4','h-5'];
  const first=s.selected[0];s.marks[stageId(first,'test')]={status:'approved',score:i===0?48:76,reviewer:'샘플 조교',reviewedAt:new Date().toISOString()};
  if(i===0)s.marks[stageId(first,'lecture')]={status:'submitted',submittedAt:new Date().toISOString(),note:'강의 필기를 제출했습니다. 샘플 제출 기록입니다.',files:[]};
  if(i===1){s.marks[stageId(first,'lecture')]={status:'approved',reviewedAt:new Date().toISOString()};}
  if(i===2){s.marks[stageId(first,'lecture')]={status:'approved',reviewedAt:new Date().toISOString()};s.marks[stageId(first,'practice')]={status:'revision',note:'풀이가 빠진 부분을 보완해 제출해 주세요.',reviewedAt:new Date().toISOString()};}
  return s;
 });
 return {students,themes,consultations:[],updatedAt:new Date().toISOString()};
}
