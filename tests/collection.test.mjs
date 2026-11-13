import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStudent} from '../app/lib/domain.ts';
import {assignmentIds,baseFee,chargedFee,discountPreview} from '../app/lib/billing.ts';
import {getOperations,reconcileRenewalInvoices,updateOperations,collectionTarget,sortCollectionStudents,invoiceStatus,paidInvoice,publicOperations,actualRevenue} from '../app/lib/operations.ts';
const now='2026-10-19T15:05:06.000Z',owner={role:'admin',name:'원장',userId:'owner',studentId:null};
function fixture({mode='teacher',cycle=3,discount=10,normalFee=baseFee(mode),count=8,end='2026-10-17'}={}){
 const s=makeStudent('검증 학생','s',false,'2026-09-20');s.billing={teacherId:mode==='teacher'?'kang':'director',mode,cycleNumber:cycle,discountPercent:discount,normalFee,startDate:'2026-09-20',endDate:end,sessions:Array.from({length:8},(_,i)=>({id:String(i),date:'2026-10-01',time:'16:00',status:i<count?'completed':'scheduled'})),received:0,refund:0,scenario:'test'};s.billing.received=chargedFee(s.billing);
 return {students:[s],themes:[],consultations:[],updatedAt:now};
}
const run=(w,b,v=owner,time=now)=>updateOperations(w,v,b,time);
function body(w,id='click-1'){const t=collectionTarget(w.students[0],getOperations(w,now));return {operation:'confirmReceipt',studentId:'s',cycleNumber:t.cycleNumber,expectedAmount:t.balance,expectedDiscount:t.discountPercent,requestId:id};}
test('8회 완료에만 다음 차수 자동 청구, 같은 학생·차수에는 한 건만 생성한다',()=>{
 const w=fixture({count:7});assert.equal(getOperations(w,now).invoices.length,0);w.students[0].billing.sessions[7].status='completed';const projected=getOperations(w,now);assert.equal(projected.invoices.length,1);assert.equal(w.operations,undefined);reconcileRenewalInvoices(w,now);reconcileRenewalInvoices(w,now);assert.equal(w.operations.invoices.length,1);assert.equal(w.operations.invoices[0].cycleNumber,4);assert.equal(invoiceStatus(w.operations.invoices[0],'2026-12-01'),'입금대기');w.students[0].billing.sessions[7].status='scheduled';assert.equal(getOperations(w,now).invoices.length,0);
});
test('중도종료·졸업은 자동 재청구하지 않고 정상 수강자만 순서대로 청구한다',()=>{
 for(const status of ['withdrawn','graduated']){const w=fixture();w.students[0].enrollment={status};assert.equal(getOperations(w,now).invoices.length,0);assert.equal(collectionTarget(w.students[0],getOperations(w,now)),null);}
});
test('온라인·대면 원장·대면 강사와 개별 정상가 모두 정확한 원 단위 할인 금액을 받는다',()=>{
 for(const mode of ['online','director','teacher'])for(const normalFee of [baseFee(mode),987651]){
  const w=fixture({mode,normalFee}),s=w.students[0];for(const id of assignmentIds(s.billing))s.marks[id]={status:'approved'};
  const t=collectionTarget(s,getOperations(w,now));assert.equal(t.discountPercent,15);assert.equal(t.amount,Math.round(normalFee*.85));assert.equal(discountPreview(s,'2026-10-20').nextFee,t.amount);
  run(w,body(w));const invoice=w.operations.invoices[0];assert.equal(paidInvoice(invoice),t.amount);assert.equal(s.billing.received,chargedFee(s.billing));
 }
});
test('첫 수강 다음은 5%, 실패 후 5% 복귀, 최대 20% 유지한다',()=>{
 const first=fixture({cycle:1,discount:0});assert.equal(collectionTarget(first.students[0],getOperations(first,now)).discountPercent,5);
 const fail=fixture({discount:20});assert.equal(collectionTarget(fail.students[0],getOperations(fail,now)).discountPercent,5);
 const max=fixture({discount:20});for(const id of assignmentIds(max.students[0].billing))max.students[0].marks[id]={status:'approved'};assert.equal(collectionTarget(max.students[0],getOperations(max,now)).discountPercent,20);
});
test('확인 시각의 한국 날짜로 전액 기록하고, 같은 요청·다른 탭의 중복 확인을 막는다',()=>{
 const w=fixture(),b=body(w);run(w,b);run(w,b);const i=w.operations.invoices[0];assert.equal(i.payments.length,1);assert.equal(i.payments[0].date,'2026-10-20');assert.equal(i.payments[0].at,now);assert.equal(i.payments[0].confirmationDate,true);assert.equal(i.payments[0].actor,'원장');assert.throws(()=>run(w,{...b,requestId:'another-tab'}),/미납/);assert.throws(()=>run(w,{...b,expectedAmount:1}),/내용/);assert.equal(actualRevenue(w,['2026-10']).reduce((n,r)=>n+r.receipts,0),931000);
});
test('현재 차수 일부 입금은 기존 금액을 보존하고 남은 금액만 한 번에 확인한다',()=>{
 const w=fixture({count:4}),s=w.students[0];s.billing.received=100000;const t=collectionTarget(s,getOperations(w,now));assert.equal(t.balance,782000);run(w,body(w));assert.equal(s.billing.received,882000);assert.equal(w.operations.invoices[0].openingCredit,100000);assert.equal(w.operations.invoices[0].payments[0].amount,782000);
});
test('할인 확인대기는 금액을 확정하거나 입금을 기록하지 않으며, 확인 완료 후 새 금액으로만 기록한다',()=>{
 const w=fixture(),s=w.students[0],ids=assignmentIds(s.billing);ids.slice(0,66).forEach(id=>s.marks[id]={status:'approved'});ids.slice(66,72).forEach(id=>s.marks[id]={status:'submitted'});
 const pending=body(w);assert.equal(collectionTarget(s,getOperations(w,now)).pending,true);assert.throws(()=>run(w,pending),/할인율/);assert.equal(w.operations.invoices[0].payments.length,0);
 ids.slice(66,72).forEach(id=>s.marks[id]={status:'approved'});assert.throws(()=>run(w,pending),/변경/);run(w,body(w,'resolved'));assert.equal(w.operations.invoices[0].amount,833000);
});
test('8회 완료 미납 학생을 최상단, 이미 낸 학생은 아래로 정렬하고 검색 원본은 보존한다',()=>{
 const w=fixture(),s=w.students[0],other=fixture({count:7}).students[0];other.id='other';other.name='가나다';w.students=[other,s];const before=w.students.map(s=>s.id);assert.equal(sortCollectionStudents(w.students,getOperations(w,now))[0].id,'s');assert.deepEqual(w.students.map(s=>s.id),before);run(w,{operation:'confirmReceipt',studentId:'s',cycleNumber:4,expectedAmount:931000,expectedDiscount:5,requestId:'paid'});assert.equal(collectionTarget(s,getOperations(w,now)),null);assert.equal(s.billing.cycleNumber,4);assert.equal(s.billing.sessions.filter(x=>x.status==='completed').length,0);
});
test('입금 취소 이력은 보관하고 재확인 가능하며 학생은 본인 청구 상태만 조회한다',()=>{
 const w=fixture(),s=w.students[0];run(w,body(w));let i=w.operations.invoices[0];run(w,{operation:'voidReceipt',studentId:'s',invoiceId:i.id,receiptId:'click-1',reason:'확인 오류'});i=w.operations.invoices[0];assert.ok(i.payments[0].voidedAt);assert.equal(paidInvoice(i),0);run(w,body(w,'retry'));assert.equal(w.operations.invoices[0].payments.length,2);const visible=publicOperations(w,{...owner,role:'student',studentId:'s'});assert.equal(invoiceStatus(visible.invoices[0]),'입금완료');assert.equal(visible.invoices[0].payments[1].actor,'');for(const role of ['student','parent','teacher','assistant'])assert.throws(()=>run(w,{operation:'confirmReceipt',studentId:'s',requestId:'forbidden'},{...owner,role}),/원장/);
});
