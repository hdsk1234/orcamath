'use client';
import {useState} from 'react';
import type {Student} from '../lib/domain';
import {dateLabel} from '../lib/domain';

export default function LessonSchedule({student:s,act}:{student:Student;act:(b:Record<string,unknown>)=>Promise<any>}){
 const b=s.billing!,pending=b.sessions.filter(x=>x.status==='scheduled');
 const [id,setId]=useState(''),[message,setMessage]=useState('');
 if(b.stopped||b.settlementClosed||(s.enrollment&&s.enrollment.status!=='active')||!pending.length)return null;
 const x=pending.find(x=>x.id===id)??pending[0];
 return <details className="op-fold op-schedule"><summary>수업 일정 변경</summary><p className="op-schedule-note">예정된 수업의 날짜·시간만 변경합니다. 결석 처리나 회차 차감은 하지 않습니다.</p><label>변경할 수업<select aria-label="일정 변경 회차" value={x.id} onChange={e=>{setId(e.target.value);setMessage('');}}>{pending.map(x=><option key={x.id} value={x.id}>{b.sessions.indexOf(x)+1}회차 · {dateLabel(x.date)} {x.time}</option>)}</select></label><ScheduleForm key={`${b.cycleNumber}-${x.id}-${x.date}-${x.time}`} student={s} sessionId={x.id} act={act} onSaved={()=>setMessage('저장했습니다. 학생·학부모 달력에 변경한 일정이 표시됩니다.')}/>{message&&<p className="op-schedule-success" role="status">{message}</p>}</details>;
}
function ScheduleForm({student:s,sessionId,act,onSaved}:{student:Student;sessionId:string;act:(b:Record<string,unknown>)=>Promise<any>;onSaved:()=>void}){
 const b=s.billing!,x=b.sessions.find(x=>x.id===sessionId)!;
 const [date,setDate]=useState(x.date),[time,setTime]=useState(x.time),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await act({action:'billingSchedule',studentId:s.id,sessionId:x.id,cycleNumber:b.cycleNumber,expectedDate:x.date,expectedTime:x.time,date,time});onSaved();}catch(e){setError(e instanceof Error?e.message:'저장하지 못했습니다.');}finally{setBusy(false);}}}><fieldset disabled={busy}><div className="op-schedule-fields"><label>수업 날짜<input aria-label="변경할 수업 날짜" type="date" value={date} onChange={e=>setDate(e.target.value)} min="2000-01-01" max="2099-12-31" required/></label><label>수업 시간<input aria-label="변경할 수업 시간" type="time" value={time} onChange={e=>setTime(e.target.value)} required/></label></div><button type="submit" className="secondary" disabled={date===x.date&&time===x.time}>{busy?'저장 중…':'날짜·시간 저장'}</button></fieldset>{error&&<p className="amber-text" role="alert">{error}</p>}</form>;
}
