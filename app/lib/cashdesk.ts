import type {Student,Workspace,Viewer} from './domain.ts';
import {addDays} from './domain.ts';
import {consumedSessions,financials,chargedFee,teacherName,type BillingProfile} from './billing.ts';
import {consultationFinancials} from './admissions.ts';
import {getOperations,paidInvoice,enrollmentStatus,type Invoice} from './operations.ts';

export type StaffSalary={id:string;name:string;userId:string;monthly:number;startMonth:string;dueDay:number};
export type StaffPayment={id:string;key:string;amount:number;date:string;at:string;actor:string;recovery?:boolean;voidedAt?:string;reason?:string};
export type RefundRequest={id:string;studentId:string;cycleNumber:number;amount:number;reason:string;status:'pending'|'paid'|'cancelled';at:string;actor:string;paidAt?:string;paidBy?:string;date?:string};
export type StaffDue={key:string;personId:string;person:string;kind:'teaching'|'commission'|'salary';label:string;studentId?:string;cycleNumber?:number;month?:string;demo:boolean;amount:number;paid:number;balance:number;excess:number;ready:boolean;blocked:string;date:string};
const day=(now:string)=>new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
const clean=(x:unknown,n=300)=>typeof x==='string'?x.trim().slice(0,n):'';
const won=(x:unknown)=>{const n=Number(x);if(!Number.isSafeInteger(n)||n<0||n>100000000)throw Error('원 단위 금액을 확인해 주세요.');return n;};
export const cycleBill=(s:Student,cycle:number)=>s.billing?.cycleNumber===cycle?s.billing:s.billingHistory?.find(b=>b.cycleNumber===cycle);
export const endedBill=(b:BillingProfile)=>consumedSessions(b)>=8||!!b.stopped;
export function pendingRefund(w:Workspace,studentId:string,cycle?:number){return getOperations(w).refundRequests?.some(r=>r.studentId===studentId&&r.status==='pending'&&(cycle===undefined||r.cycleNumber===cycle))??false;}

export function startRenewal(w:Workspace,s:Student,i:Invoice,now:string){
 const b=s.billing!;
 if(i.activated||i.cancelledAt||i.discountPending||i.cycleNumber!==b.cycleNumber+1||consumedSessions(b)<8||enrollmentStatus(s)!=='active'||financials(b).unpaid||paidInvoice(i)<i.amount)throw Error('이번 8회 완료와 다음 수강료 전액 입금을 확인해 주세요.');
 if(pendingRefund(w,s.id))throw Error('환불 대기를 먼저 처리해 주세요.');
 const days=[...new Set(s.zoomDays)];if(days.length!==2||days.some(n=>!Number.isInteger(n)||n<0||n>6))throw Error('학생의 주 2회 수업 요일을 먼저 확인해 주세요.');
 const last=b.sessions.filter(x=>x.status==='completed'||x.status==='no_show'||x.makeupCompleted).map(x=>x.status==='excused'&&x.makeupCompleted?x.makeupDate??x.date:x.date).sort().at(-1)??b.endDate;
 let floor=[day(now),addDays(last,1),...(!i.automatic?[i.startDate]:[])].sort().at(-1)!;
 const clock=new Date(now).toLocaleTimeString('en-GB',{timeZone:'Asia/Seoul',hour12:false}).slice(0,5);if(floor===day(now)&&s.zoomTime<=clock)floor=addDays(floor,1);
 const dates=Array.from({length:35},(_,n)=>addDays(floor,n)).filter(d=>days.includes(new Date(d+'T12:00:00Z').getUTCDay())).slice(0,8);if(dates.length!==8)throw Error('다음 수업 일정을 확인해 주세요.');
 const previous=structuredClone(b);if(!previous.settlementClosed){previous.settlementAmount=financials(previous).teacher;previous.settlementClosed=true;}
 (s.billingHistory??=[]).push(previous);
 s.billing={...b,cycleNumber:i.cycleNumber,discountPercent:i.discountPercent,startDate:dates[0],endDate:addDays(dates[0],27),sessions:dates.map(date=>({id:crypto.randomUUID(),date,time:s.zoomTime,status:'scheduled'})),received:paidInvoice(i),refund:0,refundDate:undefined,paidOut:0,settlementClosed:false,settlementAmount:undefined,stopped:false,scenario:'입금확인 · 자동 재수강 시작'};
 i.startDate=dates[0];i.activated=true;i.activatedAt=now;
 const stored=w.operations!.invoices.find(x=>x.id===i.id);if(stored&&stored!==i)Object.assign(stored,i);else if(!stored)w.operations!.invoices.push(i);
}

export function staffDues(w:Workspace,today=day(new Date().toISOString())):StaffDue[]{
 const o=getOperations(w),rows:StaffDue[]=[];
 for(const s of w.students)for(const b of [...(s.billingHistory??[]),...(s.billing?[s.billing]:[])]){
  const f=financials(b);if(!f.external)continue;
  rows.push({key:`teaching:${s.id}:${b.cycleNumber}`,personId:b.teacherId,person:teacherName(b.teacherId),kind:'teaching',label:`${s.name} · ${b.cycleNumber}차 · ${f.consumed}/8회`,studentId:s.id,cycleNumber:b.cycleNumber,demo:s.demo,amount:f.teacher,paid:f.paid,balance:f.payable,excess:f.excessPaid,ready:endedBill(b),blocked:pendingRefund(w,s.id,b.cycleNumber)?'환불 처리 대기':f.unpaid&&!b.stopped?'학생 미납 확인 필요':'',date:b.endDate});
 }
 for(const c of w.salesConsultations??[]){const s=w.students.find(s=>s.id===c.studentId),f=consultationFinancials(c);if(!s||!f.eligible)continue;const b=[...(s.billingHistory??[]),...(s.billing?[s.billing]:[])].find(b=>b.startDate===c.firstCycleStart);
  rows.push({key:`commission:${c.id}`,personId:'byun',person:teacherName('byun'),kind:'commission',label:`${s.name} · 첫 달 상담 20%`,studentId:s.id,demo:s.demo,amount:f.amount,paid:f.paid,balance:f.payable,excess:Math.max(0,f.paid-f.amount),ready:f.confirmed||!!(b&&endedBill(b)),blocked:f.refundPending?'환불 수수료 결정 필요':pendingRefund(w,s.id)?'환불 처리 대기':'',date:c.date});
 }
 for(const p of o.staffSalaries??[]){let month=p.startMonth;for(let n=0;month<=today.slice(0,7)&&n<120;n++){
  const key=`salary:${p.id}:${month}`,paid=(o.staffPayments??[]).filter(x=>x.key===key&&!x.voidedAt).reduce((n,x)=>n+(x.recovery?-x.amount:x.amount),0),date=`${month}-${String(p.dueDay).padStart(2,'0')}`;
  rows.push({key,personId:p.id,person:p.name,kind:'salary',label:`${month} 조교 급여`,month,demo:false,amount:p.monthly,paid,balance:Math.max(0,p.monthly-paid),excess:Math.max(0,paid-p.monthly),ready:date<=today,blocked:'',date});const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);month=d.toISOString().slice(0,7);
 }}return rows;
}
export function staffOwnDues(w:Workspace,v:Viewer){const ids=v.role==='teacher'?[v.teacherId??'']:(getOperations(w).staffSalaries??[]).filter(p=>p.userId===v.userId).map(p=>p.id);return staffDues(w).filter(r=>ids.includes(r.personId));}

export function updateCashdesk(w:Workspace,v:Viewer,b:Record<string,unknown>,now:string):boolean{
 const op=String(b.operation),o=w.operations!,today=day(now);
 if(op==='staffVoid'){
  const p=o.staffPayments?.find(p=>p.id===b.id),reason=clean(b.reason);if(!p||p.voidedAt||!reason)throw Error('취소할 지급 기록과 사유를 확인해 주세요.');const r=staffDues(w,today).find(r=>r.key===p.key);if(!r)throw Error('해당 지급 대상을 찾을 수 없습니다.');const value=p.recovery?p.amount:-p.amount;
  if(r.kind==='teaching'){const bill=cycleBill(w.students.find(s=>s.id===r.studentId)!,r.cycleNumber!)!;if((bill.paidOut??0)+value<0)throw Error('후속 회수 내역을 먼저 확인해 주세요.');bill.paidOut=(bill.paidOut??0)+value;}
  if(r.kind==='commission'){const c=w.salesConsultations!.find(c=>'commission:'+c.id===p.key)!;if((c.paid??0)+value<0)throw Error('후속 회수 내역을 먼저 확인해 주세요.');c.paid=(c.paid??0)+value;}
  p.voidedAt=now;p.reason=reason;return true;
 }
 if(op==='staffRecovery'){
  const id=clean(b.requestId,80);if(!id)throw Error('회수 요청을 확인해 주세요.');if(o.staffPayments?.some(p=>p.id===id))return true;
  const r=staffDues(w,today).find(r=>r.key===b.key),value=won(b.amount);if(!r||!value||value>r.excess||Number(b.expectedExcess)!==r.excess)throw Error('최신 회수·상계 금액을 확인해 주세요.');
  if(r.kind==='teaching'){const bill=cycleBill(w.students.find(s=>s.id===r.studentId)!,r.cycleNumber!)!;bill.paidOut=(bill.paidOut??0)-value;}
  else if(r.kind==='commission'){const c=w.salesConsultations!.find(c=>'commission:'+c.id===r.key)!;c.paid=(c.paid??0)-value;}else throw Error('조교 급여 내역을 확인해 주세요.');
  (o.staffPayments??=[]).push({id,key:r.key,amount:value,date:today,at:now,actor:v.name,recovery:true});return true;
 }
 if(op==='staffSalary'){
  const name=clean(b.name,40),monthly=won(b.monthly),startMonth=clean(b.startMonth,7),dueDay=Number(b.dueDay);if(!name||!monthly||!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)||startMonth<today.slice(0,7)||!Number.isInteger(dueDay)||dueDay<1||dueDay>28)throw Error('이름·월 급여·이번 달 이후 시작월·지급일(1~28일)을 확인해 주세요.');
  if((o.staffSalaries??[]).some(p=>p.name===name||b.userId&&p.userId===b.userId))throw Error('이미 급여 기준이 등록된 조교입니다.');
  if(o.expenses.some(e=>e.category==='assistant'&&e.month>=startMonth))throw Error('해당 기간에 수동 입력한 조교비가 있습니다. 중복을 막기 위해 기존 조교비를 먼저 확인해 주세요.');
  (o.staffSalaries??=[]).push({id:crypto.randomUUID(),name,userId:clean(b.userId,100),monthly,startMonth,dueDay});return true;
 }
 if(op==='staffPaid'){
  const id=clean(b.requestId,80);if(!id)throw Error('지급 요청을 다시 확인해 주세요.');const old=o.staffPayments?.find(x=>x.id===id);if(old){if(old.key!==b.key||old.amount!==Number(b.amount))throw Error('같은 지급 요청의 내용이 달라졌습니다.');return true;}
  const r=staffDues(w,today).find(r=>r.key===b.key);if(!r||!r.ready||r.blocked)throw Error(r?.blocked||'수강 종료 후 지급할 내역을 선택해 주세요.');const value=won(b.amount);if(!value||value>r.balance||Number(b.expectedBalance)!==r.balance)throw Error('최신 미지급 금액을 다시 확인해 주세요.');
  if(r.kind==='teaching'){const s=w.students.find(s=>s.id===r.studentId)!,bill=cycleBill(s,r.cycleNumber!)!;if(!bill.settlementClosed){bill.settlementAmount=financials(bill).teacher;bill.settlementClosed=true;}bill.paidOut=(bill.paidOut??0)+value;}
  if(r.kind==='commission'){const c=w.salesConsultations!.find(c=>'commission:'+c.id===r.key)!;c.confirmedAmount=r.amount;c.paid=(c.paid??0)+value;}
  (o.staffPayments??=[]).push({id,key:r.key,amount:value,date:today,at:now,actor:v.name});return true;
 }
 if(op==='commissionDecision'){const c=w.salesConsultations?.find(c=>'commission:'+c.id===b.key);if(!c||c.confirmedAmount!==undefined||!(c.firstRefund??0)||!['keep','waive'].includes(String(b.decision)))throw Error('환불 상담 수수료 내역을 확인해 주세요.');c.refundDecision=b.decision as 'keep'|'waive';return true;}
 if(op==='refundRequest'){
  const s=w.students.find(s=>s.id===b.studentId),cycle=Number(b.cycleNumber),bill=s&&cycleBill(s,cycle),invoice=o.invoices.find(i=>i.studentId===s?.id&&i.cycleNumber===cycle&&!i.cancelledAt),value=won(b.amount),reason=clean(b.reason);
  if(!s||!reason||!value||(!bill&&!invoice))throw Error('환불할 수강과 금액·사유를 확인해 주세요.');if(pendingRefund(w,s.id,cycle))throw Error('이미 환불 대기 중입니다.');
  const available=bill?Math.max(0,bill.received-bill.refund):paidInvoice(invoice!);if(value>available||!bill&&value!==available)throw Error('남은 수납액 이내로 입력해 주세요. 시작 전 차수는 선납금 전액 환불로 처리합니다.');
  (o.refundRequests??=[]).push({id:crypto.randomUUID(),studentId:s.id,cycleNumber:cycle,amount:value,reason,status:'pending',at:now,actor:v.name});return true;
 }
 if(op==='refundCancel'){const r=o.refundRequests?.find(r=>r.id===b.id);if(!r||r.status!=='pending')throw Error('환불 대기 내역이 없습니다.');r.status='cancelled';return true;}
 if(op==='refundPaid'){
  const r=o.refundRequests?.find(r=>r.id===b.id);if(!r)throw Error('환불 내역이 없습니다.');if(r.status==='paid')return true;if(r.status!=='pending')throw Error('취소된 환불입니다.');
  const s=w.students.find(s=>s.id===r.studentId)!,bill=cycleBill(s,r.cycleNumber);if(!s)throw Error('학생을 찾을 수 없습니다.');
  if(bill){if(r.amount>bill.received-bill.refund)throw Error('수납액이 변경되었습니다. 환불 내역을 다시 확인해 주세요.');const oldDate=bill.refundDate;bill.refund+=r.amount;bill.refundDate=today;bill.stopped=true;bill.settlementClosed=false;bill.settlementAmount=financials(bill).teacher;bill.settlementClosed=true;
   if(bill===s.billing)s.enrollment={status:'withdrawn',date:today,reason:r.reason,actor:v.name};
   const hasHistory=o.events.some(e=>e.type==='refund'&&e.studentId===s.id&&e.note===String(r.cycleNumber));if(!hasHistory&&bill.refund>r.amount&&oldDate)o.events.push({id:crypto.randomUUID(),type:'refund',studentId:s.id,amount:bill.refund-r.amount,date:oldDate,actor:v.name,note:String(r.cycleNumber)});
   o.events.push({id:crypto.randomUUID(),type:'refund',studentId:s.id,amount:r.amount,date:today,actor:v.name,note:String(r.cycleNumber)});
   for(const c of w.salesConsultations??[])if(c.studentId===s.id&&c.firstCycleStart===bill.startDate){c.firstRefund=bill.refund;if(c.confirmedAmount===undefined)delete c.refundDecision;}
  }else{const i=o.invoices.find(i=>i.studentId===s.id&&i.cycleNumber===r.cycleNumber&&!i.cancelledAt);if(!i||paidInvoice(i)!==r.amount)throw Error('선납 내역이 변경되었습니다.');i.cancelledAt=now;i.refunds=[{amount:r.amount,date:today,actor:v.name,reason:r.reason}];}
  r.status='paid';r.paidAt=now;r.date=today;r.paidBy=v.name;return true;
 }
 return false;
}
