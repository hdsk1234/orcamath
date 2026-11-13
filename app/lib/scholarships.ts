import {baseFee,chargedFee,type CourseMode} from './billing.ts';
import {todayKST,type Student,type Workspace} from './domain.ts';
export type ScholarshipRecord={id:string;cycleNumber:number;startDate:string;endDate:string;mode:CourseMode;normalFee:number;discountPercent:number;charged:number;received?:number;refund?:number;earned:number;reversed:number;unpaidBenefit:number;source:'current'|'confirmed';recordedAt:string;note?:string};
const modes:CourseMode[]=['online','director','teacher'];
const amounts=(normal:number,charged:number,received:number,refund:number)=>{
 const discount=Math.max(0,normal-charged),paid=Math.min(charged,Math.max(0,received)),net=Math.max(0,paid-refund);
 const gross=charged>0?Math.round(discount*paid/charged):0,earned=charged>0?Math.round(discount*net/charged):0;
 return {earned,reversed:Math.max(0,gross-earned),unpaidBenefit:Math.max(0,discount-gross)};
};
export function currentScholarship(student:Student):ScholarshipRecord|null{
 const b=student.billing;if(!b)return null;
 const id=`cycle-${b.cycleNumber}-${b.startDate}`,old=student.scholarships?.find(r=>r.id===id&&r.source==='current');
 const normalFee=old&&old.mode===b.mode?old.normalFee:b.normalFee??baseFee(b.mode),charged=chargedFee(b);
 return {id,cycleNumber:b.cycleNumber,startDate:b.startDate,endDate:b.endDate,mode:b.mode,normalFee,discountPercent:b.discountPercent,charged,received:b.received,refund:b.refund,...amounts(normalFee,charged,b.received,b.refund),source:'current',recordedAt:old?.recordedAt??''};
}
export function scholarshipRecords(student:Student){
 const records=[...(student.scholarships??[])],current=currentScholarship(student);
 if(current){const i=records.findIndex(r=>r.id===current.id);if(i<0)records.push(current);else records[i]=current;}
 return [...new Map(records.map(r=>[r.id,r])).values()].sort((a,b)=>b.cycleNumber-a.cycleNumber||b.startDate.localeCompare(a.startDate));
}
export function scholarshipSummary(student:Student){
 const records=scholarshipRecords(student),currentId=currentScholarship(student)?.id??records.find(r=>r.source==='current')?.id,current=records.find(r=>r.id===currentId);
 return {records,total:records.reduce((n,r)=>n+r.earned,0),current:current?.earned??0,reversed:records.reduce((n,r)=>n+r.reversed,0),unpaidBenefit:current?.unpaidBenefit??0,missingHistory:Math.max(0,(student.billing?.cycleNumber??current?.cycleNumber??0)-records.length),knownCycles:records.length};
}
export function needsScholarshipSync(workspace:Workspace){return workspace.students.some(s=>{const current=currentScholarship(s);if(!current)return false;if(s.billing?.normalFee===undefined)return true;const old=s.scholarships?.find(r=>r.id===current.id);return !old||JSON.stringify({...old,recordedAt:''})!==JSON.stringify({...current,recordedAt:''});});}
export function reconcileScholarships(workspace:Workspace){
 for(const s of workspace.students){if(s.billing)s.billing.normalFee??=baseFee(s.billing.mode);const current=currentScholarship(s);if(!current)continue;s.scholarships??=[];for(const row of s.scholarships)if(row.source==='current'&&row.id!==current.id)row.source='confirmed';const i=s.scholarships.findIndex(r=>r.id===current.id),old=s.scholarships[i];
  if(!old||JSON.stringify({...old,recordedAt:''})!==JSON.stringify({...current,recordedAt:''})){current.recordedAt=new Date().toISOString();if(i<0)s.scholarships.push(current);else s.scholarships[i]=current;}
 }
}
const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function saveScholarshipHistory(student:Student,input:Record<string,unknown>,today=todayKST()){
 const mode=input.mode as CourseMode,cycleNumber=Number(input.cycleNumber),discountPercent=Number(input.discountPercent),startDate=String(input.startDate??''),endDate=String(input.endDate??'');
 if(!modes.includes(mode)||!Number.isInteger(cycleNumber)||cycleNumber<1||cycleNumber>999||![0,5,10,15,20].includes(discountPercent))throw new Error('수강 종류·수강 번호·할인율을 확인해 주세요.');
 if(!validDate(startDate)||!validDate(endDate)||startDate>endDate||endDate>=today)throw new Error('실제로 종료된 과거 수강 기간을 입력해 주세요.');
 if(student.billing&&(endDate>=student.billing.startDate||cycleNumber>=student.billing.cycleNumber))throw new Error('현재 수강보다 이전인 수강 내역만 등록할 수 있습니다.');
 const recordId=String(input.recordId??''),old=recordId?student.scholarships?.find(r=>r.id===recordId):undefined;
 if(recordId&&(!old||old.source!=='confirmed'))throw new Error('현재 수강은 수납·환불 화면에서 수정해 주세요.');
 const normalFee=input.normalFee===undefined?(old&&old.mode===mode?old.normalFee:baseFee(mode)):Number(input.normalFee),charged=Math.round(normalFee*(100-discountPercent)/100),received=Number(input.received),refund=Number(input.refund);
 if(!Number.isSafeInteger(normalFee)||normalFee<1||normalFee>10000000)throw new Error('당시 정상가는 1~10,000,000원의 정수로 입력해 주세요.');
 if(![received,refund].every(n=>Number.isSafeInteger(n)&&n>=0)||received>charged||refund>received)throw new Error('납부액은 할인 수강료 이하, 환불액은 납부액 이하로 입력해 주세요.');
 if(old&&(old.cycleNumber!==cycleNumber||old.startDate!==startDate))throw new Error('기존 내역의 수강 번호와 시작일은 변경할 수 없습니다.');
 if((student.scholarships??[]).some(r=>r.id!==old?.id&&(r.cycleNumber===cycleNumber||(startDate<=r.endDate&&endDate>=r.startDate))))throw new Error('이미 등록된 수강 번호 또는 기간입니다. 기존 내역을 수정해 주세요.');
 const record:ScholarshipRecord={id:old?.id??`cycle-${cycleNumber}-${startDate}`,cycleNumber,startDate,endDate,mode,normalFee,discountPercent,charged,received,refund,...amounts(normalFee,charged,received,refund),source:'confirmed',recordedAt:new Date().toISOString(),note:typeof input.note==='string'?input.note.trim().slice(0,500):''};
 student.scholarships??=[];const i=student.scholarships.findIndex(r=>r.id===record.id);if(i<0)student.scholarships.push(record);else student.scholarships[i]=record;
 return record;
}
export function publicScholarshipRecords(records?:ScholarshipRecord[]){return records?.map(({received,refund,note,...visible})=>visible);}
