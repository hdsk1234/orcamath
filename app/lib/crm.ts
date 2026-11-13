import {addDays,makeStudent,todayKST,QUESTION_ROWS,type Student,type Viewer,type Workspace} from './domain.ts';
import {baseFee,chargedFee,type CourseMode} from './billing.ts';
import {captureFirstEnrollment} from './admissions.ts';

export const SOURCES=['홈페이지','김과외','블로그','유튜브','인스타','지인소개','기타'] as const;
export type LeadStage='new'|'contacted'|'phone_booked'|'phone_done'|'face_booked'|'diagnosis'|'consult_done'|'enrolled'|'closed';
export const LEAD_STAGES:Record<LeadStage,string>={new:'상담 전 고객 대기',contacted:'문자·연락 기록',phone_booked:'전화 약속',phone_done:'전화 상담 완료 · 전환 대기',face_booked:'대면 상담 예약',diagnosis:'진단검사 진행 · 상담 대기',consult_done:'대면 상담 완료 · 전환 대기',enrolled:'등록 완료',closed:'종료'};
export type Admission={leadId:string;mode:'online'|'face';consultantId:'byun';stage:'diagnosis'|'awaiting_consult'|'awaiting_payment'|'regular';resultReleased:boolean;tuitionVerifiedAt?:string;regularStart?:string};
export type Lead={id:string;name:string;studentName:string;phone:string;source:typeof SOURCES[number];intake:'website'|'manual';mode:'online'|'face'|'undecided';grade:string;region:string;note:string;stage:LeadStage;consultantId:'byun';createdAt:string;updatedAt:string;inquiryDate:string;lastContact?:string;nextAction?:string;nextAt?:string;phoneDoneAt?:string;faceDoneAt?:string;enrolledAt?:string;closedReason?:string;studentId?:string;consultFee:number;consultReceived:number;consultPaidAt?:string;demo?:boolean;submissionKey?:string;payloadHash?:string;intakeHash?:string;consentAt?:string;history:{at:string;actor:string;note:string}[]};
export const regularStudent=(s:Student)=>!s.admission||s.admission.stage==='regular';
export const diagnosticAccess=(v:Viewer,s:Student)=>['admin','manager'].includes(v.role)||(v.role==='teacher'&&((v.studentIds??[]).includes(s.id)||(v.teacherId==='byun'&&s.admission?.consultantId==='byun'&&!regularStudent(s))))||(['student','parent'].includes(v.role)&&v.studentId===s.id);
export const reportVisible=(v:Viewer,s:Student)=>diagnosticAccess(v,s)&&(['admin','manager','teacher'].includes(v.role)||!s.admission||s.admission.mode==='online'||s.admission.resultReleased);
export const crmAccess=(v:Viewer)=>['admin','manager'].includes(v.role)||(v.role==='teacher'&&v.teacherId==='byun');
export function normalizePhone(v:unknown){const phone=String(v??'').replace(/[\s()-]/g,'');if(!/^01[016789]\d{7,8}$/.test(phone))throw new Error('연락받을 휴대전화 번호를 확인해 주세요.');return phone;}
export const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function newLead(input:Record<string,unknown>,intake:Lead['intake'],now=new Date().toISOString()):Lead{
 const clean=(x:unknown,n=1000)=>typeof x==='string'?x.trim().slice(0,n):'';
 const source=clean(input.source,20),mode=clean(input.mode,20),date=clean(input.inquiryDate,10)||todayKST();if(!validDate(date)||date>todayKST())throw new Error('문의 날짜를 확인해 주세요.');
 return {id:crypto.randomUUID(),name:clean(input.name,40)||'이름 미입력',studentName:clean(input.studentName,40),phone:normalizePhone(input.phone),source:SOURCES.includes(source as any)?source as Lead['source']:'홈페이지',intake,mode:mode==='online'||mode==='face'?mode:'undecided',grade:clean(input.grade,20),region:clean(input.region,100),note:clean(input.note),stage:'new',consultantId:'byun',createdAt:now,updatedAt:now,inquiryDate:date,consultFee:99000,consultReceived:0,history:[{at:now,actor:intake==='website'?'홈페이지':'담당자',note:'상담 신청 접수'}]};
}
export function recordLead(l:Lead,actor:string,note:string,now=new Date().toISOString()){l.updatedAt=now;l.history.push({at:now,actor,note});if(l.history.length>200)throw new Error('기록이 많습니다. 원장에게 고객 기록 정리를 요청해 주세요.');}
export function connectDiagnostic(w:Workspace,l:Lead){
 if(l.mode==='undecided')throw new Error('온라인 또는 대면을 먼저 정해 주세요.');
 if(!l.phoneDoneAt)throw new Error('전화 상담 완료를 먼저 기록해 주세요.');
 if(l.mode==='face'&&(!l.consultPaidAt||l.consultReceived<l.consultFee))throw new Error('상담료 실제 수납 확인 후 진단 계정을 연결할 수 있어요.');
 if(l.mode==='online'&&!l.studentId)throw new Error('온라인은 첫 수강료 선납 확인 후 진단 계정을 연결합니다.');
 let s=w.students.find(s=>s.id===l.studentId);if(!s){if(w.students.length>=500)throw new Error('학생 기록 한도입니다. 원장에게 확인해 주세요.');if(!l.studentName)throw new Error('실제 학생 이름을 입력해 주세요.');s=makeStudent(l.studentName,crypto.randomUUID(),!!l.demo);s.grade=l.grade||s.grade;s.selected=[];s.admission={leadId:l.id,mode:'face',consultantId:'byun',stage:'diagnosis',resultReleased:false};w.students.push(s);l.studentId=s.id;}
 if(!s.admission||s.admission.leadId!==l.id)throw new Error('다른 학생 또는 고객에 연결된 계정입니다.');l.stage='diagnosis';return s;
}
export function enrollLead(w:Workspace,l:Lead,input:Record<string,unknown>,now=new Date().toISOString()){
 if(l.enrolledAt)throw new Error('이미 첫 수강료를 확인한 고객입니다.');if(!l.phoneDoneAt)throw new Error('전화 상담 완료를 먼저 기록해 주세요.');
 if(l.mode==='face'&&!l.faceDoneAt)throw new Error('대면 상담 완료·결과 공개 후 정규 등록할 수 있어요.');if(l.mode==='undecided')throw new Error('수업 형태를 선택해 주세요.');
 const mode=(l.mode==='online'?'online':input.courseMode==='director'?'director':'teacher') as CourseMode,teacherId=mode==='teacher'?String(input.teacherId??'byun'):'director',start=String(input.startDate??'');
 if(!['byun','kang','song','eo','director'].includes(teacherId)||(mode==='teacher'&&teacherId==='director')||!validDate(start)||start<addDays(todayKST(),-365)||start>addDays(todayKST(),365))throw new Error('담당 강사와 정규 시작일을 확인해 주세요.');
 const received=Number(input.received);if(received!==baseFee(mode))throw new Error('첫 8회 정상 수강료 전액 선납을 확인해 주세요. 상담료는 별도입니다.');
 let s=w.students.find(s=>s.id===l.studentId);if(!s){if(l.mode==='face')throw new Error('진단 계정을 먼저 연결해 주세요.');if(!l.studentName)throw new Error('학생 이름을 입력해 주세요.');s=makeStudent(l.studentName,crypto.randomUUID(),!!l.demo);s.selected=[];s.admission={leadId:l.id,mode:'online',consultantId:'byun',stage:'diagnosis',resultReleased:true};w.students.push(s);l.studentId=s.id;}
 if(!s.admission||s.admission.leadId!==l.id||s.billing)throw new Error('이미 수강 정보가 있거나 다른 고객에 연결된 학생입니다.');
 s.billing={mode,teacherId,normalFee:baseFee(mode),cycleNumber:1,discountPercent:0,startDate:start,endDate:addDays(start,27),sessions:Array.from({length:8},(_,n)=>({id:crypto.randomUUID(),date:addDays(start,n*3),time:s!.zoomTime,status:'scheduled'})),received,refund:0,scenario:'상담 고객 정규 등록 · 선납 확인'};
 s.tutorial={eligible:true,readSteps:[]};s.beginner=input.beginner===true;s.startDate=start;s.admission.tuitionVerifiedAt=now;s.admission.regularStart=start;s.admission.stage=s.surveyAt?'regular':'diagnosis';l.stage='enrolled';l.enrolledAt=now;
 const existing=w.salesConsultations?.find(c=>c.studentId===s!.id);if(existing)throw new Error('이 학생의 첫 달 상담 수수료 기록이 이미 있습니다.');
 (w.salesConsultations??=[]).push(captureFirstEnrollment({id:crypto.randomUUID(),studentId:s.id,consultantId:'byun',date:l.inquiryDate,note:`${l.source} · 고객함 등록 성사`,status:'done',mode,createdAt:now},s));return s;
}
export function finishDiagnostic(s:Student){if(!s.admission||s.admission.stage==='regular')return;if(s.admission.tuitionVerifiedAt&&s.billing&&s.billing.received-s.billing.refund>=chargedFee(s.billing)&&!s.billing.stopped&&(s.diagnostic?!!s.diagnostic.completedAt:!!s.surveyAt)){s.admission.stage='regular';s.startDate=s.admission.regularStart!;}else s.admission.stage=s.admission.mode==='face'?(s.admission.resultReleased?'awaiting_payment':'awaiting_consult'):'diagnosis';}
export function cohortStats(leads:Lead[]){const ratio=(n:number,d:number)=>d?Math.round(n/d*100):null,paid=leads.filter(l=>l.enrolledAt),online=leads.filter(l=>l.mode==='online'&&l.phoneDoneAt),face=leads.filter(l=>l.mode==='face'&&l.faceDoneAt);return {count:leads.length,enrolled:paid.length,pending:leads.filter(l=>!l.enrolledAt&&l.stage!=='closed').length,ghost:leads.filter(l=>l.closedReason==='연락두절').length,closed:leads.filter(l=>l.stage==='closed').length,conversion:ratio(paid.length,leads.length),onlineCount:online.length,onlinePaid:online.filter(l=>l.enrolledAt).length,onlineRate:ratio(online.filter(l=>l.enrolledAt).length,online.length),faceCount:face.length,facePaid:face.filter(l=>l.enrolledAt).length,faceRate:ratio(face.filter(l=>l.enrolledAt).length,face.length),consultRevenue:leads.reduce((n,l)=>n+l.consultReceived,0),meanDays:paid.length?Math.round(paid.reduce((n,l)=>n+(Date.parse(l.enrolledAt!)-Date.parse(l.inquiryDate))/86400000,0)/paid.length):null};}
export const CRM_EXAMPLE_VERSION=2;
export function installLeadExamples(w:Workspace){
 if((w.crmExampleVersion??0)>=CRM_EXAMPLE_VERSION)return;
 const today=todayKST(),at=(day:number,hour=14)=>`${addDays(today,day)}T${String(hour).padStart(2,'0')}:00:00+09:00`;
 const cases=[
  ['가상 이가온','undecided','new','홈페이지','고1','수업 구분 미정 · 수학 공부 방향을 먼저 상담하고 싶음','첫 안내 문자와 전화 가능 시간 확인'],
  ['가상 정하린','online','phone_done','김과외','고2','전화 상담 완료 · 온라인 등록 의사는 있으나 수강료 결제 대기','온라인 첫 수강료 선납 여부 확인'],
  ['가상 김도윤','face','face_booked','블로그','중3','전화 상담 후 대면 예약 · 상담료 아직 미수납','상담료 수납 확인 후 진단검사 안내'],
  ['가상 윤서아','face','diagnosis','인스타','고2','상담료 99,000원 수납 · 진단 완료 · 학생/학부모에게 결과 비공개','대면 상담 진행 후 진단 결과 공개'],
  ['가상 박태오','face','consult_done','지인소개','고3','대면 상담과 진단 결과 공개 완료 · 강사 수업 결제 고민 중','보호자에게 등록 결정 여부 확인'],
  ['가상 한지우','online','closed','유튜브','고1','전화 약속 후 불참 · 2회 연락에도 응답이 없어 연락두절 종료','다시 연락이 오면 기존 고객 다시 열기'],
  ['가상 최서윤','online','contacted','인스타','고2','안내 문자 발송 · 학부모가 학생과 상의 후 답변 예정','문자 답변 확인 후 전화 약속 잡기'],
  ['가상 임도현','face','phone_booked','기타','고1','오프라인 문의 · 대면 수업 관심 · 전화 가능 시간 확정','예약 시간에 전화 상담 진행'],
  ['가상 오지안','online','enrolled','홈페이지','고2','온라인 수강료 498,000원 선납 · 진단검사 진행 전 · 상담 수수료 99,600원','진단검사 완료 후 온라인 정규수업 시작'],
  ['가상 배준우','face','enrolled','지인소개','고1','노베 전용 대면 · 변지석 직접 상담·강의 · 선납 980,000원 · 상담 수수료 196,000원 + 강의 35% 후불','정규수업 2/8회 진행 · 다음 수업 준비'],
 ] as const;
 const list=w.leads??=[];
 for(let i=0;i<cases.length;i++){
  const [name,mode,stage,source,grade,note,nextAction]=cases[i],id=`crm-demo-${i}`,existing=list.find(l=>l.id===id);
  // Preserve real records and any sample the user has already enrolled.
  if(existing&&(!existing.demo||existing.enrolledAt))continue;
  const l=newLead({name,studentName:name,phone:`0100000${String(i+1).padStart(4,'0')}`,mode,source,grade,inquiryDate:addDays(today,-i-2)},i===0||i===8?'website':'manual',at(-i-2));
  l.id=id;l.demo=true;l.stage=stage;l.region=i%2?'서울':'경기';l.note=`가상 상담 예시 · 실제 연락 금지\n${note}`;l.nextAction=nextAction;l.studentId=existing?.studentId;
  if(i!==0){l.lastContact=at(-1);l.history.push({at:at(-1),actor:'변지석',note});}
  if([1,2,3,4,8,9].includes(i))l.phoneDoneAt=at(-i-1);
  if([2,3,4,6,7].includes(i))l.nextAt=`${addDays(today,i===4?1:0)}T${i===7?'18:30':'17:00'}`;
  if([3,4,9].includes(i)){
   l.consultReceived=99000;l.consultPaidAt=at(-i);const s=connectDiagnostic(w,l);
   s.grade=grade;s.surveyAt=at(-i+1);s.potential=[3,3,3,3];for(const q of QUESTION_ROWS)s.answers[q[0]]=q[3]===5?3:2;
   s.assessment={content:3,action:4,note:'가상 진단 결과 · 상담 단계에 따른 공개 여부 확인',reviewedAt:at(-i+1)};
   s.admission!.stage='awaiting_consult';
   if(i!==3){l.faceDoneAt=at(-i+2);l.stage='consult_done';s.admission!.resultReleased=true;s.admission!.stage='awaiting_payment';}
  }
  if(i===5)l.closedReason='연락두절';
  if(i===8||i===9){
   const s=enrollLead(w,l,{courseMode:i===8?'online':'teacher',teacherId:'byun',startDate:i===8?addDays(today,1):addDays(today,-6),received:i===8?498000:980000,beginner:i===9},at(i===8?-1:-6));
   s.grade=grade;s.billing!.scenario=note;
   if(i===9){s.selected=['h-1','h-2'];s.billing!.sessions.forEach((session,n)=>{if(n<2)session.status='completed';});}
  }
  if(existing)Object.assign(existing,l);else list.push(l);
 }
 w.crmExampleVersion=CRM_EXAMPLE_VERSION;
}
