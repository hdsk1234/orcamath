import {addDays,todayKST,type Student,type Theme,type Mark} from './domain.ts';
import {feedbackTasks} from './learning-feedback.ts';
export const RANK_DAYS=30;
export const RANK_MIN_DAYS=7;
export const WRITING_POINTS=10,WRITING_DAILY_CAP=5,COMPLETE_DAY_POINTS=10,STREAK_DAY_POINTS=5;
export function writingQuantity(mark?:Mark){
 if(mark?.status!=='approved')return null;
 const value=mark.confirmedWritingCount??mark.value;
 if(value===undefined||value===null||value==='')return null;
 const n=typeof value==='number'?value:typeof value==='string'&&/^\d+$/.test(value)?Number(value):NaN;
 return Number.isSafeInteger(n)&&n>=0&&n<=500?n:null;
}
export function studentPerformance(student:Student,themes:Theme[],today=todayKST()){
 const closure=student as Student&{rankingInactive?:boolean;rankingClosedDate?:string};
 const inactive=!!student.billing?.stopped||!!closure.rankingInactive,closedDate=student.billing?.refundDate?.slice(0,10)??closure.rankingClosedDate;
 const start=addDays(today,-RANK_DAYS),end=addDays(today,-1),entries=new Map<string,Mark|undefined>();
 let days=0,completeDays=0,streak=0,longestStreak=0,writingItems=0,creditedWritingItems=0,missingQuantity=0;
 const writingSeen=new Set<string>();
 for(let date=start;date<=end;date=addDays(date,1)){
  if(inactive&&closedDate&&date>closedDate){streak=0;continue;}
  const tasks=feedbackTasks(student,themes,date,today);
  if(!tasks.length){streak=0;continue;}days++;
  for(const task of tasks){entries.set(task.id,task.mark);if(task.kind==='writing'&&task.mark?.status==='approved'&&!writingSeen.has(task.id)){writingSeen.add(task.id);const count=writingQuantity(task.mark);if(count===null)missingQuantity++;else{writingItems+=count;creditedWritingItems+=Math.min(WRITING_DAILY_CAP,count);}}}
  if(tasks.every(t=>t.mark?.status==='approved')){completeDays++;streak++;longestStreak=Math.max(longestStreak,streak);}else streak=0;
 }
 const approved=[...entries.values()].filter(m=>m?.status==='approved').length,pending=[...entries.values()].filter(m=>m?.status==='submitted').length,total=entries.size,decided=total-pending;
 const rate=decided?approved/decided:null;
 const writingPoints=creditedWritingItems*WRITING_POINTS,completePoints=completeDays*COMPLETE_DAY_POINTS,streakPoints=longestStreak*STREAK_DAY_POINTS;
 const status=inactive?'inactive':days<RANK_MIN_DAYS||!decided?'collecting':pending?'pending':'eligible';
 return {start,end,days,total,approved,pending,decided,rate,status,writingItems,creditedWritingItems,missingQuantity,completeDays,longestStreak,writingPoints,completePoints,streakPoints,bonus:writingPoints+completePoints+streakPoints};
}
export type Performance=ReturnType<typeof studentPerformance>;
export const rankStatusName=(status:Performance['status'])=>({inactive:'수강 종료',collecting:'집계 중',pending:'잠정 · 확인 대기',eligible:'확정'})[status];
export function comparePerformance(a:Performance,b:Performance){
 const fraction=a.approved*b.decided-b.approved*a.decided;
 return fraction?-Math.sign(fraction):b.bonus-a.bonus;
}
export function rankStudents(students:Student[],themes:Theme[],today=todayKST()){
 const rows=students.filter(s=>!s.admission||s.admission.stage==='regular').map(student=>({student,performance:studentPerformance(student,themes,today),rank:null as number|null}));
 for(const demo of [false,true]){
  const eligible=rows.filter(r=>r.student.demo===demo&&r.performance.status==='eligible').sort((a,b)=>comparePerformance(a.performance,b.performance)||a.student.name.localeCompare(b.student.name,'ko')||a.student.id.localeCompare(b.student.id));
  eligible.forEach((row,index)=>{row.rank=index>0&&comparePerformance(row.performance,eligible[index-1].performance)===0?eligible[index-1].rank:index+1;});
 }
 return rows;
}
export function sortRankingRows(rows:ReturnType<typeof rankStudents>,order:'name'|'performance',scope:'all'|'real'|'demo'='all',query=''){
 const selected=rows.filter(r=>(scope==='all'||(scope==='demo'?r.student.demo:!r.student.demo))&&r.student.name.includes(query));
 const byName=(a:typeof selected[number],b:typeof selected[number])=>a.student.name.localeCompare(b.student.name,'ko')||a.student.id.localeCompare(b.student.id);
 return selected.sort((a,b)=>order==='name'?byName(a,b):Number(a.student.demo)-Number(b.student.demo)||Number(a.performance.status!=='eligible')-Number(b.performance.status!=='eligible')||comparePerformance(a.performance,b.performance)||byName(a,b));
}
