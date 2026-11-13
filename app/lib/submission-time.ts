import type {Student,Mark} from './domain.ts';
export function koreaClock(now=new Date()){const d=new Date(now.getTime()+9*3600000);return {date:d.toISOString().slice(0,10),time:d.toISOString().slice(11,19)};}
const previous=(date:string)=>new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);
export function assignmentDay(now=new Date()){const clock=koreaClock(now);return clock.time<'05:00:00'?previous(clock.date):clock.date;}
export function submissionTiming(s:Student,requestedId:string,now=new Date(),dueDate?:string){
 const clock=koreaClock(now),daily=requestedId.match(/^daily:(\d{4}-\d{2}-\d{2}):(wake|problems|writing)$/);
 let taskId=requestedId,date=daily?.[1]??dueDate;
 if(date&&(!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date))throw new Error('과제 날짜를 확인해 주세요.');
 if(daily&&date!>clock.date)throw new Error('미래 날짜 과제에는 제출할 수 없습니다.');
 if(daily&&clock.time<'05:00:00'&&date===clock.date){date=previous(clock.date);taskId=`daily:${date}:${daily[2]}`;}
 if(daily?.[2]==='wake'&&date!==clock.date)throw new Error('기상 인증은 당일 05:00~06:30에만 제출할 수 있으며 지각 제출은 할 수 없습니다.');
 if(date&&date<s.startDate)throw new Error('정규 시작일 이전 과제에는 제출할 수 없습니다.');
 const old=s.marks[taskId],oldOnTime=old?.onTimeSubmittedAt??(old?.submittedAt&&!old.late?old.submittedAt:undefined);
 const late=!!date&&date<clock.date&&!oldOnTime;
 return {taskId,date,late,submittedAt:now.toISOString(),onTimeSubmittedAt:oldOnTime??(!late?now.toISOString():undefined),prev:old};
}
export function validWake(time:unknown,now=new Date()){
 const value=String(time),clock=koreaClock(now);
 return /^\d{2}:\d{2}$/.test(value)&&value>='05:00'&&value<='06:30'&&clock.time>='05:00:00'&&clock.time<'06:31:00';
}
// Learning can be verified even when a late submission earns no daily credit.
export function reviewedSubmission(_prev:Mark|undefined,status:Mark['status']){return status;}
export function creditMark(mark?:Mark):Mark|undefined{return mark?.late?{...mark,status:'missed'}:mark;}
