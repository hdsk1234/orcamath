import {startRenewal,pendingRefund} from '../../lib/cashdesk';
import {updateLessonAttendance} from '../../lib/lesson-attendance';
import {rescheduleLesson} from '../../lib/lesson-schedule';
import {getOperations,paidInvoice} from '../../lib/operations';
import {updateDiagnostic} from '../../lib/diagnostic';
import {saveReportGuidance} from '../../lib/diagnostic-report';
import {diagnosis} from '../../lib/domain';
import {diagnosticAccess,regularStudent,finishDiagnostic} from '../../lib/crm';
import {startTutorial,TUTORIAL_STEPS} from '../../lib/study-guide';
import {submissionTiming,validWake,reviewedSubmission} from '../../lib/submission-time';
import {staffForName} from '../../lib/staff-directory';
import {addDays} from '../../lib/domain';
import {TEACHERS,baseFee} from '../../lib/billing';
import {canAssignRole} from '../../lib/permissions';
import {SPECIES,companionPenalty,type Vitality} from '../../lib/companions';
import {studentStats} from '../../lib/domain';
import {identity,canStudent,staff,checkOrigin,mutateWorkspace,filterWorkspace,failure,json,AppError,database,sha,loadWorkspace} from '../../lib/server';
import {makeStudent,QUESTION_ROWS,canWriteRecords,canAccessStudent as canAccessStudentLocal,todayKST as todayDate,type Mark,type Attachment,type Role} from '../../lib/domain';
import {financials,chargedFee,type SessionStatus} from '../../lib/billing';
import {saveScholarshipHistory} from '../../lib/scholarships';
const clean=(v:unknown,max=2000)=>typeof v==='string'?v.trim().slice(0,max):'';
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s));
const validTime=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export async function POST(request:Request){try{
 checkOrigin(request);const b=await request.json() as Record<string,unknown>;const {viewer,workspaceId}=await identity();const action=String(b.action??'');
 if(viewer.role==='assistant'&&['profile','survey','diagnostic'].includes(action))throw new AppError(403,'조교는 학생 설정과 진단 설문을 변경할 수 없습니다.');
 if(!canWriteRecords(viewer.role))throw new AppError(403,'학부모는 연결된 자녀의 기록을 조회할 수 있습니다. 제출과 수정은 학생 또는 담당자가 진행합니다.');
 if(action==='invite'){
  const consultant=viewer.role==='teacher'&&viewer.teacherId==='byun';if(!consultant)staff(viewer,['admin','manager']);if(consultant&&(b.staffName||!['student','parent'].includes(String(b.role))))throw new AppError(403,'상담자는 본인 상담 학생·학부모만 초대할 수 있어요.');const member=staffForName(clean(b.staffName,40));if(b.staffName&&!member)throw new AppError(400,'등록된 직원 이름을 확인해 주세요.');const role=(member?.role??String(b.role??'student')) as Role;if((!consultant&&!canAssignRole(viewer,role))||!['manager','student','parent','teacher','assistant'].includes(role))throw new AppError(400,'초대 역할을 확인해 주세요.');const linked=role==='student'||role==='parent',studentId=linked?clean(b.studentId,80):null;
  if(linked){const {workspace}=await loadWorkspace(workspaceId);if(consultant&&!workspace.students.some(s=>s.id===studentId&&!s.demo&&s.admission?.consultantId==='byun'&&(workspace.leads??[]).some(l=>l.studentId===s.id&&l.id===s.admission!.leadId)))throw new AppError(403,'본인 상담에서 만든 진단 계정만 초대할 수 있어요.');if(!workspace.students.some(s=>s.id===studentId&&!s.demo))throw new AppError(400,'실제 등록한 학생을 선택해 주세요.');}
  const code=crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase();await database().prepare('INSERT INTO invitations (hash,workspace_id,role,student_id,teacher_id,staff_name,expires_at) VALUES (?,?,?,?,?,?,?)').bind(await sha(code),workspaceId,role,studentId,member?.teacherId??null,member?.name??null,new Date(Date.now()+7*86400000).toISOString()).run();return json({code,expiresIn:'7일',role});
 }
 const studentId=clean(b.studentId,80);if(studentId){if(['survey','assessment','profile','diagnostic','reportGuidance'].includes(action)){const {workspace}=await loadWorkspace(workspaceId),s=workspace.students.find(s=>s.id===studentId);if(!s||!diagnosticAccess(viewer,s))throw new AppError(403,'담당 진단 기록만 이용할 수 있어요.');if(action==='profile'&&!canAccessStudentLocal(viewer,s.id)&&['name','startDate','zoomTime','wakeTime','writingCount','zoomDays','selected'].some(k=>b[k]!==undefined))throw new AppError(403,'상담자는 담당 진단 평가만 조정할 수 있어요.');}else canStudent(viewer,studentId);}
 const updated=await mutateWorkspace(workspaceId,w=>{
  const s=w.students.find(s=>s.id===studentId);
  if(action==='addStudent'){staff(viewer,['admin','manager']);const name=clean(b.name,40);if(!name)throw new AppError(400,'이름을 입력해 주세요.');if(w.students.length>=100)throw new AppError(400,'학생 등록 한도입니다.');const id=crypto.randomUUID();w.students.push(makeStudent(name,id));return {createdId:id};}
  if(action==='material'){
   staff(viewer,['admin','manager']);const t=w.themes.find(t=>t.id===clean(b.themeId,50));if(!t)throw new AppError(404,'테마를 찾을 수 없습니다.');
   if(b.title!==undefined)t.title=clean(b.title,80);
   if(b.lectureUrl!==undefined){const u=clean(b.lectureUrl,1000);if(u&&!/^https?:\/\//.test(u))throw new AppError(400,'http 또는 https 강의 주소를 입력해 주세요.');t.lectureUrl=u;}
   if(typeof b.practice==='boolean')t.practice=b.practice;
   if(b.minutes!==undefined){const n=Number(b.minutes);if(!Number.isInteger(n)||n<30||n>60)throw new AppError(400,'예상 시간은 30~60분입니다.');t.minutes=n;}
   for(const key of ['testFile','practiceFile'] as const){const f=b[key] as Attachment|undefined;if(f){if(!f.key?.startsWith(`${workspaceId}/materials/${t.id}/`))throw new AppError(400,'파일 경로가 일치하지 않습니다.');t[key]=f;}}
   if(t.id==='c-12'||t.id==='c-12.2'){const paired=w.themes.find(x=>x.id===(t.id==='c-12'?'c-12.2':'c-12'));if(paired&&b.practiceFile)paired.practiceFile=t.practiceFile;}
   return {};
  }
  if(!s)throw new AppError(404,'학생을 찾을 수 없습니다.');
  if(['tutorial','book','bookAssign','contacts','manualReminder','taskException'].includes(action)){
   if(!regularStudent(s))throw new AppError(403,'정규 등록 후 이용할 수 있어요.');
   if(action==='tutorial'){
    if(b.operation==='start'||b.operation==='end'){staff(viewer,['admin','manager','teacher']);if(b.operation==='start')startTutorial(s);else if(s.tutorial)s.tutorial.endsAt=new Date().toISOString();}
    else {if(!s.tutorial?.startedAt)throw new AppError(400,'튜토리얼을 먼저 시작해 주세요.');const step=String(b.step);if(!TUTORIAL_STEPS.some(t=>t.id===step))throw new AppError(400,'안내 단계를 확인해 주세요.');if(!s.tutorial.readSteps.includes(step))s.tutorial.readSteps.push(step);}return {};
   }
   if(action==='book'){const cover=b.cover as Attachment|undefined;if(cover&&(!cover.key?.startsWith(`${workspaceId}/students/${s.id}/`)||!['image/png','image/jpeg','image/webp'].includes(cover.type)))throw new AppError(400,'교재 표지 사진을 확인해 주세요.');if(viewer.role!=='student')staff(viewer,['admin','manager','teacher']);const title=clean(b.title,100);if(!title)throw new AppError(400,'교재명을 입력해 주세요.');if((s.studyBooks?.length??0)>=30)throw new AppError(400,'교재는 최대 30권입니다.');(s.studyBooks??=[]).push({id:crypto.randomUUID(),title,publisher:clean(b.publisher,50),subject:clean(b.subject,50),range:clean(b.range,300),note:clean(b.note,500),createdAt:new Date().toISOString(),...(cover?{cover}:{})});return {};}
   staff(viewer,['admin','manager','teacher']);
   if(action==='bookAssign'){const book=s.studyBooks?.find(x=>x.id===b.bookId),range=clean(b.range,300),dueDate=clean(b.dueDate,10);if(!book||!range||!validDate(dueDate)||dueDate<todayDate())throw new AppError(400,'교재·범위·오늘 이후 마감일을 확인해 주세요.');if((s.bookAssignments?.length??0)>=300)throw new AppError(400,'추가 과제 한도입니다.');(s.bookAssignments??=[]).push({id:crypto.randomUUID(),bookId:book.id,range,dueDate,countsToward30:b.countsToward30===true,createdAt:new Date().toISOString(),createdBy:viewer.name});return {};}
   if(action==='contacts'){const phone=(v:unknown)=>{const p=clean(v,20).replace(/[\s()-]/g,'');if(p&&!/^01[016789]\d{7,8}$/.test(p))throw new AppError(400,'휴대전화 번호를 확인해 주세요.');return p;};s.contacts={studentPhone:phone(b.studentPhone),parentPhone:phone(b.parentPhone)};return {};}
   if(action==='manualReminder'){const date=clean(b.date,10),recipient=String(b.recipient);if(!validDate(date)||date>=todayDate()||!['student','parent'].includes(recipient))throw new AppError(400,'발송 대상·날짜를 확인해 주세요.');(s.manualReminders??=[]).push({date,recipient:recipient as 'student'|'parent',at:new Date().toISOString(),actor:viewer.name});return {};}
   if(action==='taskException'){const id=clean(b.taskId,120);if(!/^daily:\d{4}-\d{2}-\d{2}:(wake|problems|writing)$/.test(id))throw new AppError(400,'과제를 확인해 주세요.');s.taskExceptions??=[];if(b.excluded===true&&!s.taskExceptions.includes(id))s.taskExceptions.push(id);if(b.excluded!==true)s.taskExceptions=s.taskExceptions.filter(x=>x!==id);return {};}
  }
  if(action==='scholarshipHistory'){
   staff(viewer,['admin','manager']);try{saveScholarshipHistory(s,b);}catch(e){throw new AppError(400,e instanceof Error?e.message:'할인 내역을 확인해 주세요.');}return {};
  }
  if(action==='companion'){
   if(!regularStudent(s))throw new AppError(403,'정규 등록 이후 캐릭터를 선택할 수 있어요.');
   if(viewer.role!=='student')staff(viewer,['admin','manager','teacher']);
   const c=s.companion!;
   if(b.species!==undefined){if(!SPECIES.some(x=>x.id===b.species))throw new AppError(400,'캐릭터 종류를 확인해 주세요.');c.species=b.species as typeof c.species;c.chosen=true;}
   if(b.demoLevel!==undefined||b.demoState!==undefined){
    staff(viewer,['admin','manager','teacher']);if(!s.demo)throw new AppError(403,'실제 학생의 레벨과 상태는 과제 기록에서 계산됩니다.');
    if(b.demoState!==undefined){if(b.demoState===null){delete c.demoState;delete c.demoLoss;c.note='과제 기록에서 자동 계산';}else{const state=Number(b.demoState);if(!Number.isInteger(state)||state<0||state>3)throw new AppError(400,'상태를 확인해 주세요.');c.demoState=state as Vitality;c.note=['하루 과제 정상 수행','하루 과제 일부 미완료','3일 연속 성사율 50% 이하','7일 연속 성사율 50% 이하'][state];}}
    if(b.demoLevel!==undefined){const level=Number(b.demoLevel);if(!Number.isInteger(level)||level<1||level>50)throw new AppError(400,'레벨은 1~50입니다.');const current=studentStats(s,w.themes);c.demoXpOffset=(c.demoXpOffset??0)+(level-1+companionPenalty(s))*100+current.xp%100-current.xp;}
   }
   return {};
  }
  if(action==='billingProfile'){
   staff(viewer,['admin','manager']);if(s.admission)throw new AppError(409,'상담 고객함에서 선납을 확인하고 등록해 주세요.');if(s.billing)throw new AppError(409,'이미 수강 정보가 있습니다. 기존 수납·회차 화면에서 관리해 주세요.');
   const mode=String(b.mode),teacherId=clean(b.teacherId,30),startDate=clean(b.startDate,10);if(!['online','director','teacher'].includes(mode)||!validDate(startDate)||!TEACHERS.some(t=>t.id===teacherId)||(mode==='teacher'?teacherId==='director':teacherId!=='director'))throw new AppError(400,'수업 형태·강사·시작일을 확인해 주세요.');
   s.tutorial={eligible:true,readSteps:[]};s.beginner=b.beginner===true;s.billing={mode:mode as 'online'|'director'|'teacher',teacherId,cycleNumber:1,discountPercent:0,startDate,endDate:addDays(startDate,27),sessions:Array.from({length:8},(_,n)=>({id:crypto.randomUUID(),date:addDays(startDate,n*3),time:s.zoomTime,status:'scheduled'})),received:0,refund:0,scenario:'신규 실제 수강 등록'};return {};
  }
  if(action==='beginner'){staff(viewer,['admin','manager']);s.beginner=b.beginner===true;return {};}
  if(action==='billingSchedule'){
   staff(viewer,['admin','manager']);try{rescheduleLesson(w,s,viewer,b);}catch(e){throw new AppError(409,e instanceof Error?e.message:'수업 일정을 확인해 주세요.');}return {};
  }
  if(action==='billingSession'){
   staff(viewer,['admin','manager']);try{updateLessonAttendance(w,s,viewer,b);}catch(e){throw new AppError(409,e instanceof Error?e.message:'수업 기록을 확인해 주세요.');}const billing=s.billing!;const next=getOperations(w).invoices.find(i=>i.studentId===s.id&&i.cycleNumber===billing.cycleNumber+1&&!i.cancelledAt&&!i.discountPending);if(financials(billing).consumed>=8&&next&&paidInvoice(next)>=next.amount)startRenewal(w,s,next,new Date().toISOString());return {};
  }
  if(action==='billingPayment'){
   if(pendingRefund(w,s.id))throw new AppError(409,'환불 대기 화면에서 먼저 처리해 주세요.');
   staff(viewer,['admin','manager']);const billing=s.billing;if(!billing)throw new AppError(400,'수강 정보가 없습니다.');if(billing.settlementClosed)throw new AppError(409,'정산 확정된 금액은 변경할 수 없습니다.');
   const received=Number(b.received),refund=Number(b.refund);if(![received,refund].every(x=>Number.isSafeInteger(x)&&x>=0)||received>chargedFee(billing)||refund>received)throw new AppError(400,'납부액은 청구액 이하, 환불액은 납부액 이하의 원 단위 금액입니다.');
   if(received!==billing.received)throw new AppError(409,'차수별 청구서에서 입금 확인 또는 확인 취소를 처리해 주세요.');
   const previousRefund=billing.refund,previousRefundDate=billing.refundDate;billing.refund=refund;billing.stopped=b.stopped===true;const date=todayDate();if(refund)billing.refundDate=date;
   if(previousRefund!==refund){const o=w.operations??={invoices:[],expenses:[],alumni:[],events:[]};if(previousRefund>0&&previousRefundDate&&!o.events.some(e=>e.studentId===s.id&&e.type==='refund'&&e.note===String(billing.cycleNumber)))o.events.push({id:crypto.randomUUID(),type:'refund',studentId:s.id,amount:previousRefund,date:previousRefundDate,actor:viewer.name,note:String(billing.cycleNumber)});o.events.push({id:crypto.randomUUID(),type:'refund',studentId:s.id,amount:refund-previousRefund,date,actor:viewer.name,note:String(billing.cycleNumber)});}
   if(billing.stopped)s.enrollment={status:'withdrawn',date,reason:'중도종료 · 환불 처리',actor:viewer.name};return {};
  }
  if(action==='billingSettle'){
   staff(viewer,['admin','manager']);const billing=s.billing;if(!billing)throw new AppError(400,'수강 정보가 없습니다.');const f=financials(billing);
   if(f.consumed<8&&!billing.stopped)throw new AppError(409,'8회 차감 완료 또는 중도 종료 후 정산을 확정할 수 있습니다.');
   if(f.unpaid&&!billing.stopped)throw new AppError(409,'미납액을 확인한 뒤 정산해 주세요.');
   billing.settlementClosed=true;billing.settlementAmount=f.teacher;return {};
  }
  if(action==='billingPaid'){
   if(pendingRefund(w,s.id))throw new AppError(409,'환불 대기 화면에서 먼저 처리해 주세요.');
   staff(viewer,['admin','manager']);const billing=s.billing;if(!billing?.settlementClosed)throw new AppError(409,'정산을 먼저 확정해 주세요.');
   const f=financials(billing);if(!f.external)throw new AppError(400,'외부 강사 지급 대상이 아닙니다.');billing.paidOut=f.teacher;return {};
  }
  if(action==='profile'){
   for(const key of ['grade','target','availability','currentBooks','delayReason'] as const)if(b[key]!==undefined)s[key]=clean(b[key],key==='availability'?1000:300);
   if(b.korean!==undefined){if(!Array.isArray(b.korean)||b.korean.length>3||!b.korean.every(x=>Number.isInteger(x)&&x>=1&&x<=9))throw new AppError(400,'최근 최대 3회 국어 등급을 입력해 주세요.');s.korean=b.korean;}
   if(viewer.role!=='student'){
    staff(viewer,['admin','manager','teacher']);if(b.name!==undefined){const v=clean(b.name,40);if(!v)throw new AppError(400,'이름을 입력해 주세요.');s.name=v;}
    if(b.startDate!==undefined){const v=clean(b.startDate,10);if(!validDate(v))throw new AppError(400,'시작 날짜를 확인해 주세요.');s.startDate=v;}
    for(const key of ['zoomTime','wakeTime'] as const)if(b[key]!==undefined){const v=clean(b[key],5);if(!validTime(v)||(key==='wakeTime'&&(v<'05:00'||v>'06:30')))throw new AppError(400,'기상 시각은 05:00~06:30, 수업 시각은 올바른 시간을 입력해 주세요.');s[key]=v;}
    if(b.writingCount!==undefined){const n=Number(b.writingCount);if(!Number.isInteger(n)||n<1||n>10)throw new AppError(400,'해설쓰기는 1~10개로 설정해 주세요.');s.writingCount=n;}
    if(b.zoomDays!==undefined){if(!Array.isArray(b.zoomDays)||b.zoomDays.length!==2||new Set(b.zoomDays).size!==2||!b.zoomDays.every(x=>Number.isInteger(x)&&x>=0&&x<=6))throw new AppError(400,'수업 요일 두 개를 선택해 주세요.');s.zoomDays=b.zoomDays;}
    if(b.selected!==undefined){if(!Array.isArray(b.selected)||b.selected.length>77||new Set(b.selected).size!==b.selected.length||!b.selected.every(id=>w.themes.some(t=>t.id===id)))throw new AppError(400,'선택 테마를 확인해 주세요.');s.selected=b.selected;}
   }return {};
  }
  if(action==='reportGuidance'){try{saveReportGuidance(s,b,viewer);}catch(e){throw new AppError(403,e instanceof Error?e.message:'추가 해결책을 확인해 주세요.');}return {};}
  if(action==='diagnostic'){
   if(b.operation==='start'&&!s.diagnostic&&s.surveyAt){(s.diagnosticHistory??=[]).push({createdAt:s.surveyAt,report:diagnosis(s),...(s.reportGuidance?{guidance:structuredClone(s.reportGuidance)}:{})});}
   try{updateDiagnostic(s,b,viewer,workspaceId);}catch(e){throw new AppError(400,e instanceof Error?e.message:'진단 기록을 확인해 주세요.');}if(s.diagnostic?.completedAt)finishDiagnostic(s);return {};
  }
  if(action==='survey'){
   if(s.diagnostic)throw new AppError(409,'원문 진단검사 화면에서 응답해 주세요.');
   const a=b.answers as Record<string,unknown>;if(!a||typeof a!=='object')throw new AppError(400,'설문 응답을 확인해 주세요.');const allowed=new Set(QUESTION_ROWS.map(q=>q[0]));
   for(const [id,v]of Object.entries(a)){if(!allowed.has(id)||!(v===null||(Number.isInteger(v)&&Number(v)>=1&&Number(v)<=5)))throw new AppError(400,'응답 값을 확인해 주세요.');s.answers[id]=v as number|null;}
   if(b.potential!==undefined){const p=b.potential;if(!Array.isArray(p)||p.length>4||!p.every(x=>Number.isInteger(x)&&x>=0&&x<=5))throw new AppError(400,'잠재력 응답을 확인해 주세요.');s.potential=p;}
   if(b.completed===true){if(!QUESTION_ROWS.every(q=>q[0] in s.answers)||s.potential.length!==4)throw new AppError(400,'모든 설문 문항에 응답해 주세요.');s.surveyAt=new Date().toISOString();finishDiagnostic(s);}return {};
  }
  if(action==='assessment'){
   if(s.diagnostic)throw new AppError(409,'주관식 문항을 채점한 뒤 진단 평가를 확정해 주세요.');
   staff(viewer,['admin']);const content=b.content===null?null:Number(b.content),actionScore=b.actionScore===null?null:Number(b.actionScore);
   if(![content,actionScore].every(x=>x===null||(Number.isFinite(x)&&x>=0&&x<=10)))throw new AppError(400,'점수는 0~10점 또는 미입력입니다.');s.assessment={content,action:actionScore,note:clean(b.note,2500),reviewedAt:new Date().toISOString()};return {};
  }
  if(action==='submit'||action==='review'){
   if(!regularStudent(s)||todayDate()<s.startDate)throw new AppError(403,'정규수업 시작일 이후 과제를 진행할 수 있어요.');
   let taskId=clean(b.taskId,120);const extra=s.bookAssignments?.find(a=>`extra:${a.id}`===taskId),daily=/^daily:\d{4}-\d{2}-\d{2}:(wake|problems|writing)$/.test(taskId),stage=/^([a-z]+-\d+(?:\.2)?):(test|lecture|practice)$/.exec(taskId),attendance=/^attendance:\d{4}-\d{2}-\d{2}$/.test(taskId),shared=stage?.[1]==='c-12'&&s.selected.includes('c-12.2');
   if(!daily&&!attendance&&!extra&&!(stage&&(s.selected.includes(stage[1])||shared||(action==='review'&&s.marks[taskId]))))throw new AppError(400,'유효한 과제가 아닙니다.');if(s.admission){const taskDate=taskId.match(/^(?:daily|attendance):(\d{4}-\d{2}-\d{2})/)?.[1];if(taskDate&&taskDate<s.startDate)throw new AppError(403,'정규 시작일 이전에는 과제를 기록하지 않습니다.');}let prev=s.marks[taskId];
   if(action==='submit'){
    const dueDate=extra?.dueDate??Object.keys(s.companion?.days??{}).sort().find(date=>s.companion!.days[date].includes(taskId));
    let timing:ReturnType<typeof submissionTiming>;try{timing=submissionTiming(s,taskId,new Date(),dueDate);}catch(e){throw new AppError(400,(e as Error).message);}taskId=timing.taskId;prev=timing.prev;
    if(attendance||stage?.[2]==='test')throw new AppError(403,'출석과 TEST 응시는 담당자가 기록합니다.');if(prev?.status==='approved'&&viewer.role==='student')throw new AppError(409,'이미 확인한 과제입니다.');
    const files=(b.files??[]) as Attachment[];if(!Array.isArray(files)||files.length>10||files.some(f=>!f.key?.startsWith(`${workspaceId}/students/${s.id}/`)))throw new AppError(400,'첨부 파일을 확인해 주세요.');
    const paperWork=taskId.endsWith(':problems')||stage?.[2]==='practice'||!!extra;
    if(paperWork&&(b.paperConfirmed!==true||b.graded!==true))throw new AppError(400,'종이에 조건정리·구하는 것·풀이를 적고 채점한 뒤 확인해 주세요.');
    if(!taskId.endsWith(':wake')&&!files.length&&!prev?.files?.length)throw new AppError(400,'과제 사진 또는 PDF를 첨부해 주세요.');
    if(taskId.endsWith(':wake')&&!validWake(b.value))throw new AppError(400,'기상 인증은 한국 시간 05:00~06:30에 제출하며 기상 시각도 해당 범위여야 합니다.');
    if(taskId.endsWith(':problems')&&(!Number.isInteger(b.value)||Number(b.value)<0||Number(b.value)>500))throw new AppError(400,'오늘 푼 문제 수를 입력해 주세요.');if(taskId.endsWith(':wake')&&!validTime(String(b.value)))throw new AppError(400,'기상 시각을 입력해 주세요.');
    if(taskId.endsWith(':writing')&&(!Number.isInteger(b.value)||Number(b.value)<0||Number(b.value)>500))throw new AppError(400,'해설 개수는 0~500개의 정수로 입력해 주세요.');
    s.marks[taskId]={...prev,status:timing.late?'missed':'submitted',late:timing.late,onTimeSubmittedAt:timing.onTimeSubmittedAt,paperConfirmed:b.paperConfirmed===true,graded:b.graded===true,note:clean(b.note,1000),value:b.value as number|string,confirmedWritingCount:undefined,files:files.length?files:(prev?.files??[]),submittedAt:timing.submittedAt,reviewedAt:undefined,reviewer:undefined};
    return {submittedTaskId:taskId,late:timing.late};
   }else{
    staff(viewer);const status=b.status as Mark['status'];if(!['approved','revision','missed'].includes(status))throw new AppError(400,'확인 상태를 선택해 주세요.');const score=stage?.[2]==='test'?(b.score===undefined?prev?.score:b.score===''?undefined:Number(b.score)):undefined;if(score!==undefined&&(!Number.isFinite(score)||score<0||score>100))throw new AppError(400,'TEST 점수는 0~100점입니다.');
    let confirmedWritingCount=prev?.confirmedWritingCount;
    if(taskId.endsWith(':writing')&&b.confirmedWritingCount!==undefined){confirmedWritingCount=b.confirmedWritingCount===''?undefined:Number(b.confirmedWritingCount);if(confirmedWritingCount!==undefined&&(!Number.isInteger(confirmedWritingCount)||confirmedWritingCount<0||confirmedWritingCount>500))throw new AppError(400,'확인한 해설 개수는 0~500개의 정수입니다.');}
    s.marks[taskId]={...prev,status:reviewedSubmission(prev,status),score,confirmedWritingCount,note:b.note===undefined?prev?.note:clean(b.note,1000),reviewer:viewer.name,reviewedAt:new Date().toISOString()};
   }return {};
  }
  if(action==='consult'){if(!w.consultations.some(c=>c.studentId===s.id&&c.status==='접수'))w.consultations.push({id:crypto.randomUUID(),studentId:s.id,note:clean(b.note,1000)||'진단 결과로 시작 계획 상담을 요청합니다.',createdAt:new Date().toISOString(),status:'접수'});return {};}
  if(action==='resolveConsult'){staff(viewer);const c=w.consultations.find(c=>c.id===b.id);if(c){canStudent(viewer,c.studentId);c.status='확인';}return {};}
  throw new AppError(400,'지원하지 않는 작업입니다.');
 });return json({workspace:filterWorkspace(updated.workspace,viewer),revision:updated.revision,viewer,...updated.result});
 }catch(e){return failure(e);}}
