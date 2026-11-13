import {hasMakeup} from './lesson-attendance.ts';
import type {Student,Viewer,Workspace} from './domain.ts';

const dateOK=(s:string)=>/^20\d{2}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function rescheduleLesson(w:Workspace,s:Student,v:Viewer,input:Record<string,unknown>,now=new Date().toISOString()){
 if(!['admin','manager'].includes(v.role))throw Error('원장·총괄관리자만 수업 일정을 변경할 수 있습니다.');
 const b=s.billing;
 if(!b||b.stopped||b.settlementClosed||(s.enrollment&&s.enrollment.status!=='active'))throw Error('진행 중인 수강의 예정 수업만 변경할 수 있습니다.');
 const x=b.sessions.find(x=>x.id===input.sessionId);
 if(!x||x.status!=='scheduled')throw Error('변경할 예정 수업을 다시 선택해 주세요.');
 if(input.cycleNumber!==b.cycleNumber||input.expectedDate!==x.date||input.expectedTime!==x.time)throw Error('다른 관리자가 일정을 변경했습니다. 최신 일정을 확인하고 다시 저장해 주세요.');
 const date=typeof input.date==='string'?input.date:'',time=typeof input.time==='string'?input.time:'';
 if(!dateOK(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('올바른 수업 날짜와 시간을 입력해 주세요.');
 if(x.date===date&&x.time===time)return;
 if([...(s.billingHistory??[]),b].filter(b=>!b.stopped).flatMap(b=>b.sessions).some(y=>y.id!==x.id&&((y.status==='scheduled'&&y.date===date&&y.time===time)||(hasMakeup(y)&&!y.makeupCompleted&&y.makeupDate===date&&y.makeupTime===time))))throw Error('같은 시간에 이 학생의 다른 수업·보강이 있습니다.');
 const note=`${b.cycleNumber}차 ${b.sessions.indexOf(x)+1}회차 · ${x.date} ${x.time} → ${date} ${time}`;
 x.date=date;x.time=time;
 const o=w.operations??={invoices:[],expenses:[],alumni:[],events:[]};
 o.events.push({id:crypto.randomUUID(),type:'schedule',studentId:s.id,amount:0,date:new Date(now).toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),actor:v.name,note});
}
