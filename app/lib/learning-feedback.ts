import {addDays,currentTheme,dailyTasks,nextZoom,stageId,themeTasks,todayKST,type Student,type Task,type Theme} from './domain.ts';
import {requiredCompanionTasks} from './companions.ts';
import {bookTasks} from './study-guide.ts';
import {creditMark} from './submission-time.ts';

const labels:Record<string,string>={wake:'기상 기록',problems:'30문제',writing:'해설쓰기',lecture:'인강·필기',practice:'연습문제'};
type Entry={date:string;task:Task};
export function feedbackTasks(s:Student,themes:Theme[],date:string,today=todayKST()):Task[]{
 if(date<s.startDate)return [];
 // Before assignment snapshots exist, do not infer an overdue individual task
 // from today's curriculum. Only known individual records enter that history.
 const ids=s.companion?.days[date]??requiredCompanionTasks(s,themes,date).filter(id=>date>=today||id.startsWith('daily:')||!!s.marks[id]);
 const available=[...dailyTasks(s,date),...themes.flatMap(t=>themeTasks(s,t)),...bookTasks(s)];
 return [...new Set(ids)].flatMap(id=>{const task=available.find(t=>t.id===id);return task?[{...task,mark:creditMark(task.mark)}]:[];});
}
export function feedbackWindow(s:Student,themes:Theme[],start:string,end:string,today=todayKST()){
 const entries:Entry[]=[],seen=new Set<string>();let days=0;
 for(let date=start;date<=end;date=addDays(date,1)){
  const tasks=feedbackTasks(s,themes,date,today);if(tasks.length)days++;
  for(const task of tasks)if(!seen.has(task.id)){seen.add(task.id);entries.push({date,task});}
 }
 const approved=entries.filter(e=>e.task.mark?.status==='approved').length;
 const pending=entries.filter(e=>e.task.mark?.status==='submitted').length;
 const decided=entries.length-pending;
 const byKind=Object.entries(labels).map(([kind,label])=>{
  const items=entries.filter(e=>e.task.kind===kind),done=items.filter(e=>e.task.mark?.status==='approved').length,pending=items.filter(e=>e.task.mark?.status==='submitted').length;
  return {kind,label,total:items.length,approved:done,pending,failed:items.length-pending-done,rate:items.length>pending?done/(items.length-pending):null};
 });
 return {entries,days,total:entries.length,approved,pending,decided,rate:decided?approved/decided:null,byKind};
}
export function learningFeedback(s:Student,themes:Theme[],today=todayKST()){
 const start=addDays(today,-7),end=addDays(today,-1),recent=feedbackWindow(s,themes,start,end,today),previous=feedbackWindow(s,themes,addDays(today,-14),addDays(today,-8),today);
 const todayTasks=feedbackTasks(s,themes,today,today),theme=currentTheme(s,themes),zoom=nextZoom(s,themes,today);
 const weakness=recent.byKind.filter(k=>k.failed>0).sort((a,b)=>(a.rate??1)-(b.rate??1)||b.failed-a.failed)[0];
 const candidates=new Map<string,{task:Task;rank:number;date:string;reason:string}>();
 const add=(task:Task,rank:number,date:string,reason:string)=>{
  if(task.mark?.late&&task.mark.reviewedAt)return;
  if(task.mark?.status==='approved'||task.mark?.status==='submitted'||task.kind==='test'||task.kind==='attendance')return;
  // Practice follows the notes. A pending notes review does not ask for a duplicate submission.
  if(task.kind==='practice'&&task.themeId){const notes=s.marks[stageId(task.themeId,'lecture')];if(notes?.status!=='approved'&&notes?.status!=='submitted')return;}
  const old=candidates.get(task.id);if(!old||rank<old.rank)candidates.set(task.id,{task,rank,date,reason});
 };
 for(const task of todayTasks)add(task,1,today,task.kind==='wake'?'오늘 실제로 일어난 시각을 기록해 주세요. 지나간 기상은 내일 목표로 이어가요.':'오늘 배정된 과제예요. 하루가 끝나기 전에 제출해 주세요.');
 if(theme&&s.marks[stageId(theme.id,'test')]?.status==='approved'){
  for(const task of themeTasks(s,theme)){
   const date=recent.entries.find(e=>e.task.id===task.id)?.date??today;
   add(task,zoom.date===today?0:2,date,zoom.date===today?'오늘 수업의 보완 학습이에요. 수업 전에 먼저 정리해 보세요.':'다음 수업에서 진도를 이어가기 위해 필요한 학습이에요.');
  }
 }
 for(const {date,task} of recent.entries)if(task.kind==='lecture'||task.kind==='practice')add(task,3,date,'이전에 배정된 개별과제가 남아 있어요. 학습 순서대로 이어가 보세요.');
 const focus=[...candidates.values()].sort((a,b)=>a.rank-b.rank||Number(b.task.mark?.status==='revision')-Number(a.task.mark?.status==='revision')||Number(b.task.kind===weakness?.kind)-Number(a.task.kind===weakness?.kind)||a.date.localeCompare(b.date)||Number(a.task.kind==='practice')-Number(b.task.kind==='practice'))[0]??null;
 const complete=todayTasks.length>0&&todayTasks.every(t=>t.mark?.status==='approved');
 const awaiting=todayTasks.length>0&&todayTasks.every(t=>t.mark?.status==='approved'||t.mark?.status==='submitted')&&!complete;
 const improved=recent.days>=3&&previous.days>=3&&recent.pending===0&&previous.pending===0&&recent.rate!==null&&previous.rate!==null&&recent.rate-previous.rate>=.1;
 const strong=recent.days>=3&&recent.pending===0&&recent.rate!==null&&recent.rate>=.8;
 const tone=complete?'complete':improved?'improving':strong?'strong':awaiting?'pending':recent.total?'focus':'new';
 const title=complete?'오늘 과제, 모두 마쳤어요!':awaiting?'오늘 과제는 제출했어요.':improved?'꾸준히 회복하고 있어요.':strong?'좋은 흐름을 이어가고 있어요.':focus?`${labels[focus.task.kind]??'오늘 과제'}부터 이어가요.`:'오늘의 첫 걸음을 시작해요.';
 const percent=recent.rate===null?null:Math.round(recent.rate*100);
 let evidence=recent.total===0?'아직 지난 과제 기록이 충분하지 않아요. 오늘 배정된 과제부터 차근차근 시작해요.':recent.decided===0?'최근 과제는 모두 확인 대기 중이에요. 담당자 확인 후 성사율이 표시돼요.':improved?`직전 7일보다 성사율이 ${Math.round((recent.rate!-previous.rate!)*100)}%p 올랐어요. 다시 이어가는 노력이 보여요.`:strong?`최근 ${recent.days}일, 확인 대기를 제외한 과제 성사율 ${percent}%. 꾸준히 해내고 있어요!`:weakness?`최근 ${recent.days}일 동안 ${weakness.label} ${weakness.total-weakness.pending}개 중 ${weakness.failed}개가 미제출·미완료 또는 보완 필요예요.`:'확인된 과제는 모두 성사했어요. 남은 확인 결과를 기다려 주세요.';
 if((improved||strong)&&weakness)evidence+=` ${weakness.label} ${weakness.total-weakness.pending}개 중 ${weakness.failed}개는 아직 미완료·보완 필요예요.`;
 if(complete)evidence=`오늘 배정된 ${todayTasks.length}개 과제를 모두 확인받았어요. 잘했어요! ${focus?'남아 있는 개별 학습도 차근차근 이어가 봐요.':'충분히 쉬고 다음 학습을 준비해요.'}`;
 if(awaiting)evidence=`오늘 할 과제는 모두 제출했어요. ${todayTasks.filter(t=>t.mark?.status==='submitted').length}개는 담당자 확인을 기다리고 있어요.`;
 const pendingMessage=recent.pending?`최근 과제 ${recent.pending}개는 확인 대기라 성사율 계산과 부족한 항목에서 제외했어요.`:'';
 const focusReason=focus?.task.mark?.status==='revision'?'담당자가 보완을 요청했어요. 안내 내용을 확인하고 다시 제출해 주세요.':focus?.reason??(awaiting?'제출한 과제를 다시 할 필요는 없어요. 확인 결과를 기다려 주세요.':complete?'오늘 과제를 마쳤어요. 다음 일정은 2주 학습표에서 확인해요.':'오늘 배정과 다음 학습 계획을 확인해 보세요.');
 return {tone,title,evidence,focus,focusReason,pendingMessage,reviewNote:focus?.task.mark?.status==='revision'?focus.task.mark.note??'':'',recent:{start,end,days:recent.days,total:recent.total,approved:recent.approved,pending:recent.pending,decided:recent.decided,percent},complete,awaiting};
}
