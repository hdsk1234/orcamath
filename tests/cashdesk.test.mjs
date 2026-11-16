import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStudent,visibleWorkspace} from '../app/lib/domain.ts';
import {financials,chargedFee} from '../app/lib/billing.ts';
import {getOperations,updateOperations,collectionTarget,actualRevenue,monthlyExpenses} from '../app/lib/operations.ts';
import {staffDues,staffOwnDues,startRenewal} from '../app/lib/cashdesk.ts';
const now='2026-10-20T10:00:00.000Z',owner={role:'admin',name:'원장',userId:'owner',studentId:null},manager={...owner,role:'manager',name:'상우'};
function fixture({count=8,teacher='kang',mode='teacher',paid=0}={}){const s=makeStudent('가상 검증','s',false,'2026-09-20');s.zoomDays=[2,5];s.zoomTime='16:00';s.billing={teacherId:teacher,mode,cycleNumber:1,discountPercent:0,startDate:'2026-09-20',endDate:'2026-10-17',sessions:Array.from({length:8},(_,n)=>({id:String(n),date:'2026-10-16',time:'16:00',status:n<count?'completed':'scheduled'})),received:mode==='online'?498000:980000,refund:0,paidOut:paid,scenario:'test'};return {students:[s],themes:[],consultations:[],updatedAt:now};}
const run=(w,b,v=owner,time=now)=>updateOperations(w,v,b,time);
const confirm=(w,id='receipt')=>{const t=collectionTarget(w.students[0],getOperations(w,now));run(w,{operation:'confirmReceipt',studentId:'s',cycleNumber:t.cycleNumber,expectedAmount:t.balance,expectedDiscount:t.discountPercent,requestId:id});};
const pay=(w,r,value=r.balance,id='pay')=>run(w,{operation:'staffPaid',key:r.key,amount:value,expectedBalance:r.balance,requestId:id});
test('입금확인 한 번으로 다음 0/8회 시작, 기존 강사비는 미지급으로 보존한다',()=>{
 const w=fixture(),s=w.students[0];confirm(w);assert.equal(s.billing.cycleNumber,2);assert.equal(s.billing.received,931000);assert.equal(s.billing.sessions.filter(x=>x.status!=='scheduled').length,0);assert.equal(s.billing.startDate,'2026-10-23');assert.equal(s.billing.sessions.length,8);assert(s.billing.sessions.every(x=>[2,5].includes(new Date(x.date+'T12:00Z').getUTCDay())));assert.equal(s.billingHistory.length,1);assert.equal(s.billingHistory[0].settlementAmount,490000);assert.equal(s.billingHistory[0].paidOut,0);assert.equal(staffDues(w).find(r=>r.cycleNumber===1).balance,490000);assert.equal(getOperations(w).invoices[0].activated,true);
});
test('재수강해도 과거 강사 미지급·일부 지급 기록과 강사 본인 조회가 유지된다',()=>{
 const w=fixture({paid:100000});confirm(w);const old=staffDues(w).find(r=>r.cycleNumber===1);assert.equal(old.balance,390000);pay(w,old,100000);assert.equal(w.students[0].billingHistory[0].paidOut,200000);assert.equal(w.students[0].billing.paidOut,0);const mine=staffOwnDues(w,{...owner,role:'teacher',teacherId:'kang'});assert.equal(mine.find(r=>r.cycleNumber===1).balance,290000);assert.equal(staffOwnDues(w,{...owner,role:'teacher',teacherId:'song'}).length,0);
});
test('재등록하지 않은 8회 종료 학생도 지급대기에 표시되고 중복 지급을 막는다',()=>{
 const w=fixture(),r=staffDues(w)[0];assert(r.ready);pay(w,r);pay(w,r);assert.equal(w.students[0].billing.paidOut,490000);assert.equal(w.operations.staffPayments.length,1);assert.throws(()=>pay(w,r,r.balance,'other-tab'),/미지급/);
});
test('진행 중 수업은 발생액만 보여주며 지급완료를 기록할 수 없다',()=>{
 const w=fixture({count:3}),r=staffDues(w)[0];assert.equal(r.amount,183750);assert.equal(r.ready,false);assert.throws(()=>pay(w,r),/종료/);
});
test('변지석 강의 35%와 첫 달 정상가 20% 상담 수수료는 분리하고 중복하지 않는다',()=>{
 const w=fixture({teacher:'byun'});w.salesConsultations=[{id:'c',studentId:'s',consultantId:'byun',status:'enrolled',mode:'teacher',date:'2026-09-20',firstNormalFee:980000,firstReceived:980000,firstRefund:0,firstCycleStart:'2026-09-20'}];const rows=staffDues(w);assert.equal(rows.find(r=>r.kind==='teaching').amount,343000);assert.equal(rows.find(r=>r.kind==='commission').amount,196000);pay(w,rows.find(r=>r.kind==='commission'));assert.equal(w.salesConsultations[0].paid,196000);confirm(w);assert.equal(staffDues(w).filter(r=>r.kind==='commission').length,1);assert.equal(staffDues(w).find(r=>r.kind==='commission').balance,0);
});
test('환불 대기 중에는 재수강·강사 지급을 막고, 완료 때 수납과 강사비를 함께 조정한다',()=>{
 const w=fixture({count:3}),s=w.students[0];run(w,{operation:'refundRequest',studentId:'s',cycleNumber:1,amount:612500,reason:'중도 종료'},manager);assert.equal(s.billing.refund,0);assert.equal(s.enrollment,undefined);assert.equal(staffDues(w)[0].blocked,'환불 처리 대기');assert.throws(()=>pay(w,staffDues(w)[0]),/환불/);const r=w.operations.refundRequests[0];run(w,{operation:'refundPaid',id:r.id},manager);run(w,{operation:'refundPaid',id:r.id},manager);assert.equal(s.billing.refund,612500);assert.equal(s.billing.received,980000);assert.equal(s.enrollment.status,'withdrawn');assert.equal(staffDues(w)[0].amount,183750);assert.equal(staffDues(w)[0].ready,true);assert.equal(actualRevenue(w,['2026-10']).reduce((n,r)=>n+r.refunds,0),612500);
});
test('이미 지급한 강사비보다 환불 후 몫이 작아지면 회수액을 보이고 실제 회수를 별도 기록한다',()=>{
 const w=fixture();let r=staffDues(w)[0];pay(w,r);run(w,{operation:'refundRequest',studentId:'s',cycleNumber:1,amount:490000,reason:'확정 환불'});run(w,{operation:'refundPaid',id:w.operations.refundRequests[0].id});r=staffDues(w)[0];assert.equal(r.amount,245000);assert.equal(r.paid,490000);assert.equal(r.excess,245000);run(w,{operation:'staffRecovery',key:r.key,amount:r.excess,expectedExcess:r.excess,requestId:'recovery'});assert.equal(staffDues(w)[0].excess,0);assert.equal(w.operations.staffPayments[0].amount,490000);assert.equal(w.operations.staffPayments[1].amount,245000);assert.equal(w.operations.staffPayments[1].recovery,true);
});
test('과거 차수 환불은 현재 새 차수를 종료시키거나 새 수납액을 바꾸지 않는다',()=>{
 const w=fixture();confirm(w);run(w,{operation:'refundRequest',studentId:'s',cycleNumber:1,amount:100000,reason:'과거 차수 조정'});run(w,{operation:'refundPaid',id:w.operations.refundRequests[0].id});assert.equal(w.students[0].billing.cycleNumber,2);assert.equal(w.students[0].billing.received,931000);assert.equal(w.students[0].billing.refund,0);assert.equal(w.students[0].billingHistory[0].refund,100000);assert.equal(w.students[0].enrollment,undefined);
});
test('입금확인 취소는 새 수업 활동이 없을 때만 전 차수로 복원하며 과거 지급액을 보존한다',()=>{
 const w=fixture();confirm(w);pay(w,staffDues(w).find(r=>r.cycleNumber===1));const i=w.operations.invoices[0];run(w,{operation:'voidReceipt',studentId:'s',invoiceId:i.id,receiptId:'receipt',reason:'입금 확인 오류'});assert.equal(w.students[0].billing.cycleNumber,1);assert.equal(w.students[0].billing.paidOut,490000);assert.equal(w.students[0].billingHistory.length,0);confirm(w,'again');w.students[0].billing.sessions[0].status='completed';assert.throws(()=>run(w,{operation:'voidReceipt',studentId:'s',invoiceId:i.id,receiptId:'again',reason:'오류'}),/활동/);
});
test('급여 미설정 때 실제 조교비와 지급대기는 0, 가상 통계에만 100만원을 유지한다',t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(now)});
 const w=fixture();assert.equal(monthlyExpenses(getOperations(w),'2026-10').assistant,0);assert.equal(monthlyExpenses(getOperations(w),'2026-10',true).assistant,1000000);assert.equal(staffDues(w).filter(r=>r.kind==='salary').length,0);
 run(w,{operation:'staffSalary',name:'조교 예시',userId:'assistant-id',monthly:600000,startMonth:'2026-10',dueDay:15});const r=staffDues(w,'2026-10-20').find(r=>r.kind==='salary');assert.equal(r.balance,600000);pay(w,r);assert.equal(monthlyExpenses(getOperations(w),'2026-10').assistant,600000);assert.equal(staffDues(w).find(r=>r.kind==='salary').balance,0);assert.equal(staffOwnDues(w,{...owner,role:'assistant',userId:'assistant-id'}).length,1);assert.equal(staffOwnDues(w,{...owner,role:'assistant',userId:'other'}).length,0);
});
test('잘못 기록한 지급은 사유와 원본을 보존해 취소하고 미지급으로 복원한다',()=>{
 const w=fixture(),r=staffDues(w)[0];pay(w,r);run(w,{operation:'staffVoid',id:'pay',reason:'송금 대상 확인 오류'});assert.equal(staffDues(w)[0].balance,490000);assert.ok(w.operations.staffPayments[0].voidedAt);assert.equal(w.operations.staffPayments[0].reason,'송금 대상 확인 오류');
});
test('지급·환불·급여 변경은 원장·상우만 가능하고 학생 응답에는 내부 장부를 넣지 않는다',()=>{
 const w=fixture();for(const role of ['teacher','assistant','student','parent'])for(const operation of ['staffPaid','staffSalary','refundRequest','refundPaid','staffVoid','staffRecovery'])assert.throws(()=>run(w,{operation},{...owner,role}),/원장/);run(w,{operation:'staffSalary',name:'비공개 급여',monthly:777777,startMonth:'2026-10',dueDay:15});const p=visibleWorkspace(w,{...owner,role:'student',studentId:'s'});assert.equal(p.operations.staffSalaries,undefined);assert.equal(p.operations.staffPayments,undefined);assert.equal(p.operations.refundRequests,undefined);
});
test('7회 때 선납한 금액은 분리 보관하고 8회 완료 처리 시 새 차수에 연결한다',()=>{
 const w=fixture({count:7}),s=w.students[0];run(w,{operation:'invoice',studentId:'s',next:true,startDate:'2026-10-23',dueDate:'2026-10-20',discountPercent:5});confirm(w);assert.equal(s.billing.cycleNumber,1);assert.equal(s.billing.received,980000);s.billing.sessions[7].status='completed';startRenewal(w,s,getOperations(w,now).invoices[0],now);assert.equal(s.billing.cycleNumber,2);assert.equal(s.billing.received,931000);assert.equal(w.operations.invoices[0].activated,true);
});
test('시작 전 선납 환불은 미래 청구만 취소하고 현재 수강·강사비는 유지한다',()=>{
 const w=fixture({count:7}),s=w.students[0];run(w,{operation:'invoice',studentId:'s',next:true,startDate:'2026-10-23',dueDate:'2026-10-20',discountPercent:5});confirm(w);run(w,{operation:'refundRequest',studentId:'s',cycleNumber:2,amount:931000,reason:'다음 수강 취소'});run(w,{operation:'refundPaid',id:w.operations.refundRequests[0].id});assert.equal(s.billing.cycleNumber,1);assert.equal(s.billing.refund,0);assert.equal(s.enrollment,undefined);assert.ok(w.operations.invoices[0].cancelledAt);assert.equal(actualRevenue(w,['2026-10']).reduce((n,r)=>n+r.refunds,0),931000);
});
test('수동 조교비와 등록한 월 급여가 같은 달에 중복 비용으로 입력되는 것을 막는다',()=>{
 const w=fixture();run(w,{operation:'expense',category:'assistant',month:'2026-10',date:'2026-10-01',amount:500000});assert.throws(()=>run(w,{operation:'staffSalary',name:'중복',monthly:500000,startMonth:'2026-10',dueDay:15}),/수동/);run(w,{operation:'staffSalary',name:'다음달',monthly:500000,startMonth:'2026-11',dueDay:15});assert.throws(()=>run(w,{operation:'expense',category:'assistant',month:'2026-11',date:'2026-11-01',amount:500000}),/자동 반영/);assert.equal(monthlyExpenses(getOperations(w),'2026-11').assistant,500000);
});
