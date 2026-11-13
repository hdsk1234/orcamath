import type {Student,Workspace,Viewer} from './domain.ts';
import {baseFee,chargedFee,consumedSessions,discountPreview,financials,teacherRate,TEACHERS,type BillingProfile} from './billing.ts';
import {startRenewal,updateCashdesk,pendingRefund,type StaffSalary,type StaffPayment,type RefundRequest} from './cashdesk.ts';
export type Enrollment={status:'active'|'withdrawn'|'graduated';date:string;reason:string;actor:string};
export type Receipt={id:string;amount:number;date:string;payer:string;actor:string;at:string;confirmationDate?:boolean;voidedAt?:string;voidedBy?:string;reason?:string};
export type Invoice={id:string;studentId:string;cycleNumber:number;startDate:string;dueDate:string;amount:number;discountPercent:number;openingCredit:number;payments:Receipt[];createdAt:string;createdBy:string;automatic?:boolean;discountPending?:boolean;activated?:boolean;activatedAt?:string;cancelledAt?:string;refunds?:{amount:number;date:string;actor:string;reason:string}[]};
export type Expense={id:string;month:string;category:string;amount:number;date:string;note:string;actor:string};
export type Alumni={id:string;studentId:string;displayName:string;period:string;teacher:string;mode:string;startGrade:number|null;startExam:string;finalGrade:number|null;finalExam:string;story:string;message:string;published:boolean;order:number;updatedAt:string};
export type OperationEvent={id:string;type:'refund'|'paymentAdjustment'|'enrollment'|'payout'|'schedule'|'attendance';studentId:string;amount:number;date:string;actor:string;note:string};
export type Operations={invoices:Invoice[];expenses:Expense[];alumni:Alumni[];events:OperationEvent[];staffSalaries?:StaffSalary[];staffPayments?:StaffPayment[];refundRequests?:RefundRequest[]};
export const EXPENSE_CATEGORIES={rent:'월세',assistant:'조교비',supplies:'물품',printing:'교재·인쇄',software:'프로그램',utilities:'관리·공과금',other:'기타'};
export const enrollmentStatus=(s:Student)=>s.enrollment?.status??(s.billing?.stopped?'withdrawn':'active');
export const enrollmentLabel=(s:Student)=>({active:'수강 중',withdrawn:'중도종료',graduated:'졸업'})[enrollmentStatus(s)];
export const paidInvoice=(i:Invoice)=>i.openingCredit+i.payments.filter(p=>!p.voidedAt).reduce((n,p)=>n+p.amount,0);
export function invoiceStatus(i:Invoice,today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'})){
 const paid=paidInvoice(i);if(i.cancelledAt)return '청구 취소 · 환불 기록';if(i.discountPending)return '할인 확인대기';return paid>=i.amount?'입금완료':!i.automatic&&i.dueDate<today?'납부기한 경과':paid>0?'일부 입금':'입금대기';
}
// Project renewal invoices on reads too, so old 8/8 records do not require a separate setup click.
// Persist the same deterministic invoice during the next workspace mutation.
export function getOperations(w:Workspace,now=new Date().toISOString()):Operations{
 const stored=w.operations??{invoices:[],expenses:[],alumni:[],events:[]},today=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
 const invoices=stored.invoices.filter(i=>{const s=w.students.find(s=>s.id===i.studentId);return !i.automatic||i.cancelledAt||i.payments.length>0||i.openingCredit>0||i.activated||!!(s?.billing&&enrollmentStatus(s)==='active'&&consumedSessions(s.billing)>=8&&i.cycleNumber===s.billing.cycleNumber+1);}).map(i=>i.automatic?{...i}:i);
 for(const s of w.students){const b=s.billing;if(!b||enrollmentStatus(s)!=='active'||consumedSessions(b)<8)continue;
  const cycleNumber=b.cycleNumber+1,old=invoices.find(i=>i.studentId===s.id&&i.cycleNumber===cycleNumber&&!i.cancelledAt);
  if(old&&(!old.automatic||paidInvoice(old)>0||old.payments.length>0))continue;
  if(!old&&invoices.some(i=>i.studentId===s.id&&i.cycleNumber===cycleNumber&&i.cancelledAt))continue;
  const preview=discountPreview(s,today)!,discountPending=preview.expectedDiscount===null,discountPercent=preview.expectedDiscount??5;
  const end=new Date(b.endDate+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+1);const startDate=end.toISOString().slice(0,10);
  const value={amount:Math.round((b.normalFee??baseFee(b.mode))*(100-discountPercent)/100),discountPercent,discountPending};
  if(old)Object.assign(old,value);else invoices.push({id:`renewal:${s.id}:${cycleNumber}`,studentId:s.id,cycleNumber,startDate,dueDate:startDate,openingCredit:0,payments:[],createdAt:now,createdBy:'8회 완료 자동 청구',automatic:true,...value});
 }
 return {...stored,invoices};
}
export function reconcileRenewalInvoices(w:Workspace,now=new Date().toISOString()){w.operations=getOperations(w,now);}
export function collectionTarget(s:Student,o:Operations){
 const b=s.billing;if(!b||enrollmentStatus(s)!=='active')return null;
 const current=o.invoices.find(i=>i.studentId===s.id&&i.cycleNumber===b.cycleNumber&&!i.cancelledAt);
 if(financials(b).unpaid>0){const balance=current?Math.max(0,current.amount-paidInvoice(current)):financials(b).unpaid;return {invoice:current,cycleNumber:b.cycleNumber,amount:current?.amount??chargedFee(b),discountPercent:current?.discountPercent??b.discountPercent,balance,pending:false,next:false,blocked:!!b.settlementClosed};}
 const next=o.invoices.find(i=>i.studentId===s.id&&i.cycleNumber===b.cycleNumber+1&&!i.cancelledAt);if(!next)return null;
 return {invoice:next,cycleNumber:next.cycleNumber,amount:next.amount,discountPercent:next.discountPercent,balance:Math.max(0,next.amount-paidInvoice(next)),pending:!!next.discountPending,next:true,blocked:false};
}
export function collectionPriority(s:Student,o:Operations){const t=collectionTarget(s,o);return enrollmentStatus(s)!=='active'?4:consumedSessions(s.billing!)>=8&&t?.next&&(t.balance>0||t.pending)?0:t&&t.balance>0?1:consumedSessions(s.billing!)>=8?2:3;}
export function sortCollectionStudents(students:Student[],o:Operations){return [...students].sort((a,b)=>collectionPriority(a,o)-collectionPriority(b,o)||consumedSessions(b.billing!)-consumedSessions(a.billing!)||a.name.localeCompare(b.name,'ko'));}
export function publicOperations(w:Workspace,v:Viewer){const o=getOperations(w);if(['admin','manager'].includes(v.role))return o;return {invoices:o.invoices.filter(i=>i.studentId===v.studentId).map(i=>({...i,createdBy:'',payments:i.payments.map(p=>({...p,actor:'',voidedBy:undefined,reason:undefined}))})),expenses:[],events:[],alumni:o.alumni.filter(a=>a.published).map(a=>({...a,studentId:''}))};}
const dateOK=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const text=(v:unknown,n=300)=>typeof v==='string'?v.trim().slice(0,n):'';
const amount=(v:unknown,max=100000000)=>{const x=Number(v);if(!Number.isSafeInteger(x)||x<0||x>max)throw Error('올바른 원 단위 금액을 입력해 주세요.');return x;};
export function updateOperations(w:Workspace,v:Viewer,b:Record<string,unknown>,now=new Date().toISOString()){
 const op=text(b.operation),today=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
 const requireManagement=()=>{if(!['admin','manager'].includes(v.role))throw Error('원장·총괄관리자만 변경할 수 있습니다.');};
 if(op==='alumni'){if(v.role!=='admin')throw Error('명예의 전당은 대표원장만 변경할 수 있습니다.');}else requireManagement();
 reconcileRenewalInvoices(w,now);const o=w.operations!;
 if(updateCashdesk(w,v,b,now))return;
 const s=w.students.find(s=>s.id===b.studentId);
 const event=(type:OperationEvent['type'],value:number,note:string,date=today)=>o.events.push({id:crypto.randomUUID(),studentId:s?.id??'',type,amount:value,date,actor:v.name,note});
 if(op==='expense'){
  const month=text(b.month,7),category=text(b.category,30),date=text(b.date,10);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Object.hasOwn(EXPENSE_CATEGORIES,category)||!dateOK(date)||date.slice(0,7)!==month)throw Error('지출 월·분류·지출일을 확인해 주세요.');
  if(category==='assistant'&&o.staffSalaries?.some(p=>p.startMonth<=month))throw Error('등록한 조교 급여가 자동 반영되는 달입니다. 줄 돈에서 관리해 주세요.');
  const x:Expense={id:text(b.id,80)||crypto.randomUUID(),month,category,amount:amount(b.amount),date,note:text(b.note),actor:v.name};const index=o.expenses.findIndex(e=>e.id===x.id);if(index<0)o.expenses.push(x);else o.expenses[index]=x;return;
 }
 if(op==='removeExpense'){const index=o.expenses.findIndex(e=>e.id===b.id);if(index<0)throw Error('지출 기록을 찾을 수 없습니다.');o.expenses.splice(index,1);return;}
 if(op==='alumni'){
  const old=o.alumni.find(a=>a.id===b.id);if(b.remove===true){if(!old)throw Error('기록이 없습니다.');o.alumni=o.alumni.filter(a=>a.id!==old.id);return;}
  if(!s||enrollmentStatus(s)!=='graduated')throw Error('졸업 처리한 학생을 선택해 주세요.');
  const grade=(x:unknown)=>{if(x===''||x===null||x===undefined)return null;const n=Number(x);if(!Number.isInteger(n)||n<1||n>9)throw Error('등급은 1~9등급입니다.');return n;};
  const a:Alumni={id:old?.id??crypto.randomUUID(),studentId:s.id,displayName:text(b.displayName,40),period:text(b.period,80),teacher:text(b.teacher,40),mode:text(b.mode,40),startGrade:grade(b.startGrade),startExam:text(b.startExam,100),finalGrade:grade(b.finalGrade),finalExam:text(b.finalExam,100),story:text(b.story,500),message:text(b.message,300),published:b.published===true,order:amount(b.order,999),updatedAt:now};
  if(!a.displayName||!a.story)throw Error('공개용 이름과 성장 이야기를 입력해 주세요.');if(a.published&&(!a.startGrade||!a.finalGrade||!a.startExam||!a.finalExam))throw Error('공개하려면 시작·마지막 수능 등급과 시험 정보를 입력해 주세요.');
  if(old)o.alumni[o.alumni.indexOf(old)]=a;else{if(o.alumni.some(a=>a.studentId===s.id))throw Error('이미 등록된 졸업생입니다. 기존 기록을 수정해 주세요.');o.alumni.push(a);}return;
 }
 if(!s||!s.billing)throw Error('수강 정보가 있는 학생을 선택해 주세요.');const billing=s.billing;
 if(op==='confirmReceipt'){
  const requestId=text(b.requestId,80);if(!requestId)throw Error('입금확인 요청을 다시 시도해 주세요.');
  const previousInvoice=o.invoices.find(i=>i.studentId===s.id&&i.payments.some(p=>p.id===requestId)),previous=previousInvoice?.payments.find(p=>p.id===requestId);
  if(previous){if(previous.voidedAt)throw Error('취소된 확인 요청입니다. 새로고침 후 다시 확인해 주세요.');if(previous.amount!==Number(b.expectedAmount)||previousInvoice!.cycleNumber!==Number(b.cycleNumber)||previousInvoice!.discountPercent!==Number(b.expectedDiscount))throw Error('같은 요청의 내용이 달라졌습니다. 다시 확인해 주세요.');return;}
  const target=collectionTarget(s,o);
  if(!target||target.balance<=0)throw Error('확인할 미납 수강료가 없습니다.');
  if(target.pending)throw Error('과제 확인을 마쳐 할인율을 확정한 뒤 입금을 확인해 주세요.');
  if(target.blocked)throw Error('정산 확정된 차수의 입금 기록은 변경할 수 없습니다.');
  if(Number(b.cycleNumber)!==target.cycleNumber||Number(b.expectedAmount)!==target.balance||Number(b.expectedDiscount)!==target.discountPercent)throw Error('수강료가 변경되었습니다. 최신 금액을 확인한 뒤 다시 눌러 주세요.');
  let invoice=target.invoice;
  if(!invoice){invoice={id:crypto.randomUUID(),studentId:s.id,cycleNumber:billing.cycleNumber,startDate:billing.startDate,dueDate:today,amount:chargedFee(billing),discountPercent:billing.discountPercent,openingCredit:billing.received,payments:[],createdAt:now,createdBy:v.name};o.invoices.push(invoice);}
  invoice.payments.push({id:requestId,amount:target.balance,date:today,payer:'전액 입금 확인',actor:v.name,at:now,confirmationDate:true});
  if(!target.next)billing.received=paidInvoice(invoice);else if(consumedSessions(billing)>=8)startRenewal(w,s,invoice,now);return;
 }
 if(op==='status'){
  const status=text(b.status) as Enrollment['status'],date=text(b.date,10);if(!['active','withdrawn','graduated'].includes(status)||!dateOK(date))throw Error('수강 상태와 처리일을 확인해 주세요.');
  if(status==='active'&&billing.stopped)throw Error('중도종료한 수강은 새 차수로 재등록해 주세요.');
  if(status==='withdrawn')billing.stopped=true;
  s.enrollment={status,date,reason:text(b.reason),actor:v.name};if(status!=='graduated')o.alumni.filter(a=>a.studentId===s.id).forEach(a=>a.published=false);event('enrollment',0,status);return;
 }
 if(op==='invoice'){
  if(enrollmentStatus(s)!=='active')throw Error('수강 중인 학생에게만 청구할 수 있습니다.');
  const next=b.next===true,cycleNumber=billing.cycleNumber+(next?1:0);if(o.invoices.some(i=>i.studentId===s.id&&i.cycleNumber===cycleNumber&&!i.cancelledAt))throw Error('해당 차수의 청구서가 이미 있습니다.');
  const startDate=next?text(b.startDate,10):billing.startDate,dueDate=text(b.dueDate,10);if(!dateOK(startDate)||!dateOK(dueDate)||(next&&startDate<=billing.endDate))throw Error('시작일·납부기한을 확인해 주세요.');
  const discount=next?amount(b.discountPercent,20):billing.discountPercent;if(discount%5)throw Error('할인율은 5% 단위입니다.');
  o.invoices.push({id:crypto.randomUUID(),studentId:s.id,cycleNumber,startDate,dueDate,amount:next?Math.round((billing.normalFee??(billing.mode==='online'?498000:billing.mode==='director'?1200000:980000))*(100-discount)/100):chargedFee(billing),discountPercent:discount,openingCredit:next?0:billing.received,payments:[],createdAt:now,createdBy:v.name});return;
 }
 const i=o.invoices.find(i=>i.id===b.invoiceId&&i.studentId===s.id);
 if(op==='cancelInvoice'){
  if(!i||i.cycleNumber<=billing.cycleNumber||i.activated||i.cancelledAt)throw Error('시작 전인 다음 차수만 취소할 수 있습니다.');const date=text(b.date,10),reason=text(b.reason);if(!dateOK(date)||date>today||!reason)throw Error('실제 환불일과 취소 사유를 입력해 주세요.');i.cancelledAt=now;i.refunds=[{amount:paidInvoice(i),date,actor:v.name,reason}];return;
 }
 if(op==='receipt'||op==='voidReceipt'||op==='activate'){
  if(!i||i.cancelledAt)throw Error('진행 중인 청구서를 선택해 주세요.');
  if(op==='activate'){
   startRenewal(w,s,i,now);return;
  }
  const current=i.cycleNumber===billing.cycleNumber,archive=s.billingHistory?.find(x=>x.cycleNumber===i.cycleNumber);
  if(archive||(current&&billing.settlementClosed))throw Error('정산 확정된 차수의 입금 기록은 변경할 수 없습니다.');
  if(op==='receipt'){
   if(i.discountPending)throw Error('과제 확인을 마쳐 할인율을 확정한 뒤 입금을 확인해 주세요.');
   const requestId=text(b.requestId,80);const previous=requestId?i.payments.find(p=>p.id===requestId):undefined;if(previous){if(previous.amount!==Number(b.amount)||previous.date!==b.date||previous.payer!==b.payer)throw Error('같은 요청의 내용이 달라졌습니다. 다시 확인해 주세요.');return;}
   const value=amount(b.amount,i.amount),date=text(b.date,10),payer=text(b.payer,40);if(!value||!dateOK(date)||date>today||!payer||value>i.amount-paidInvoice(i))throw Error('입금일·입금자·잔액 이내의 금액을 확인해 주세요.');
   i.payments.push({id:requestId||crypto.randomUUID(),amount:value,date,payer,actor:v.name,at:now});if(current)billing.received=paidInvoice(i);else if(i.cycleNumber===billing.cycleNumber+1&&consumedSessions(billing)>=8&&paidInvoice(i)>=i.amount)startRenewal(w,s,i,now);return;
  }
  const p=i.payments.find(p=>p.id===b.receiptId);if(!p||p.voidedAt||!text(b.reason))throw Error('입금 기록과 확인 취소 사유를 입력해 주세요.');if(current&&billing.refund>paidInvoice(i)-p.amount)throw Error('환불된 금액보다 수납액을 낮출 수 없습니다.');
  if(current&&i.activated&&paidInvoice(i)-p.amount<i.amount){
   const previous=s.billingHistory?.at(-1);if(pendingRefund(w,s.id)||o.invoices.some(x=>x.studentId===s.id&&x.cycleNumber>i.cycleNumber&&!x.cancelledAt)||billing.sessions.some(x=>x.status!=='scheduled')||billing.refund||billing.paidOut||Object.values(s.marks).some(m=>m.submittedAt&&i.activatedAt&&m.submittedAt>i.activatedAt)||!previous||previous.cycleNumber!==billing.cycleNumber-1)throw Error('새 수강에서 활동이 시작되어 입금확인을 바로 취소할 수 없습니다. 환불·정정으로 처리해 주세요.');
   s.billing=previous;s.billingHistory!.pop();i.activated=false;delete i.activatedAt;
  }
  p.voidedAt=now;p.voidedBy=v.name;p.reason=text(b.reason);if(current&&s.billing===billing)billing.received=paidInvoice(i);return;
 }
 if(op==='archivePaid'){if(pendingRefund(w,s.id,Number(b.cycleNumber)))throw Error('환불 처리 대기를 먼저 확인해 주세요.');const h=s.billingHistory?.find(x=>x.cycleNumber===Number(b.cycleNumber));if(!h?.settlementClosed)throw Error('과거 확정 정산을 선택해 주세요.');h.paidOut=financials(h).teacher;event('payout',h.paidOut,'과거 차수 지급 완료');return;}
 throw Error('지원하지 않는 관리 작업입니다.');
}
export type RevenueRow={month:string;stream:string;teacherId:string;receipts:number;refunds:number;service:number;teacher:number;paid:number;commission:number;registrations:number;refundCount:number;cohortReceipts:number;cohortRefunds:number};
export function lastMonths(end:string,count=12){const [y,m]=end.split('-').map(Number);return Array.from({length:count},(_,i)=>{const d=new Date(Date.UTC(y,m-1-(count-1-i),1));return d.toISOString().slice(0,7);});}
export function demoRevenue():RevenueRow[]{
 const months=lastMonths('2026-09'),season=[.65,.9,1.1,1.35,1.4,.065,.95,.9,1.1,1.35,1.4,1.05],rows:RevenueRow[]=[];
 for(const [m,month] of months.entries())for(const [k,stream] of ['online','director','kang','song','eo','byun'].entries()){
  const teacherId=stream==='online'?'director':stream,fee=stream==='online'?498000:stream==='director'?1200000:980000;
  const registrations=Math.max(1,Math.round((stream==='online'?23:stream==='director'?7:10+k%3)*season[m]));
  const discount=[.05,.1,.15,.2][(m+k)%4],receipts=Math.round(registrations*fee*(1-discount));
  const refundCount=Math.min(registrations,((m===4||m===8)&&k===3)?Math.ceil(registrations*.3):(m+k)%4===0?2:(m+k)%3===0?1:0);
  const refunds=Math.round(refundCount*fee*(1-discount)*[.5,.75,.375][(m+k)%3]),service=receipts-refunds;
  const teacher=['online','director'].includes(stream)?0:Math.floor(service*teacherRate(teacherId));
  const newRegistrations=Math.min(registrations,1+(m+k)%3),commission=Math.round(newRegistrations*fee*.2);
  rows.push({month,stream,teacherId,receipts,refunds,service,teacher,paid:Math.round(teacher*.9),commission,registrations,refundCount,cohortReceipts:receipts,cohortRefunds:refunds});
 }
 return rows;
}
export function actualRevenue(w:Workspace,months:string[]):RevenueRow[]{
 const rows:RevenueRow[]=[],map=new Map<string,RevenueRow>(),o=getOperations(w);
 const row=(month:string,b:BillingProfile)=>{const stream=b.mode==='online'?'online':b.teacherId,key=month+':'+stream;let r=map.get(key);if(!r){r={month,stream,teacherId:b.teacherId,receipts:0,refunds:0,service:0,teacher:0,paid:0,commission:0,registrations:0,refundCount:0,cohortReceipts:0,cohortRefunds:0};map.set(key,r);rows.push(r);}return r;};
 for(const s of w.students.filter(s=>!s.demo))for(const b of [...(s.billingHistory??[]),...(s.billing?[s.billing]:[])]){
  const f=financials(b),cohort=row(b.startDate.slice(0,7),b);if(b.received>0){cohort.registrations++;cohort.cohortReceipts+=b.received;if(b.refund>0){cohort.refundCount++;cohort.cohortRefunds+=b.refund;}}
  const sessions=b.sessions.filter(x=>x.status==='completed'||x.status==='no_show'||x.makeupCompleted);let allocated=0,teacherAllocated=0;
  sessions.forEach((x,index)=>{const income=index===sessions.length-1?f.service-allocated:Math.floor(f.service/sessions.length),teacher=index===sessions.length-1?f.teacher-teacherAllocated:Math.floor(f.teacher/sessions.length);allocated+=income;teacherAllocated+=teacher;const r=row((x.status==='excused'&&x.makeupCompleted?x.makeupDate??x.date:x.date).slice(0,7),b);r.service+=income;r.teacher+=teacher;});
  const inv=o.invoices.find(i=>i.studentId===s.id&&i.cycleNumber===b.cycleNumber&&!i.cancelledAt);if(inv)for(const p of inv.payments.filter(p=>!p.voidedAt))row(p.date.slice(0,7),b).receipts+=p.amount;
  const events=o.events.filter(e=>e.studentId===s.id&&e.type==='refund'&&e.note===String(b.cycleNumber));if(events.length)for(const e of events)row(e.date.slice(0,7),b).refunds+=e.amount;else if(b.refundDate)row(b.refundDate.slice(0,7),b).refunds+=b.refund;
 }
 for(const i of o.invoices){const s=w.students.find(s=>s.id===i.studentId);if(!s?.billing||s.demo||(!i.cancelledAt&&i.cycleNumber<=s.billing.cycleNumber))continue;for(const p of i.payments.filter(p=>!p.voidedAt))row(p.date.slice(0,7),s.billing).receipts+=p.amount;for(const r of i.refunds??[])row(r.date.slice(0,7),s.billing).refunds+=r.amount;const paid=paidInvoice(i),refunded=(i.refunds??[]).reduce((n,r)=>n+r.amount,0);if(paid>0){const cohort=row(i.startDate.slice(0,7),s.billing);cohort.registrations++;cohort.cohortReceipts+=paid;cohort.cohortRefunds+=refunded;if(refunded>0)cohort.refundCount++;}}
 for(const c of w.salesConsultations??[]){const s=w.students.find(s=>s.id===c.studentId);if(!s||s.demo||c.confirmedAmount===undefined)continue;const b=s.billingHistory?.find(b=>b.cycleNumber===1)??s.billing;if(b)row((c.firstCycleStart??b.startDate).slice(0,7),b).commission+=c.confirmedAmount;}
 return rows.filter(r=>months.includes(r.month));
}
export function monthlyExpenses(o:Operations,month:string,demo=false){const rows=demo?[{category:'supplies',amount:120000+Number(month.slice(-2))%4*45000},{category:'printing',amount:160000},{category:'software',amount:55000},{category:'utilities',amount:180000}]:o.expenses.filter(e=>e.month===month);const base={rent:3000000,assistant:demo?1000000:0,supplies:0,printing:0,software:0,utilities:0,other:0};for(const category of Object.keys(base)){const found=rows.filter(e=>e.category===category);if(found.length)base[category as keyof typeof base]=found.reduce((n,e)=>n+e.amount,0);}if(!demo&&(o.staffSalaries?.length??0)>0)base.assistant+=(o.staffSalaries??[]).filter(p=>p.startMonth<=month).reduce((n,p)=>n+p.monthly,0);return base;}
