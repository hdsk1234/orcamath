import {addDays,dailyTasks,todayKST,themeLabel,type Student,type Theme} from './domain.ts';
import {hasMakeup,carriedMakeups} from './lesson-attendance.ts';
import {feedbackTasks} from './learning-feedback.ts';

export function dailyLearningTrend(student:Student,themes:Theme[],days=7,today=todayKST()){
 const range=[7,14,30].includes(days)?days:7;
 const points=Array.from({length:range},(_,index)=>{
  const date=addDays(today,index-range+1),tasks=feedbackTasks(student,themes,date,today),current=date===today;
  const approved=tasks.filter(t=>t.mark?.status==='approved').length,pending=tasks.filter(t=>t.mark?.status==='submitted').length;
  const incomplete=tasks.length-approved-pending,denominator=current?tasks.length:tasks.length-pending;
  // The open day is progress, not a failed day. A past day awaiting all reviews has no verdict.
  const rate=denominator?approved/denominator*100:null;
  const status=!tasks.length?'unassigned':current?'ongoing':pending===tasks.length?'pending':'confirmed';
  return {date,rate,total:tasks.length,approved,pending,incomplete,current,status,tasks};
 });
 const closed=points.filter(p=>!p.current&&p.rate!==null);
 const average=closed.length?Math.round(closed.reduce((n,p)=>n+p.rate!,0)/closed.length):null;
 return {points,average,confirmedDays:closed.length,pending:points.reduce((n,p)=>n+p.pending,0),perfectDays:points.filter(p=>!p.current&&p.total>0&&p.approved===p.total).length};
}

export function testScoreTrend(student:Student,themes:Theme[]){
 const entries=Object.entries(student.marks).filter(([id,mark])=>id.endsWith(':test')&&mark.status==='approved');
 const points=entries.flatMap(([id,mark])=>{
  if(typeof mark.score!=='number'||!Number.isFinite(mark.score)||mark.score<0||mark.score>100)return [];
  const themeId=id.slice(0,-5),theme=themes.find(t=>t.id===themeId);
  let date:string|null=null;
  if(mark.reviewedAt&&Number.isFinite(Date.parse(mark.reviewedAt)))date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date(mark.reviewedAt));
  return [{id,themeId,label:theme?themeLabel(theme):themeId,shortLabel:theme?`Theme ${theme.number}`:themeId,name:theme?.title||theme?.subject||themeId,subject:theme?.subject??'',score:mark.score,date,reviewedAt:date?mark.reviewedAt!:null,order:theme?themes.indexOf(theme):Number.MAX_SAFE_INTEGER}];
 }).sort((a,b)=>a.reviewedAt&&b.reviewedAt?Date.parse(a.reviewedAt)-Date.parse(b.reviewedAt)||a.id.localeCompare(b.id):!a.reviewedAt&&!b.reviewedAt?a.order-b.order||a.id.localeCompare(b.id):a.reviewedAt?1:-1);
 const average=points.length?Math.round(points.reduce((n,p)=>n+p.score,0)/points.length):null;
 return {points,average,missingScore:entries.filter(([,m])=>m.score===undefined||m.score===null).length,undated:points.filter(p=>!p.date).length};
}
export type TestRange=10|30|'all';
export function testRangePoints(points:ReturnType<typeof testScoreTrend>['points'],range:TestRange){return range==='all'?points:points.slice(-range);}
export const FIXED_TASK_LABELS={wake:'기상',problems:'30문제',writing:'해설쓰기'} as const;
export type CalendarTaskState='done'|'pending'|'revision'|'missed'|'late'|'remaining'|'unassigned';
export function learningHistoryStart(student:Student,today=todayKST()){
 const dates=Object.keys(student.marks).flatMap(id=>{const m=/^daily:(\d{4}-\d{2}-\d{2}):(wake|problems|writing)$/.exec(id);return m&&m[1]<=today?[m[1]]:[];});
 return [student.startDate,...dates].filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<=today).sort()[0]??today;
}
export function calendarDay(student:Student,date:string,today=todayKST()){
 const current=date===today,future=date>today,hasRecord=['wake','problems','writing'].some(k=>!!student.marks[`daily:${date}:${k}`]),assigned=!future&&(date>=student.startDate||hasRecord);
 const tasks=dailyTasks(student,date).map(t=>{const status:CalendarTaskState=!assigned?'unassigned':t.mark?.late?(t.kind==='problems'||t.kind==='writing'?'late':'missed'):t.mark?.status==='approved'?'done':t.mark?.status==='submitted'?'pending':t.mark?.status==='revision'?'revision':t.mark?.status==='missed'?'missed':current?'remaining':'missed';return {...t,label:FIXED_TASK_LABELS[t.kind as keyof typeof FIXED_TASK_LABELS],status};});
 const approved=tasks.filter(t=>t.status==='done').length,pending=tasks.filter(t=>t.status==='pending').length;
 return {date,current,future,assigned,tasks,approved,pending,total:assigned?3:0,rate:assigned?approved/3*100:null,provisional:current||pending>0};
}
export function calendarMonth(student:Student,month:string,today=todayKST()){
 const valid=/^\d{4}-(0[1-9]|1[0-2])$/.test(month),key=valid?month:today.slice(0,7),[year,n]=key.split('-').map(Number),last=new Date(Date.UTC(year,n,0)).getUTCDate(),offset=new Date(Date.UTC(year,n-1,1)).getUTCDay();
 const days=Array.from({length:last},(_,i)=>calendarDay(student,`${key}-${String(i+1).padStart(2,'0')}`,today)),closed=days.filter(d=>d.assigned&&!d.current&&d.pending===0),assigned=days.filter(d=>d.assigned);
 return {month:key,offset,days,average:closed.length?Math.round(closed.reduce((a,d)=>a+(d.rate??0),0)/closed.length):null,confirmedDays:closed.length,perfectDays:days.filter(d=>d.assigned&&!d.current&&d.approved===3).length,pending:days.reduce((a,d)=>a+d.pending,0),completed:assigned.reduce((a,d)=>a+d.approved,0),total:assigned.length*3};
}
export function calendarYear(student:Student,year:number,today=todayKST()){return Array.from({length:12},(_,i)=>calendarMonth(student,`${year}-${String(i+1).padStart(2,'0')}`,today));}

export type CalendarLesson={id:string;date:string;time:string;round:number;kind:'lesson'|'makeup';status:'scheduled'|'completed'|'excused'|'no_show'|'cancelled';originalDate?:string;reason?:string;deducted?:boolean;cycleNumber?:number;teacherId?:string;mode?:import('./billing.ts').CourseMode};
export function calendarLessons(student:Student){
 const billing=student.billing;if(!billing)return [];
 const events:CalendarLesson[]=[];
 billing.sessions.forEach((session,index)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(session.date))return;
  events.push({id:session.id,date:session.date,time:session.time,round:index+1,kind:'lesson',status:billing.stopped&&session.status==='scheduled'?'cancelled':session.status,reason:session.reason,deducted:session.status==='no_show'});
  if(hasMakeup(session)&&session.makeupDate&&/^\d{4}-\d{2}-\d{2}$/.test(session.makeupDate))events.push({id:session.id+'-makeup',date:session.makeupDate,time:session.makeupTime??'',round:index+1,kind:'makeup',status:session.makeupCompleted?'completed':billing.stopped?'cancelled':'scheduled',originalDate:session.date,reason:session.reason,deducted:session.status==='no_show'});
 });
 for(const c of carriedMakeups(student)){const x=c.session;if(x.makeupDate)events.push({id:`carry-${c.cycleNumber}-${x.id}`,date:x.makeupDate,time:x.makeupTime??'',round:c.round,kind:'makeup',status:x.makeupCompleted?'completed':c.stopped?'cancelled':'scheduled',originalDate:x.date,reason:x.reason,deducted:true,cycleNumber:c.cycleNumber,teacherId:c.teacherId,mode:c.mode});}
 return events.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.round-b.round);
}
export function learningCalendarBounds(student:Student,today=todayKST()){
 const dates=calendarLessons(student).map(e=>e.date);
 return {minMonth:[learningHistoryStart(student,today),...dates].sort()[0].slice(0,7),maxMonth:[today,...dates].sort().at(-1)!.slice(0,7)};
}
