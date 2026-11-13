import type {Student,Workspace,Viewer} from './domain.ts';
import {type LessonSession} from './billing.ts';

const dateOK=(s:string)=>/^20\d{2}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const clean=(v:unknown,n=300)=>typeof v==='string'?v.trim().slice(0,n):'';
export const hasMakeup=(x:LessonSession)=>x.status==='excused'||(x.status==='no_show'&&(x.makeupBooked===true||!!x.makeupDate));
export function carriedMakeups(s:Student){return s.billingHistory?s.billingHistory.flatMap(b=>b.sessions.flatMap((x,i)=>x.status==='no_show'&&hasMakeup(x)?[{cycleNumber:b.cycleNumber,round:i+1,session:{...x},teacherId:b.teacherId,mode:b.mode,stopped:!!b.stopped}]:[])):(s.carriedMakeups??[]);}
export function updateLessonAttendance(w:Workspace,s:Student,v:Viewer,input:Record<string,unknown>,now=new Date().toISOString()){
 if(!['admin','manager'].includes(v.role))throw Error('원장·총괄관리자만 수업 기록을 변경할 수 있습니다.');
 const archived=input.cycleNumber!==undefined&&input.cycleNumber!==s.billing?.cycleNumber;
 const b=archived?s.billingHistory?.find(b=>b.cycleNumber===input.cycleNumber):s.billing;
 if(!b||b.stopped||s.enrollment&&s.enrollment.status!=='active')throw Error('진행 중인 학생의 수업·보강만 변경할 수 있습니다.');
 const x=b.sessions.find(x=>x.id===input.sessionId);if(!x)throw Error('수업을 찾을 수 없습니다.');
 if(input.expectedSession!==undefined&&input.expectedSession!==JSON.stringify(x))throw Error('다른 관리자가 수업 기록을 변경했습니다. 최신 기록을 확인하고 다시 저장해 주세요.');
 const status=String(input.status) as LessonSession['status'];
 if(!['scheduled','completed','excused','no_show'].includes(status))throw Error('수업 상태를 확인해 주세요.');
 if(archived||b.settlementClosed){if(x.status!=='no_show'||!hasMakeup(x)||status!=='no_show'||input.makeupBooked!==true)throw Error('정산 확정된 기록은 변경할 수 없습니다. 남은 차감 후 보강의 일정·완료만 수정할 수 있습니다.');}
 const reason=archived||b.settlementClosed?x.reason:clean(input.reason);
 if(['excused','no_show'].includes(status)&&!reason)throw Error('결석·취소 처리 사유를 입력해 주세요.');
 const booked=status==='excused'||status==='no_show'&&input.makeupBooked===true,date=booked?clean(input.makeupDate,10):'',time=booked?clean(input.makeupTime,5):'',done=input.makeupCompleted===true;
 if(booked&&((date||time)&&(!dateOK(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))))throw Error('보강 날짜와 시간을 함께 확인해 주세요.');
 if(done&&(!booked||!date||!time))throw Error('보강 일정이 있어야 진행 완료로 처리할 수 있습니다.');
 if(booked&&date){const all=[...(s.billingHistory??[]),...(s.billing?[s.billing]:[])];if(all.some(b=>!b.stopped&&b.sessions.some(y=>y!==x&&((y.status==='scheduled'&&y.date===date&&y.time===time)||(hasMakeup(y)&&!y.makeupCompleted&&y.makeupDate===date&&y.makeupTime===time)))))throw Error('같은 시간에 이 학생의 다른 수업·보강이 있습니다.');}
 const before=JSON.stringify(x);Object.assign(x,{status,reason,makeupBooked:booked,makeupDate:date||undefined,makeupTime:time||undefined,makeupCompleted:booked&&done});
 if(JSON.stringify(x)!==before){const o=w.operations??={invoices:[],expenses:[],alumni:[],events:[]};o.events.push({id:crypto.randomUUID(),type:'attendance',studentId:s.id,amount:0,date:new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),actor:v.name,note:`${b.cycleNumber}차 ${b.sessions.indexOf(x)+1}회차 · ${status==='no_show'?'당일취소·무단결석 1회 차감':status==='excused'?'인정 결석 · 보강 전 미차감':status==='completed'?'수업 완료':'수업 예정'}${booked?` · ${date?date+' '+time:'보강 일정 조율 중'}${done?' · 보강 완료':''}`:''}`});}
}
