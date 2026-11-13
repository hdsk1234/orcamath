import {ORIGINAL_SURVEY} from './diagnostic-survey.ts';
import type {Attachment,Student,Viewer} from './domain.ts';
export {ORIGINAL_SURVEY};
export const DIAGNOSTIC_VERSION='omd-original-57-v1';
export const SUBJECTS=[{id:'common',name:'공통수학1',concept:10,application:10},{id:'algebra',name:'대수',concept:15,application:15},{id:'calculus',name:'미적분1',concept:15,application:15}] as const;
export type Subject=typeof SUBJECTS[number]['id'];
export type Section='concept'|'application';
export type KoreanRecord={exam:'수능'|'평가원'|'교육청';date:string;grade:number};
export type DiagnosticAnswer={text:string;unknown:boolean;files:Attachment[];updatedAt?:string};
export type DiagnosticReview={rating:'correct'|'partial'|'incorrect';note:string;reviewedAt:string;reviewer:string};
export type DiagnosticState={version:string;startedAt:string;updatedAt:string;subjects:Subject[];survey:{answers:Record<string,number|string>;korean:KoreanRecord[];csatExperience:boolean|null;submittedAt?:string};answers:Record<string,DiagnosticAnswer>;submissions:Record<string,string>;reviews:Record<string,DiagnosticReview>;completedAt?:string;finalizedAt?:string};
export const sectionKey=(subject:Subject,section:Section)=>`${subject}-${section}`;
export const questionIds=(subject:Subject,section:Section)=>Array.from({length:SUBJECTS.find(s=>s.id===subject)![section]},(_,i)=>`${subject}-${section}-${i+1}`);
export const allQuestionIds=(d:DiagnosticState)=>d.subjects.flatMap(s=>questionIds(s,'concept').concat(questionIds(s,'application')));
export const diagnosticComplete=(s:Student)=>s.diagnostic?.version===DIAGNOSTIC_VERSION?!!s.diagnostic.completedAt:!!s.surveyAt;
export function newDiagnostic(subjects:Subject[],now=new Date().toISOString()):DiagnosticState{return {version:DIAGNOSTIC_VERSION,startedAt:now,updatedAt:now,subjects,survey:{answers:{},korean:[],csatExperience:null},answers:{},submissions:{},reviews:{}};}
export const hasAnswer=(a?:DiagnosticAnswer)=>!!a&&(a.unknown||!!a.text.trim()||a.files.length>0);
export function surveyMissing(d:DiagnosticState){return ORIGINAL_SURVEY.filter(q=>{
 if(q.id==='OMD-041'&&d.survey.csatExperience===false)return false;
 const a=d.survey.answers[q.id];if(q.id==='OMD-024'&&a===0)return false;return q.type==='text'?typeof a!=='string'||!a.trim():typeof a!=='number'||!Number.isInteger(a)||a<1||a>5;
 });}
export function originalItemScore(d:DiagnosticState,id:string){const q=ORIGINAL_SURVEY.find(x=>x.id===id),a=d.survey.answers[id];if(!q?.ideal.length||!q.groups.length||typeof a!=='number'||(id==='OMD-041'&&d.survey.csatExperience===false))return null;return 5-Math.min(...q.ideal.map(n=>Math.abs(n-a)));}
export function originalGroupScore(d:DiagnosticState,group:string){const rows=ORIGINAL_SURVEY.filter(q=>q.groups.includes(group)&&!(q.id==='OMD-041'&&d.survey.csatExperience===false));const values=rows.map(q=>originalItemScore(d,q.id)).filter((x):x is number=>x!==null);if(!rows.length||values.length!==rows.length)return null;return Math.round((values.reduce((a,b)=>a+b,0)/values.length-1)*25)/10;}
export function originalPotential(d:DiagnosticState){
 const records=d.survey.korean.filter(x=>['수능','평가원','교육청'].includes(x.exam)&&x.grade>=1&&x.grade<=9&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
 const dates=records.map(x=>`${x.date} ${x.exam} ${x.grade}등급`).join(' · ');
 if(records.length&&records.every(x=>x.grade<=2))return {label:'상',reason:dates,provisional:records.length<2};
 if(records.length>=2&&records.every(x=>x.grade<=3)&&records.some(x=>x.grade<=2)&&records.some(x=>x.grade===3))return {label:'중상',reason:`공식 국어 1~3등급 기복 · ${dates}`,provisional:false};
 const answers=['025','026','027','028'].map(n=>d.survey.answers['OMD-'+n]);const complete=answers.every(x=>typeof x==='number'&&x>=1&&x<=5);const positive=answers.filter(x=>typeof x==='number'&&x>=4).length;
 return {label:complete?(positive===4?'중상':positive>=2?'중':'판단 보류'):'판단 보류',reason:`${complete?`보조 4항목 중 긍정 근거 ${positive}개`:'보조 항목 응답을 더 확인합니다'}${dates?' · '+dates:''}`,provisional:!complete};
}
export function diagnosticSelfAwareness(d:DiagnosticState){const a=d.survey.answers['OMD-001'];return {answer:typeof a==='number'?ORIGINAL_SURVEY[0].choices[a-1]:'미응답',weakness:String(d.survey.answers['OMD-002']??''),strength:String(d.survey.answers['OMD-003']??''),text:'자기 인식은 점수에 반영하지 않습니다. 아래 응답과 영역별 근거의 일치 여부를 상담에서 함께 확인합니다.'};}
export function originalNarrative(s:Student){
 const d=s.diagnostic!;
 const specs=[{id:'L3',type:'개념 이해 보완',title:'정의와 조건을 내 말로 설명하는 것부터 시작해요.',action:'검사에서 부족했던 개념의 정의·조건·원리를 정리하고 짧은 적용 문제로 확인합니다.',service:'필요한 선수 테마부터 배정하고 강의·필기와 TEST를 연결합니다.'},{id:'L4',type:'풀이 접근 훈련',title:'조건을 정리하고 풀이를 선택한 이유를 설명해 봐요.',action:'종이에 조건 정리와 구하는 것을 먼저 쓰고, 풀이 선택 이유를 해설쓰기로 설명합니다.',service:'강사에게 설명을 들은 문제를 다시 설명하고 새 문제에 적용하도록 연결합니다.'},{id:'G1',type:'태도와 실행 점검',title:'오늘 할 공부를 시작하고 끝내는 경험을 쌓아가요.',action:'하루 분량과 시작 시각을 정하고, 피드백에서 바꿀 행동 한 가지를 오늘 실행합니다.',service:'오늘 할 일과 제출 확인을 통해 계획의 실행을 함께 점검합니다.'},{id:'G2',type:'생활 리듬 점검',title:'공부가 이어지는 수면과 기상 리듬부터 만들어요.',action:'충분한 수면 시간을 확보하고 기상·취침·공부 시작 시간을 일정하게 정합니다.',service:'기상 인증과 매일 과제를 같은 학습표에서 확인합니다.'},{id:'P5',type:'실수 관리 보완',title:'실수가 생기는 지점에 나만의 점검 방법을 놓아요.',action:'자주 하는 실수를 하나 고르고, 풀이 중 점검할 위치와 확인 방법을 정합니다.',service:'30문제·해설쓰기·TEST에서 점검 방법을 적용하고 피드백을 받습니다.'},{id:'P6',type:'시험운용 훈련',title:'막히는 문제에서 넘어갈 기준과 검토 시간을 정해요.',action:'TEST에서 문제 전환 기준과 검토 시간을 정하고 시험 뒤 실제 사용 여부를 확인합니다.',service:'테마 TEST의 점수와 풀이 기록을 바탕으로 시험운용을 연습합니다.'}];
 const score=(id:string)=>id==='L3'?s.assessment.content:id==='L4'?s.assessment.action:originalGroupScore(d,id);
 const evidence=(id:string)=>{if(id.startsWith('L'))return `선생님 평가 ${score(id)} / 10 · ${s.assessment.note}`;const low=ORIGINAL_SURVEY.filter(q=>q.groups.includes(id)&&originalItemScore(d,q.id)!==null).sort((a,b)=>originalItemScore(d,a.id)!-originalItemScore(d,b.id)!)[0];return low?`설문 「${low.text}」에 ‘${low.choices[Number(d.survey.answers[low.id])-1]}’라고 응답했습니다.`:'아직 응답을 확인하고 있습니다.';};
 const ranked=specs.filter(x=>score(x.id)!==null).sort((a,b)=>score(a.id)!-score(b.id)!);
 const first=ranked[0];const needs=first&&score(first.id)!<7;
 const primary={type:needs?first.type:'강점을 이어가는 학습',title:needs?first.title:'확인한 강점을 매일의 공부로 이어가요.',evidence:first?evidence(first.id):'설문과 주관식 검사가 완료되면 시작점을 더 구체적으로 확인합니다.',meaning:needs?'응답과 검사에서 확인한 영역 중 우선 확인할 부분입니다. 실제 시작 범위는 담당 선생님과 정합니다.':'개념과 풀이 수준, 생활 리듬을 함께 확인하며 나에게 필요한 공부를 이어갑니다.',action:needs?first.action:'검사에서 확인한 시작 테마를 배정받고 오늘의 학습과 제출을 이어갑니다.',risk:needs?'확인한 한 가지 행동을 다음 공부부터 직접 실행하고 피드백을 받아 보세요.':'지금의 좋은 습관을 이어가며 새로운 문제에서도 같은 방식으로 적용해 보세요.',service:needs?first.service:'수준에 맞는 테마·매일 과제·TEST로 학습의 변화를 확인합니다.'};
 const strengths=[{id:'OMD-007',title:'적극적으로 질문하려는 태도',text:'모르는 지점을 구체적으로 질문하고 풀이를 이어가는 데 활용합니다.'},{id:'OMD-011',title:'시작한 일을 끝내려는 태도',text:'하루의 공부를 제출까지 마치는 힘으로 연결합니다.'},{id:'OMD-028',title:'다른 사람에게 설명하는 즐거움',text:'강사에게 배운 풀이를 내 말로 설명하는 해설쓰기에 활용합니다.'},{id:'OMD-051',title:'일정한 생활 리듬',text:'확보된 공부 시간에 매일의 과제를 배치합니다.'}].filter(x=>Number(d.survey.answers[x.id])>=4).slice(0,2).map(x=>({...x,evidence:`설문 「${ORIGINAL_SURVEY.find(q=>q.id===x.id)!.text}」에 긍정적으로 응답했습니다.`}));
 const second=ranked[1];return {primary,secondary:second&&score(second.id)!<7?{title:`함께 확인할 부분 · ${second.type}`,text:second.action}:null,strengths};
}
export function safeDiagnostic(d:DiagnosticState|undefined,visible:boolean){if(!d||visible)return d;return {...d,reviews:{},finalizedAt:undefined};}
export const canEditDiagnostic=(v:Viewer)=>['admin','manager','teacher','student'].includes(v.role);
export function updateDiagnostic(s:Student,b:Record<string,unknown>,viewer:Viewer,workspaceId:string,now=new Date().toISOString()){
 function fail(m:string):never{throw new Error(m);}
 const op=String(b.operation),staff=['admin','manager','teacher'].includes(viewer.role);
 if(!canEditDiagnostic(viewer))fail('학생 또는 담당 선생님만 진단 기록을 작성할 수 있어요.');
 if(op==='start'){
  if(s.diagnostic)fail('이미 시작한 진단검사를 이어서 진행해 주세요.');
  const subjects=Array.isArray(b.subjects)?[...new Set(b.subjects)] as Subject[]:[];
  if(!subjects.length||subjects.some(x=>!SUBJECTS.some(y=>y.id===x)))fail('검사할 과목을 한 개 이상 선택해 주세요.');
  delete s.diagnosticReport;delete s.reportGuidance;delete s.approvedDiagnostic;s.diagnostic=newDiagnostic(subjects,now);s.assessment={content:null,action:null,note:''};delete s.surveyAt;return;
 }
 const d=s.diagnostic;if(!d||d.version!==DIAGNOSTIC_VERSION)fail('먼저 검사 과목을 선택해 주세요.');
 if(op==='survey'){
  if(d.survey.submittedAt)fail('완료한 설문은 담당 선생님에게 수정 요청해 주세요.');
  const incoming=b.answers;if(incoming&&typeof incoming==='object'&&!Array.isArray(incoming))for(const [id,value] of Object.entries(incoming)){
   const q=ORIGINAL_SURVEY.find(q=>q.id===id);if(!q)fail('설문 문항을 확인해 주세요.');
   if(q.type==='text'){if(typeof value!=='string'||value.length>2000)fail('서술 응답은 2,000자 이하로 적어 주세요.');d.survey.answers[id]=value;}
   else {if(typeof value!=='number'||!Number.isInteger(value)||value<(id==='OMD-024'?0:1)||value>5)fail('응답을 1~5 중에서 선택해 주세요.');d.survey.answers[id]=value;}
  }
  if(b.csatExperience!==undefined){if(typeof b.csatExperience!=='boolean')fail('실제 수능 응시 경험을 선택해 주세요.');d.survey.csatExperience=b.csatExperience;}
  if(b.korean!==undefined){if(!Array.isArray(b.korean)||b.korean.length>3)fail('공식 국어 성적은 최대 3회입니다.');const seen=new Set<string>();d.survey.korean=b.korean.map(x=>{const r=x as KoreanRecord;if(!['수능','평가원','교육청'].includes(r.exam)||!Number.isInteger(r.grade)||r.grade<1||r.grade>9||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(Date.parse(r.date))||new Date(r.date+'T12:00:00Z').toISOString().slice(0,10)!==r.date||r.date>now.slice(0,10)||seen.has(r.date))fail('국어 시험 종류·실제 응시일·1~9등급을 확인해 주세요. 같은 시험일은 한 번만 입력할 수 있어요.');seen.add(r.date);return {exam:r.exam,date:r.date,grade:r.grade};});}
  if(b.complete===true){const missing=surveyMissing(d);if(d.survey.csatExperience===null)fail('실제 수능 응시 경험을 선택해 주세요.');if(missing.length)fail(`${missing[0].number}번부터 미응답 ${missing.length}개를 확인해 주세요.`);d.survey.submittedAt=now;}
 }else if(op==='answer'){
  const id=String(b.questionId);if(!allQuestionIds(d).includes(id))fail('선택한 과목의 문항만 작성할 수 있어요.');
  const key=id.slice(0,id.lastIndexOf('-'));if(d.submissions[key])fail('제출한 답안은 담당 선생님에게 수정 요청해 주세요.');
  const text=typeof b.text==='string'?b.text:fail('답안을 확인해 주세요.');if(text.length>6000)fail('문항별 답안은 6,000자 이하입니다.');
  if(!Array.isArray(b.files)||b.files.length>5)fail('사진·PDF는 문항마다 최대 5개입니다.');
  const files=b.files.map(x=>{const f=x as Attachment;if(!f||typeof f.key!=='string'||!f.key.startsWith(`${workspaceId}/diagnostics/${s.id}/`)||!['application/pdf','image/jpeg','image/png','image/webp'].includes(f.type)||!Number.isInteger(f.size)||f.size<1||f.size>12*1024*1024||typeof f.name!=='string'||f.name.length>150)fail('이 학생의 진단검사에 업로드한 사진·PDF만 연결할 수 있어요.');return {key:f.key,name:f.name,size:f.size,type:f.type};});
  d.answers[id]={text,unknown:b.unknown===true,files,updatedAt:now};
 }else if(op==='submit'){
  const subject=b.subject as Subject,section=b.section as Section;if(!d.subjects.includes(subject)||!['concept','application'].includes(section))fail('제출할 과목과 영역을 확인해 주세요.');
  if(!d.survey.submittedAt)fail('설문을 먼저 완료해 주세요.');
  const ids=questionIds(subject,section),missing=ids.filter(id=>!hasAnswer(d.answers[id]));if(missing.length)fail(`답하지 않은 문항이 ${missing.length}개예요. 모르겠는 문제는 ‘아직 모르겠어요’를 선택해 주세요.`);
  d.submissions[sectionKey(subject,section)]=now;
 }else if(op==='reopen'){
  if(!staff)fail('담당 선생님만 제출을 다시 열 수 있어요.');
  if(b.part==='survey')delete d.survey.submittedAt;else {const subject=b.subject as Subject,section=b.section as Section;if(!d.subjects.includes(subject)||!['concept','application'].includes(section))fail('영역을 확인해 주세요.');delete d.submissions[sectionKey(subject,section)];for(const id of questionIds(subject,section))delete d.reviews[id];}
  delete d.completedAt;delete d.finalizedAt;s.assessment={content:null,action:null,note:''};delete s.surveyAt;
 }else if(op==='review'){
  if(!staff)fail('담당 선생님만 채점할 수 있어요.');const id=String(b.questionId);if(!allQuestionIds(d).includes(id)||!d.submissions[id.slice(0,id.lastIndexOf('-'))])fail('제출된 문항만 채점할 수 있어요.');
  if(!['correct','partial','incorrect'].includes(String(b.rating)))fail('정답·부분 이해·보완 필요 중에서 선택해 주세요.');
  if(d.finalizedAt){s.assessment={content:null,action:null,note:''};}
  d.reviews[id]={rating:b.rating as DiagnosticReview['rating'],note:String(b.note??'').slice(0,2000),reviewer:viewer.name,reviewedAt:now};delete d.finalizedAt;
 }else if(op==='finalize'){
  if(viewer.role!=='admin')fail('원장만 최종 평가를 확정할 수 있어요.');if(!d.completedAt||allQuestionIds(d).some(id=>!d.reviews[id]))fail('설문과 선택한 과목의 모든 제출·채점을 마친 뒤 확정해 주세요.');
  const content=b.content,action=b.actionScore;if(typeof content!=='number'||typeof action!=='number'||![content,action].every(x=>Number.isFinite(x)&&x>=0&&x<=10))fail('개념 이해와 풀이 접근을 각각 0~10점으로 입력해 주세요.');
  const note=String(b.note??'').trim().slice(0,2500);if(!note)fail('관찰 근거와 첫 지도 방향을 적어 주세요.');s.assessment={content,action,note,reviewedAt:now};d.finalizedAt=now;
 }else fail('진단 작업을 확인해 주세요.');
 d.updatedAt=now;
 if(d.survey.submittedAt&&d.subjects.every(sub=>['concept','application'].every(sec=>d.submissions[sectionKey(sub,sec as Section)]))){d.completedAt??=now;s.surveyAt=d.completedAt;}
}
