'use client';
import {ArrowRight} from 'lucide-react';
import {learningFeedback} from '../lib/learning-feedback';
import {dateLabel,type Student,type Theme,type Task} from '../lib/domain';
import {useGuardianView} from './GuardianContext';

export default function LearningFeedback({student,themes,open,navigate}:{student:Student;themes:Theme[];open:(task:Task)=>void;navigate:(tab:string)=>void}){
 const feedback=learningFeedback(student,themes),readOnly=useGuardianView();
 return <div className={`learning-feedback tone-${feedback.tone}`}>
  <span className="hero-tag"><span className="live-dot"/>나의 오늘 피드백</span>
  <h2>{feedback.title}</h2>
  <div className="feedback-rate"><strong>{feedback.recent.percent===null?'집계 준비 중':`성사율 ${feedback.recent.percent}%`}</strong><span>{dateLabel(feedback.recent.start)}–{dateLabel(feedback.recent.end)} · 확인 대기 제외</span></div>
  <p className="feedback-evidence">{feedback.evidence}</p>
  {feedback.pendingMessage&&<p className="feedback-pending">{feedback.pendingMessage}</p>}
  <div className="feedback-next"><span>{feedback.focus?'오늘 먼저 할 일':feedback.awaiting?'확인 기다리기':feedback.complete?'오늘의 완료':'다음 단계'}</span>{feedback.focus&&<strong>{feedback.focus.task.kind==='wake'?'오늘 기상 시각 기록':feedback.focus.task.label}</strong>}<p>{feedback.focusReason}</p>{feedback.reviewNote&&<p className="feedback-review">담당자 안내: {feedback.reviewNote.length>160?feedback.reviewNote.slice(0,160)+'…':feedback.reviewNote}</p>}</div>
  <button className="feedback-action" onClick={()=>feedback.focus?open(feedback.focus.task):navigate('plan')}>{feedback.focus?(readOnly?'과제 기록 보기':'먼저 할 과제 열기'):'나의 2주 계획 보기'}<ArrowRight size={16}/></button>
  <small className="feedback-footnote">배정·제출·확인 기록 기준 · 개별과제 포함 · 수강료 할인 성사율은 기상·30문제·해설 기준</small>
 </div>;
}
