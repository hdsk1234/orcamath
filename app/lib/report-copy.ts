import type {DiagnosticReportData,ReportArea} from './diagnostic-report.ts';

export const technicalReference=/OMD[-\s]?\d{3}|\bp\.\s*\d+|(?:common|algebra|calculus)-(?:concept|application)-\d+/i;
export function isStudentParagraph(value:unknown):value is string{return typeof value==='string'&&value.trim().length>0&&[...value].length<=200&&!/[\r\n①-⑳]/.test(value)&&!technicalReference.test(value)&&!/(?:문항|질문)\s*(?:번호\s*)?\d+|\d+\s*번\s*(?:문항|질문)/.test(value);}
export function cleanReportText(value:string){
 return value.replace(/[（(][^()（）]*(?:OMD[-\s]?\d{3}|\bp\.\s*\d+)[^()（）]*[)）]/gi,'')
 .replace(/\bOMD[-\s]?\d{3}(?:\s*[=＝]\s*[①-⑤1-5])?/gi,'')
 .replace(/\bp\.\s*\d+(?:\s*[~–-]\s*\d+)?(?:\s*[·,]\s*\d+)*/gi,'')
 .replace(/\b(?:common|algebra|calculus)-(?:concept|application)-\d+\b/gi,'')
 .replace(/[①-⑤]/g,'').replace(/\(\s*\)/g,'').replace(/ +([,.])/g,'$1').replace(/ {2,}/g,' ').trim();
}
export function studentParagraph(value:string){
 const text=cleanReportText(value).replace(/\s+/g,' ').trim();
 const sentences=(text.match(/[^.!?。]+[.!?。]?/g)??[]).map(x=>x.trim()).filter(x=>!/(?:서버|산정 전|수치를.*보류|원장 검토|초안|\/\s*10.*제안)/.test(x));
 let result='';for(const sentence of sentences){if([...result+(result?' ':'')+sentence].length>200)break;result+=(result?' ':'')+sentence;}
 if(result)return result;
 const fallback=sentences[0]??text;if([...fallback].length<=200)return fallback;
 return [...fallback].slice(0,197).join('').replace(/\s+\S*$/,'').replace(/[ ,:;]+$/,'')+'…';
}
export function studentAreaAnalysis(a:ReportArea){return studentParagraph(a.analysis??a.evidence);}
export function studentReportCopy(report:DiagnosticReportData):DiagnosticReportData{
 return {...report,summary:studentParagraph(report.summary),strengths:report.strengths.map(studentParagraph),potential:{...report.potential,reason:studentParagraph(report.potential.reason)},note:cleanReportText(report.note),areas:report.areas.map(a=>{
  const oldAi=!a.analysis&&report.version.startsWith('omd-draft-'),parts=a.note.split(/\n\s*\n/);
  return {...a,analysis:studentParagraph(a.analysis??(oldAi?parts[0]:a.evidence)),note:cleanReportText(oldAi?parts.slice(1).join('\n\n'):a.note),action:cleanReportText(a.action),matches:a.matches.map(m=>({...m,advice:cleanReportText(m.advice)}))};
 })};
}
