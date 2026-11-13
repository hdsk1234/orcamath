import type {Student,Workspace,Theme} from './domain.ts';
export const SPECIES=[
 {id:'orca',name:'범고래',nickname:'오르',goal:'꾸준히, 한 걸음씩',motto:'한 걸음씩, 함께 올라가자.',description:'작은 실천을 모아 매일의 공부를 이어 가는 친구.'},
 {id:'shark',name:'백상아리',nickname:'샤프',goal:'용기 있게 첫 풀이',motto:'막막한 문제도 첫 단계부터!',description:'문제의 조건을 살피고 첫 풀이에 도전하는 친구.'},
 {id:'turtle',name:'거북이',nickname:'루트',goal:'탄탄하게 기본부터',motto:'탄탄한 기본기가 큰 실력을 만들어.',description:'개념의 뿌리를 다지고 배운 것을 차곡차곡 쌓는 친구.'},
 {id:'seahorse',name:'해마',nickname:'루미',goal:'이해하고 설명하기',motto:'왜 그렇게 되는지 함께 찾아보자.',description:'공식의 이유를 이해하고 내 말로 설명하는 친구.'},
 {id:'octopus',name:'문어',nickname:'모아',goal:'생각을 연결하는 풀이',motto:'배운 것들을 연결하면 새로운 풀이가 보여.',description:'여러 생각을 연결해 다양한 풀이를 탐색하는 친구.'}
] as const;
export type Species=typeof SPECIES[number]['id'];
export type Vitality=0|1|2|3;
export const STATE_NAMES=['활력','탈진1','탈진2','탈진3'];
export const XP_RATES=[1,.8,.6,.4];
export const EVOLUTION_LEVELS=[1,5,10,20,35,50];
export type CompanionProfile={species:Species;chosen:boolean;since:string;days:Record<string,string[]>;state:Vitality;regressionDates:string[];regressionAnchor?:{xp:number;level:number};themeXpMultipliers:Record<string,number>;lastSyncedDate?:string;demoState?:Vitality;demoXpOffset?:number;demoLoss?:number;note?:string};
const plus=(date:string,n:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const kst=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
export const speciesName=(species:Species)=>SPECIES.find(s=>s.id===species)?.name??'범고래';
export const companionNickname=(species:Species)=>SPECIES.find(s=>s.id===species)?.nickname??'오르';
export function evolutionLevel(level:number){return [...EVOLUTION_LEVELS].reverse().find(l=>level>=l)??1;}
export function companionImage(species:Species,level:number,state:Vitality){return `/companions/${species}/lv${evolutionLevel(level)}-${state===0?'active':'fatigue'+state}.webp`;}
const stage=(id:string,kind:string)=>`${kind==='practice'&&id==='c-12.2'?'c-12':id}:${kind}`;
const done=(s:Student,t:Theme)=>['test','lecture',...(t.practice?['practice']:[])].every(k=>s.marks[stage(t.id,k)]?.status==='approved');
// Individual work follows the same TEST -> next-day notes -> following-day practice schedule.
export function requiredCompanionTasks(s:Student,themes:Theme[],date:string){
 const ids=['wake','problems','writing'].map(k=>`daily:${date}:${k}`);let index=0;
 for(let day=s.startDate;day<=date;day=plus(day,1)){
  if(!s.zoomDays.includes(new Date(day+'T12:00:00Z').getUTCDay()))continue;
  const themeId=s.selected[index++],t=themes.find(t=>t.id===themeId);if(!t)break;
  if(plus(day,1)===date)ids.push(stage(t.id,'lecture'));
  if(t.practice&&plus(day,2)===date)ids.push(stage(t.id,'practice'));
 }
 ids.push(...(s.bookAssignments??[]).filter(a=>a.dueDate===date).map(a=>`extra:${a.id}`));
 return [...new Set(ids)];
}
export function deriveVitality(s:Student,c:CompanionProfile,today=kst()){
 let state:Vitality=0,lowDays=0,zeroDays=0,pending=false,lastRate:number|null=null;const losses:string[]=[];
 for(const date of Object.keys(c.days).filter(d=>d<today&&d>=c.since&&d>=s.startDate).sort()){
  const ids=c.days[date];if(!ids.length)continue;
  if(ids.some(id=>s.marks[id]?.status==='submitted'&&!s.marks[id]?.late)){pending=true;lowDays=0;zeroDays=0;continue;}
  const completed=ids.filter(id=>s.marks[id]?.status==='approved'&&!s.marks[id]?.late).length;
  const attempted=ids.filter(id=>s.marks[id]&&s.marks[id].status!=='missed').length;
  lastRate=completed/ids.length;
  if(completed===ids.length){state=0;lowDays=0;zeroDays=0;continue;}
  lowDays=lastRate<=.5?lowDays+1:0;
  const previous=state;state=Math.max(state,lowDays>=7?3:lowDays>=3?2:1) as Vitality;
  if(state===3&&previous===3){zeroDays=attempted===0?zeroDays+1:0;if(zeroDays>0&&zeroDays%3===0)losses.push(date);}else zeroDays=0;
 }
 const current=c.days[today];
 if(current?.length&&current.every(id=>s.marks[id]?.status==='approved'&&!s.marks[id]?.late)){state=0;zeroDays=0;lowDays=0;pending=false;}
 return {state,lowDays,zeroDays,pending,lastRate,losses};
}
export function companionPenalty(s:Student){return s.demo&&s.companion?.demoState!==undefined?s.companion.demoLoss??0:s.companion?.regressionDates.length??0;}
export function effectiveCompanionLevel(s:Student,xp:number){
 const c=s.companion;
 if(s.demo&&c?.demoState!==undefined)return Math.min(50,Math.max(1,1+Math.floor(xp/100)-(c.demoLoss??0)));
 if(c?.regressionAnchor)return Math.min(50,Math.max(1,c.regressionAnchor.level+Math.floor((xp-c.regressionAnchor.xp)/100)));
 return Math.max(1,Math.min(50,1+Math.floor(xp/100))-(c?.regressionDates.length??0));
}
export function companionRemainder(s:Student,xp:number){const anchor=s.demo&&s.companion?.demoState!==undefined?0:s.companion?.regressionAnchor?.xp??0;return ((xp-anchor)%100+100)%100;}
export function companionStatus(s:Student,level:number,today=kst()){
 const c=s.companion,state=s.demo&&c?.demoState!==undefined?c.demoState:c?.state??0;
 const detail=c?deriveVitality(s,c,today):{lowDays:0,zeroDays:0,pending:false,lastRate:null};
 return {...detail,state,level,species:c?.species??'orca',name:companionNickname(c?.species??'orca'),speciesLabel:speciesName(c?.species??'orca'),label:STATE_NAMES[state],rate:XP_RATES[state],penalty:companionPenalty(s),demo:s.demo&&c?.demoState!==undefined,note:c?.note??''};
}
export function reconcileCompanions(w:Workspace,today=kst()){
 for(const s of w.students){
  if(s.admission&&s.admission.stage!=='regular')continue;
  const initial=!s.companion;
  s.companion??={species:'orca',chosen:false,since:today,days:{},state:0,regressionDates:[],themeXpMultipliers:{}};
  const c=s.companion;
  if(initial){for(const m of Object.values(s.marks))if(m.status==='approved')m.xpEfficiency??=1;for(const t of w.themes)if(done(s,t))c.themeXpMultipliers[t.id]=1;}
  let newLosses:string[]=[];
  if(!(s.demo&&c.demoState!==undefined)){
   for(let date=c.since>s.startDate?c.since:s.startDate;date<=today;date=plus(date,1))if(!c.days[date]||date===today)c.days[date]=requiredCompanionTasks(s,w.themes,date);
   const computed=deriveVitality(s,c,today);c.state=computed.state;newLosses=computed.losses.filter(d=>!c.regressionDates.includes(d));
  }
  const rate=XP_RATES[s.demo&&c.demoState!==undefined?c.demoState:c.state];
  for(const m of Object.values(s.marks))if(m.status==='approved')m.xpEfficiency??=rate;
  for(const t of w.themes)if(done(s,t))c.themeXpMultipliers[t.id]??=rate;
  const activity=Object.entries(s.marks).reduce((sum,[id,m])=>sum+(m.status==='approved'&&!m.late?Math.floor((id.endsWith(':test')?30+Math.floor((m.score??0)/10):10)*(m.xpEfficiency??1)):0),0);
  const progress=w.themes.filter((t,i,a)=>a.findIndex(x=>x.id===t.id)===i&&done(s,t)).reduce((sum,t)=>sum+Math.floor(50*(c.themeXpMultipliers[t.id]??1)),0);
  const xp=Math.max(0,activity+progress+(s.demo?c.demoXpOffset??0:0));
  if(c.regressionDates.length&&!c.regressionAnchor&&c.demoState===undefined)c.regressionAnchor={xp:xp-companionRemainder(s,xp),level:effectiveCompanionLevel(s,xp)};
  for(const date of newLosses){c.regressionAnchor={xp:xp-companionRemainder(s,xp),level:Math.max(1,effectiveCompanionLevel(s,xp)-1)};c.regressionDates.push(date);}
  c.regressionDates.sort();
  c.lastSyncedDate=today;
 }
}
export function needsCompanionSync(w:Workspace,today=kst()){return w.students.some(s=>(!s.admission||s.admission.stage==='regular')&&(!s.companion||s.companion.lastSyncedDate!==today));}
export function installCompanionExamples(w:Workspace,stats:(s:Student,themes:Theme[])=>{xp:number},today=kst()){
 if(w.companionExampleVersion===1)return false;
 reconcileCompanions(w,today);
 const examples:[Species,number,Vitality,number][]=[['orca',50,0,0],['shark',35,2,0],['turtle',10,1,0],['seahorse',1,0,0],['octopus',50,3,0],['orca',20,1,0],['shark',10,0,0],['turtle',35,3,0],['seahorse',50,0,0],['octopus',20,2,0],['orca',5,1,0],['shark',50,3,1],['turtle',1,0,0],['seahorse',20,2,0],['octopus',35,0,0],['orca',10,3,0],['shark',5,1,0]];
 w.students.filter(s=>s.demo).forEach((s,i)=>{const [species,level,state,loss]=examples[i%examples.length],c=s.companion!;c.species=species;c.chosen=true;c.demoState=state;c.demoLoss=loss;c.demoXpOffset=(level-1)*100+40-stats(s,w.themes).xp;c.note=loss?'탈진3 이후 3일 무수행 · Lv.50 → Lv.49':state===0?'하루 과제 정상 수행':state===1?'하루 과제 일부 미완료':state===2?'3일 연속 과제 성사율 50% 이하':'7일 연속 과제 성사율 50% 이하';});
 w.companionExampleVersion=1;return true;
}
