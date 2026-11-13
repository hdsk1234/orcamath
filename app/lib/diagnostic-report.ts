import {diagnosis,QUESTION_ROWS,type Student,type Viewer,type Workspace} from './domain.ts';
import {DIAGNOSTIC_VERSION,ORIGINAL_SURVEY} from './diagnostic.ts';
import {diagnosticAccess,regularStudent,reportVisible,recordLead} from './crm.ts';
import {DIAGNOSTIC_GUIDES,REPORT_AREAS,REPORT_GUIDE_VERSION,type ReportAreaId} from './diagnostic-guides.ts';
export {REPORT_AREAS,DIAGNOSTIC_GUIDES};
export type ReportGuidance={priority:ReportAreaId|null;notes:Partial<Record<ReportAreaId,string>>;updatedAt:string;updatedBy:string};
export type GuideMatch={id:string;title:string;advice:string;basis:string;distance:number};
export type ReportArea={id:ReportAreaId;label:string;name:string;score:number|null;source:string;evidence:string;analysis?:string;action:string;matches:GuideMatch[];note:string;weakTopics:string[]};
export type DiagnosticReportData={studentId:string;name:string;version:string;guideVersion:string;ready:boolean;regular:boolean;example?:boolean;title:string;summary:string;type:string;sourceNote:string;areas:ReportArea[];priorities:ReportAreaId[];potential:{label:string;reason:string;provisional:boolean};strengths:string[];note:string;selfAwareness?:{answer:string;weakness:string;strength:string};history:{date:string;title:string;scores:string;notes:string[]}[]};
const areaIds=new Set<string>(REPORT_AREAS.map(x=>x.id));
export function reportReady(s:Student){if(s.approvedDiagnostic)return s.approvedDiagnostic.report.areas.every(a=>a.score!==null);const r=s.diagnosticReport??diagnosis(s);return !!s.surveyAt&&r.reviewed&&r.scores.every(x=>x.score!==null);}
export function reportAccess(v:Viewer,s:Student){return !diagnosticAccess(v,s)?'forbidden':!reportVisible(v,s)||s.resultWithheld?'withheld':!reportReady(s)?'pending':'ready';}
export function guideMatches(s:Student,id:ReportAreaId):GuideMatch[]{
 const d=s.diagnostic?.version===DIAGNOSTIC_VERSION?s.diagnostic:undefined;
 return DIAGNOSTIC_GUIDES[id].topics.flatMap(t=>{
  const candidates=d?t.items.flatMap(qid=>{const q=ORIGINAL_SURVEY.find(x=>x.id===qid),a=d.survey.answers[qid];if(!q?.ideal.length||typeof a!=='number'||a<1||a>5||(qid==='OMD-041'&&d.survey.csatExperience===false))return [];return [{distance:Math.min(...q.ideal.map(i=>Math.abs(i-a))),basis:`「${q.text}」에 ‘${q.choices[a-1]}’라고 응답했어요.`}];}):t.legacy.flatMap(qid=>{const q=QUESTION_ROWS.find(x=>x[0]===qid),a=s.answers[qid];return q&&typeof a==='number'?[{distance:Math.abs(q[3]-a),basis:`이전 설문의 「${q[1]}」 응답을 참고했어요.`}]:[];});
  const worst=candidates.sort((a,b)=>b.distance-a.distance)[0];return worst&&worst.distance>=2?[{id:t.id,title:t.title,advice:t.advice,...worst}]:[];
 }).sort((a,b)=>b.distance-a.distance);
}
export function buildDiagnosticReport(s:Student):DiagnosticReportData{
 if(s.resultWithheld)throw new Error('공개 전 결과는 구성할 수 없습니다.');
 if(s.approvedDiagnostic)return {...s.approvedDiagnostic.report,studentId:s.id,name:s.name,regular:regularStudent(s)};
 const r=s.diagnosticReport??diagnosis(s),d=s.diagnostic?.version===DIAGNOSTIC_VERSION?s.diagnostic:undefined;
 const areas:ReportArea[]=REPORT_AREAS.map(a=>{
  const value=r.scores.find(x=>x.id===a.id),score=value?.score??null,matches=guideMatches(s,a.id);
  const evidence=a.id==='L3'||a.id==='L4'?(s.assessment.note||'선생님이 실제 개념 설명과 풀이를 확인해 평가합니다.'):matches[0]?.basis??(score===null?'응답과 평가를 기다리고 있어요.':'이 영역의 설문 응답을 종합한 점수예요. 아래 가이드로 좋은 방향을 이어가세요.');
  const weakTopics=d&&(a.id==='L3'||a.id==='L4')?Object.entries(d.reviews).filter(([key,v])=>key.includes(a.id==='L3'?'-concept-':'-application-')&&v.rating!=='correct').slice(0,3).map(([key,v])=>`${key.startsWith('common')?'공통수학1':key.startsWith('algebra')?'대수':'미적분1'} ${a.id==='L3'?'개념':'문제'} ${key.split('-').at(-1)}번 · ${v.rating==='partial'?'부분 이해':'보완 필요'}${v.note?' · '+v.note:''}`):[];
  return {...a,score,source:value?.source??'평가 대기',evidence,action:matches[0]?.advice??DIAGNOSTIC_GUIDES[a.id].steps[0],matches,note:s.reportGuidance?.notes[a.id]??'',weakTopics};
 });
 const sorted=areas.filter(a=>a.score!==null&&a.score<7).sort((a,b)=>a.score!-b.score!),manual=s.reportGuidance?.priority;
 const priorities=[...(manual&&areas.some(a=>a.id===manual&&a.score!==null)?[manual]:[]),...sorted.map(a=>a.id)].filter((x,i,a)=>a.indexOf(x)===i).slice(0,3);
 return {studentId:s.id,name:s.name,version:d?.version??'legacy',guideVersion:REPORT_GUIDE_VERSION,ready:reportReady(s),regular:regularStudent(s),title:manual?DIAGNOSTIC_GUIDES[manual].principle:r.primary.title,summary:manual?`담당 선생님이 ${REPORT_AREAS.find(a=>a.id===manual)!.name}을 먼저 지도할 영역으로 정했어요. 아래의 추가 해결책과 함께 실천해 보세요.`:r.primary.meaning,type:manual?'담당자 지정 우선 지도':r.primary.type,sourceNote:d?'태도·습관·실수·시험운용은 원문 설문 응답, 내용·행동은 선생님의 주관식 평가를 반영했어요.':'기존 진단 기록의 점수를 유지했어요. 해결책은 원장님의 원문 설문 기준으로 안내해요.',areas,priorities,potential:r.potential,strengths:r.strengths.map(x=>x.title),note:s.assessment.note,selfAwareness:d?{answer:typeof d.survey.answers['OMD-001']==='number'?ORIGINAL_SURVEY[0].choices[Number(d.survey.answers['OMD-001'])-1]:'미응답',weakness:String(d.survey.answers['OMD-002']??''),strength:String(d.survey.answers['OMD-003']??'')}:undefined,history:(s.diagnosticHistory??[]).map(h=>({date:h.createdAt.slice(0,10),title:h.report.primary.title,scores:h.report.scores.map(a=>`${a.short} ${a.score??'평가 대기'}`).join(' · '),notes:Object.values(h.guidance?.notes??{})}))};
}
export function saveReportGuidance(s:Student,b:Record<string,unknown>,v:Viewer,now=new Date().toISOString()){
 if(!['admin','manager','teacher'].includes(v.role)||!diagnosticAccess(v,s))throw new Error('담당 선생님과 관리자만 해결책을 편집할 수 있어요.');
 const priority=b.priority===null||b.priority===''?null:b.priority;if(priority!==null&&(typeof priority!=='string'||!areaIds.has(priority)))throw new Error('우선 지도 영역을 확인해 주세요.');
 if(!b.notes||typeof b.notes!=='object'||Array.isArray(b.notes))throw new Error('영역별 안내를 확인해 주세요.');
 const notes:ReportGuidance['notes']={};for(const [key,value] of Object.entries(b.notes)){if(!areaIds.has(key)||typeof value!=='string'||value.length>2000)throw new Error('영역별 안내는 각 2,000자 이하로 적어 주세요.');if(value.trim())notes[key as ReportAreaId]=value.trim();}
 s.reportGuidance={priority:priority as ReportAreaId|null,notes,updatedAt:now,updatedBy:v.name};
}
export function requestReportConsultation(w:Workspace,s:Student,v:Viewer,now=new Date().toISOString()){
 if(reportAccess(v,s)!=='ready')throw new Error('공개된 본인 진단 결과에서 상담을 요청할 수 있어요.');
 const existing=w.consultations.find(c=>c.studentId===s.id&&c.status==='접수');if(existing)return {alreadyRequested:true};
 w.consultations.push({id:crypto.randomUUID(),studentId:s.id,note:`진단 결과의 개선 계획을 함께 시작하고 싶어요. 요청자: ${v.role==='parent'?'학부모':v.role==='student'?'학생':'담당자'} ${v.name}`,createdAt:now,status:'접수'});
 const lead=(w.leads??[]).find(l=>l.id===s.admission?.leadId&&l.studentId===s.id);if(lead){lead.nextAction='진단 결과 후 학습 계획 상담 요청 확인';recordLead(lead,v.name,'진단 결과에서 개선 계획 상담 요청',now);}
 return {alreadyRequested:false};
}
