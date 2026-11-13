import {addDays,makeStudent,todayKST,type Workspace,type Student} from './domain.ts';
import {baseFee,type CourseMode,type BillingProfile} from './billing.ts';
export type SaleConsultation={id:string;studentId:string;consultantId:'byun';date:string;note:string;status:'scheduled'|'done'|'enrolled';mode:CourseMode;firstNormalFee?:number;firstReceived?:number;firstRefund?:number;refundDecision?:'keep'|'waive';confirmedAmount?:number;paid?:number;firstCycleStart?:string;createdAt:string};
export function consultationFinancials(c:SaleConsultation){
 const eligible=c.status==='enrolled'&&(c.firstReceived??0)>0&&!!c.firstNormalFee;
 const refundPending=eligible&&(c.firstRefund??0)>0&&!c.refundDecision;
 const expected=eligible?Math.round(c.firstNormalFee!*.2):0;
 const amount=c.confirmedAmount??(c.refundDecision==='waive'?0:expected),paid=c.paid??0;
 return {eligible,refundPending,expected,amount,confirmed:c.confirmedAmount!==undefined,paid,payable:Math.max(0,amount-paid)};
}
export function consultationSummary(records:SaleConsultation[]){return records.reduce((a,c)=>{const f=consultationFinancials(c);a.expected+=f.expected;a.confirmed+=f.confirmed?f.amount:0;a.paid+=f.paid;a.payable+=f.confirmed?f.payable:0;a.pending+=f.refundPending?1:0;a.enrolled+=f.eligible?1:0;return a;},{expected:0,confirmed:0,paid:0,payable:0,pending:0,enrolled:0});}
export function captureFirstEnrollment(c:SaleConsultation,s:Student){
 const b=s.billing;if(!b||b.cycleNumber!==1||b.received<=0)throw new Error('첫 수강 주기의 실제 결제 내역이 필요합니다.');
 if(c.firstCycleStart&&c.firstCycleStart!==b.startDate)throw new Error('이미 기록한 첫 달 수강 정보가 있습니다.');
 return {...c,status:'enrolled' as const,mode:b.mode,firstNormalFee:c.firstNormalFee??b.normalFee??baseFee(b.mode),firstReceived:b.received,firstRefund:b.refund,firstCycleStart:b.startDate};
}
export function reconcileFirstPayments(w:Workspace){
 for(const c of w.salesConsultations??[]){
  const b=w.students.find(s=>s.id===c.studentId)?.billing;
  if(c.status!=='enrolled'||c.confirmedAmount!==undefined||!b||b.cycleNumber!==1||!c.firstCycleStart||b.startDate!==c.firstCycleStart)continue;
  if(c.firstRefund!==b.refund)delete c.refundDecision;
  c.firstReceived=b.received;c.firstRefund=b.refund;
 }
}
export function installAdmissionExamples(w:Workspace,today=todayKST()){
 if(w.admissionExampleVersion===1)return false;
 const specs=[['김도겸',8,1,0,'상담·강의 직접 담당 · 첫 달 55%'],['유나연',4,1,0,'노베 전용 대면 · 첫 달 강사 후불 정산 진행 중'],['서준혁',3,1,0,'첫 달 중도 환불 · 상담 수수료 판단 보류']] as const;
 for(let i=0;i<specs.length;i++){
  const [name,used,cycle,discount,scenario]=specs[i],id=`byun-demo-${i+1}`;
  if(w.students.some(s=>s.id===id&&!s.demo))continue;
  if(w.students.some(s=>s.id===id))continue;
  const s=makeStudent(name,id,true,today),startDate=addDays(today,-27),endDate=addDays(startDate,27);
  const b:BillingProfile={teacherId:'byun',mode:'teacher',cycleNumber:cycle,discountPercent:discount,startDate,endDate,sessions:Array.from({length:8},(_,n)=>({id:`${id}-${n}`,date:addDays(startDate,n*3),time:'17:00',status:n<used?'completed':'scheduled'})),received:980000,refund:0,scenario};
  if(i===0){b.settlementClosed=true;b.settlementAmount=343000;}
  if(i===2){b.stopped=true;b.refund=612500;b.refundDate=today;b.settlementClosed=true;b.settlementAmount=128625;}
  s.billing=b;s.beginner=true;s.grade='고1';s.selected=['h-1','h-2'];s.companion={species:i===0?'orca':i===1?'turtle':'seahorse',chosen:true,since:today,days:{},state:0,regressionDates:[],themeXpMultipliers:{},demoState:0,demoXpOffset:i===0?900:0};w.students.push(s);
 }
 const rows:SaleConsultation[]=w.students.filter(s=>s.demo&&s.billing?.teacherId==='byun').map((s,i)=>({id:`sale-demo-own-${i}`,studentId:s.id,consultantId:'byun',date:s.billing!.startDate,note:s.billing!.scenario,status:'enrolled',mode:'teacher',firstNormalFee:980000,firstReceived:s.billing!.received,firstRefund:s.billing!.refund,firstCycleStart:s.billing!.startDate,createdAt:new Date().toISOString(),...(i===0?{confirmedAmount:196000}: {})}));
 for(const [id,mode,normal,received,note,confirmed] of [
  ['billing-demo-13','online',498000,498000,'온라인 등록 성사 · 강사 배분 없음 · 상담 수수료 예상 99,600원',false],
  ['billing-demo-14','online',498000,498000,'현재 두 번째 수강 · 첫 달 상담 수수료 99,600원은 한 번만 지급',true],
  ['billing-demo-4','teacher',980000,980000,'송서균 담당으로 등록 성사 · 기존 강사 50% 유지',false],
  ['billing-demo-10','director',1200000,1200000,'원장 대면 등록 성사 · 첫 달 정상가 기준 240,000원',true],
 ] as const){const s=w.students.find(s=>s.id===id&&s.demo);if(s)rows.push({id:`sale-demo-${id}`,studentId:id,consultantId:'byun',date:s.startDate,note,status:'enrolled',mode,firstNormalFee:normal,firstReceived:received,firstRefund:0,firstCycleStart:mode==='director'?addDays(s.startDate,-112):id==='billing-demo-14'?addDays(s.startDate,-28):s.startDate,createdAt:new Date().toISOString(),...(confirmed?{confirmedAmount:Math.round(normal*.2),paid:mode==='director'?240000:99600}: {})});}
 w.salesConsultations=[...(w.salesConsultations??[]),...rows.filter(c=>!(w.salesConsultations??[]).some(x=>x.studentId===c.studentId))];w.admissionExampleVersion=1;return true;
}
