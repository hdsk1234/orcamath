import {addDays,todayKST,makeStudent,QUESTION_ROWS,stageId,type Student,type Workspace} from './domain.ts';

export const TEACHERS=[{id:'director',name:'대표원장'},{id:'kang',name:'강신의'},{id:'song',name:'송서균'},{id:'eo',name:'어동선'},{id:'byun',name:'변지석'}];
export type CourseMode='online'|'director'|'teacher';
export type SessionStatus='scheduled'|'completed'|'excused'|'no_show';
export type LessonSession={id:string;date:string;time:string;status:SessionStatus;reason?:string;noticeAt?:string;makeupBooked?:boolean;makeupDate?:string;makeupTime?:string;makeupCompleted?:boolean};
export type BillingProfile={teacherId:string;mode:CourseMode;cycleNumber:number;discountPercent:number;normalFee?:number;startDate:string;endDate:string;sessions:LessonSession[];received:number;refund:number;refundDate?:string;stopped?:boolean;paidOut?:number;settlementClosed?:boolean;settlementAmount?:number;scenario:string};
export const baseFee=(mode:CourseMode)=>mode==='online'?498000:mode==='director'?1200000:980000;
export const courseName=(mode:CourseMode)=>mode==='online'?'온라인':mode==='director'?'대면 · 원장':'대면 · 강사';
export const teacherName=(id:string)=>TEACHERS.find(t=>t.id===id)?.name??'미배정';
export const money=(amount:number)=>`${Math.round(amount).toLocaleString('ko-KR')}원`;
export function chargedFee(b:BillingProfile){return Math.round((b.normalFee??baseFee(b.mode))*(100-b.discountPercent)/100);}
export const countedSession=(s:LessonSession)=>s.status==='completed'||s.status==='no_show'||(s.status==='excused'&&s.makeupCompleted===true);
export function consumedSessions(b:BillingProfile){return b.sessions.filter(countedSession).length;}
export function nextDiscount(current:number,success:boolean){return success?Math.min(20,current+5):5;}
export function assignmentIds(b:BillingProfile){
 const ids:string[]=[];
 for(let date=b.startDate,n=0;date<=b.endDate&&n<366;date=addDays(date,1),n++)for(const kind of ['wake','problems','writing'])ids.push(`daily:${date}:${kind}`);
 return ids;
}
export function discountPreview(s:Student,today=todayKST()){
 const b=s.billing;if(!b)return null;
 const ids=assignmentIds(b),target=Math.ceil(ids.length*.8);
 let approved=0,pending=0,remaining=0,failed=0;
 for(const id of ids){const status=s.marks[id]?.status,date=id.split(':')[1];if(status==='approved'&&!s.marks[id]?.late)approved++;else if(status==='submitted'&&!s.marks[id]?.late)pending++;else if(date>=today)remaining++;else failed++;}
 const due=ids.filter(id=>id.split(':')[1]<today).length;
 const final=today>b.endDate&&pending===0;
 let state: 'automatic'|'safe'|'possible'|'unlikely'|'pending'|'stopped';
 if(b.stopped)state='stopped';else if(b.cycleNumber===1)state='automatic';else if(approved>=target)state='safe';else if(approved+remaining>=target)state='possible';else if(approved+remaining+pending>=target)state='pending';else state='unlikely';
 const successRate=ids.length?approved/ids.length*100:0;
 const successDiscount=b.cycleNumber===1?5:nextDiscount(b.discountPercent,true),failureDiscount=5;
 const expectedDiscount=b.cycleNumber===1?5:final||state==='safe'||state==='unlikely'?nextDiscount(b.discountPercent,approved>=target):null;
 return {total:ids.length,target,approved,pending,remaining,failed,due,successRate,final,state,successDiscount,failureDiscount,expectedDiscount,nextFee:expectedDiscount===null?null:Math.round((b.normalFee??baseFee(b.mode))*(100-expectedDiscount)/100),needed:Math.max(0,target-approved)};
}
export const DISCOUNT_LABELS={automatic:'두 번째 수강 5% 확정',safe:'할인 안정권',possible:'달성 가능',unlikely:'5% 복귀 예상',pending:'조교 확인 필요',stopped:'중도 종료'};
export const teacherRate=(teacherId:string)=>teacherId==='byun'?.35:.5;
export function financials(b:BillingProfile){
 const charged=chargedFee(b),consumed=consumedSessions(b),net=Math.max(0,b.received-b.refund);
 const service=b.stopped?net:Math.min(net,Math.round(charged*consumed/8));
 // Online and the director's own face-to-face courses have no external payout.
 const external=b.mode==='teacher'&&b.teacherId!=='director';
 const estimatedTeacher=external?Math.floor(service*teacherRate(b.teacherId)):0;
 const teacher=external?(b.settlementClosed?b.settlementAmount??estimatedTeacher:estimatedTeacher):0;
 const paid=b.paidOut??0;
 return {charged,consumed,received:b.received,refund:b.refund,net,unpaid:Math.max(0,charged-b.received),service,advance:Math.max(0,net-service),teacher,paid,payable:Math.max(0,teacher-paid),excessPaid:Math.max(0,paid-teacher),owner:service-teacher,external};
}
export function teacherSummary(students:Student[],teacherId:string){
 const rows=students.filter(s=>s.billing?.teacherId===teacherId),sum={received:0,refund:0,net:0,service:0,advance:0,teacher:0,paid:0,payable:0,owner:0,unpaid:0};
 for(const s of rows){const f=financials(s.billing!);for(const key of Object.keys(sum) as (keyof typeof sum)[])sum[key]+=f[key];}
 return {students:rows,...sum};
}

// Demonstration records only. One-time installation preserves non-demo students.
export function installBillingExamples(w:Workspace,today=todayKST()){
 if(w.billingExampleVersion===1)return false;
 const specs: [string,string,CourseMode,number,number,number,number,number,string][]=[
  ['김하준','kang','teacher',4,15,6,24,70,'남은 과제를 놓쳐도 80% 유지 · 할인 안정권'],
  ['이서윤','kang','teacher',3,10,4,18,30,'과제 누락으로 다음 수강료 5% 복귀 예상'],
  ['박민재','kang','teacher',2,5,3,11,25,'24시간 전 통보 결석 · 별도 TEST 보강 예약'],
  ['이지후','song','teacher',1,0,1,3,7,'첫 수강 · 다음 수강은 조건 없이 5% 할인'],
  ['정하윤','song','teacher',5,20,8,28,68,'80% 이상으로 최대 할인 유지 · 후불 정산 대기'],
  ['최도윤','song','teacher',4,15,7,28,65,'조교 확인 3개가 할인 여부를 결정하는 상황'],
  ['한서진','eo','teacher',3,10,5,18,43,'무단취소 1회 포함 · 보강 없이 회차 차감'],
  ['윤지우','eo','teacher',4,15,3,14,24,'3회 진행 후 중도 환불 · 잔액 정산 확정'],
  ['임수빈','eo','teacher',5,20,8,28,72,'8회 완료 · 20% 유지 · 강사 지급 완료'],
  ['오유진','director','director',5,20,7,25,70,'원장 대면 · 20% 할인 안정권'],
  ['배현우','director','director',2,5,4,15,37,'당일 질병 인정 · 별도 TEST 보강 예약'],
  ['신예린','director','director',3,10,8,28,55,'성사율 80% 미달 · 다음 5%로 재시작'],
  ['문태오','director','online',1,0,1,3,5,'온라인 신규 · 다음 수강료 473,100원'],
  ['장다은','director','online',2,5,4,15,38,'온라인 · 10% 할인 달성 가능'],
  ['권시우','director','online',4,15,6,24,70,'온라인 · 20% 할인 안정권 · 원장 100%'],
  ['조아린','director','online',5,20,8,28,60,'온라인 · 과제 미달로 다음 할인 5% 복귀'],
  ['홍준서','director','online',3,10,4,16,29,'온라인 4회 후 환불 · 강사 지급 없음']
 ];
 specs.forEach(([name,teacherId,mode,cycleNumber,discountPercent,consumed,elapsed,approvedCount,scenario],i)=>{
  const id=i<3?`sample-${i+1}`:`billing-demo-${i+1}`;
  if(w.students.some(s=>s.id===id&&!s.demo))return;
  const s=w.students.find(s=>s.id===id)??makeStudent(name,id,true,today);
  const startDate=addDays(today,-elapsed),endDate=addDays(startDate,27);
  const sessions=Array.from({length:8},(_,n)=>({id:`${id}-session-${n+1}`,date:addDays(startDate,[0,3,7,10,14,17,21,24][n]),time:'19:00',status:n<consumed?'completed':'scheduled'} as LessonSession));
  const b:BillingProfile={teacherId,mode,cycleNumber,discountPercent,startDate,endDate,sessions,received:0,refund:0,paidOut:0,scenario};
  b.received=chargedFee(b);
  if(i===2||i===10){sessions[2]={...sessions[2],status:'excused',reason:i===2?'24시간 이전 통보':'당일 질병 · 원장 인정',noticeAt:`${addDays(sessions[2].date,i===2?-2:0)}T09:00:00+09:00`,makeupDate:addDays(today,2),makeupTime:'16:00',makeupCompleted:false};}
  if(i===6)sessions[3]={...sessions[3],status:'no_show',reason:'연락 없이 취소 · 보강 없음'};
  if(i===7||i===16){b.stopped=true;b.refundDate=today;b.refund=b.received-Math.round(chargedFee(b)*consumed/8);b.settlementClosed=true;b.settlementAmount=mode==='teacher'?Math.floor((b.received-b.refund)/2):0;}
  if(i===8){b.settlementClosed=true;b.settlementAmount=Math.floor(b.received/2);b.paidOut=b.settlementAmount;}
  s.billing=b;s.name=name;s.demo=true;s.startDate=startDate;s.writingCount=i%5===0?3:1;s.selected=i%3===1?['c-3','c-4','c-6','c-7']:['h-1','h-3','h-4','h-5'];
  for(const q of QUESTION_ROWS)s.answers[q[0]]=q[3]===5?4:2;
  s.surveyAt??=new Date().toISOString();s.korean=i%3===0?[1,2,2]:[3,3,4];s.potential=[4,3,4,2];
  s.assessment={content:4+i%5,action:3+i%4,note:`가상 사례 · ${scenario}`};
  const ids=assignmentIds(b);ids.forEach((taskId,n)=>{
   if(n<approvedCount)s.marks[taskId]={status:'approved',value:taskId.endsWith('problems')?29:taskId.endsWith('wake')?'07:00':s.writingCount,reviewer:'샘플 조교'};
   else if(i===5&&n<approvedCount+3)s.marks[taskId]={status:'submitted',submittedAt:new Date().toISOString(),note:'가상 제출 · 확인 대기'};
   else if(taskId.split(':')[1]<today)s.marks[taskId]={status:'missed',note:'가상 미완료 기록'};
   else delete s.marks[taskId];
  });
  for(let n=0;n<Math.min(3,Math.floor(consumed/2));n++)for(const kind of ['test','lecture','practice']){
   const theme=w.themes.find(t=>t.id===s.selected[n]);if(theme&&(kind!=='practice'||theme.practice))s.marks[stageId(theme.id,kind)]={status:'approved',...(kind==='test'?{score:60+i%4*8}:{})};
  }
  if(!w.students.some(x=>x.id===id))w.students.push(s);
 });
 w.billingExampleVersion=1;return true;
}
