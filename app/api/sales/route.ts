import {identity,loadWorkspace,mutateWorkspace,checkOrigin,json,failure,AppError} from '../../lib/server';
import {captureFirstEnrollment,consultationFinancials,type SaleConsultation} from '../../lib/admissions';
import {financials} from '../../lib/billing';
import {isManagement} from '../../lib/permissions';
const clean=(v:unknown,n=1000)=>typeof v==='string'?v.trim().slice(0,n):'';
export async function GET(){try{const {viewer,workspaceId}=await identity();const management=isManagement(viewer.role);if(!management&&!(viewer.role==='teacher'&&viewer.teacherId==='byun'))throw new AppError(403,'본인 상담 내역만 조회할 수 있습니다.');const {workspace:w}=await loadWorkspace(workspaceId);const records=(w.salesConsultations??[]).filter(c=>management||c.consultantId===viewer.teacherId).map(c=>({...c,studentName:w.students.find(s=>s.id===c.studentId)?.name??'학생',demo:!!w.students.find(s=>s.id===c.studentId)?.demo,beginner:!!w.students.find(s=>s.id===c.studentId)?.beginner,ownTeachingEarned:(()=>{const s=w.students.find(s=>s.id===c.studentId),b=s?.billing;return b?.teacherId==='byun'&&b.startDate===c.firstCycleStart?financials(b).teacher:undefined;})()}));return json({records,management,students:management?w.students.map(s=>({id:s.id,name:s.name,demo:s.demo,hasBilling:!!s.billing,firstCycle:s.billing?.cycleNumber===1})):[]});}catch(e){return failure(e);}}
export async function POST(r:Request){try{checkOrigin(r);const {viewer,workspaceId}=await identity(),management=isManagement(viewer.role);if(!management&&!(viewer.role==='teacher'&&viewer.teacherId==='byun'))throw new AppError(403,'상담 내역을 변경할 권한이 없습니다.');const body=await r.json() as Record<string,unknown>,action=clean(body.action,30);const updated=await mutateWorkspace(workspaceId,w=>{
 const list=w.salesConsultations??=[];let c=list.find(c=>c.id===body.id);
 if(!management&&(!c||c.consultantId!==viewer.teacherId))throw new AppError(403,'배정된 본인 상담만 수정할 수 있습니다.');
 if(action==='save'){
  if(c?.confirmedAmount!==undefined)throw new AppError(409,'확정한 상담 수수료의 기초 내역은 변경할 수 없습니다.');
  const status=clean(body.status,30);if(!['scheduled','done','enrolled'].includes(status))throw new AppError(400,'상담 상태를 확인해 주세요.');if(!management&&status==='enrolled')throw new AppError(403,'등록 성사는 관리자가 실제 결제를 확인한 뒤 기록합니다.');
  const date=clean(body.date,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date)))throw new AppError(400,'상담 날짜를 입력해 주세요.');
  if(c?.status==='enrolled'&&status!=='enrolled')throw new AppError(409,'등록 성사 기록은 이전 상담 상태로 되돌릴 수 없습니다.');
  const studentId=c?.studentId??clean(body.studentId,100),s=w.students.find(s=>s.id===studentId);if(!s)throw new AppError(400,'상담 학생을 선택해 주세요.');
  if(!c&&list.some(x=>x.studentId===studentId))throw new AppError(409,'이미 상담 내역이 있습니다. 기존 내역을 수정해 주세요.');
  const draft:SaleConsultation={...(c??{id:crypto.randomUUID(),studentId,consultantId:'byun',mode:s.billing?.mode??'online',createdAt:new Date().toISOString()}),date,note:clean(body.note),status:status as SaleConsultation['status']};
  let next=draft;if(status==='enrolled'){try{next=captureFirstEnrollment(draft,s);}catch(e){throw new AppError(400,(e as Error).message);}}
  if(c)list[list.indexOf(c)]=next;else list.push(next);return {id:next.id};
 }
 if(!management)throw new AppError(403,'수수료 확정·지급 기록은 원장·총괄관리자가 처리합니다.');if(!c)throw new AppError(404,'상담 내역을 찾을 수 없습니다.');
 if(action==='confirm'){
  if(c.confirmedAmount!==undefined)throw new AppError(409,'이미 확정된 수수료입니다.');const s=w.students.find(s=>s.id===c!.studentId);if(s&&s.billing&&c.firstCycleStart&&s.billing.startDate===c.firstCycleStart){c=captureFirstEnrollment(c,s);list[list.findIndex(x=>x.id===c!.id)]=c;if(!s.billing!.settlementClosed)throw new AppError(409,'첫 달 수업 정산을 먼저 확정해 주세요.');}
  const f=consultationFinancials(c);if(!f.eligible)throw new AppError(400,'첫 달 실제 결제와 정상 수강료 기록이 필요합니다.');if(f.refundPending)throw new AppError(409,'환불 시 수수료 기준이 미정입니다. 유지 또는 미지급을 먼저 결정해 주세요.');c.confirmedAmount=f.amount;return {};
 }
 if(action==='refundDecision'){if(c.confirmedAmount!==undefined)throw new AppError(409,'확정된 내역입니다.');if(!['keep','waive'].includes(String(body.decision)))throw new AppError(400,'환불 수수료 처리 방법을 선택해 주세요.');if(!(c.firstRefund??0))throw new AppError(400,'환불 기록이 있는 상담만 처리할 수 있습니다.');c.refundDecision=body.decision as 'keep'|'waive';return {};}
 if(action==='paid'){const f=consultationFinancials(c);if(!f.confirmed)throw new AppError(409,'수수료를 먼저 확정해 주세요.');c.paid=f.amount;return {};}
 throw new AppError(400,'상담 처리 방법을 확인해 주세요.');
 });return json({ok:true,...updated.result});}catch(e){return failure(e);}}
