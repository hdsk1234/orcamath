'use client';
import {useEffect,useState} from 'react';
import type {Student} from '../lib/domain';
import {invoiceStatus,paidInvoice,type Invoice} from '../lib/operations';
import {money} from '../lib/billing';
export default function InvoiceSummary({student}:{student:Student}){
 const [invoices,setInvoices]=useState<Invoice[]>([]);
 useEffect(()=>{let alive=true;fetch('/api/operations',{cache:'no-store'}).then(r=>r.ok?r.json() as Promise<{operations?:{invoices?:Invoice[]}}>:null).then(p=>{if(alive)setInvoices(p?.operations?.invoices?.filter((i:Invoice)=>i.studentId===student.id)??[]);}).catch(()=>{});return()=>{alive=false;};},[student]);
 const upcoming=invoices.filter(i=>i.cycleNumber>(student.billing?.cycleNumber??0));
 return <>{upcoming.map(i=><div className="notice blue" key={i.id}><div><strong>다음 {i.cycleNumber}차 · {i.discountPending?'입금대기 · 할인 확인중':invoiceStatus(i)}</strong>{i.discountPending?<p>과제 확인 후 할인율과 납부할 금액이 확정됩니다.</p>:<p>확정 수강료 {money(i.amount)} · {i.discountPercent}% 할인 · 확인 입금 {money(paidInvoice(i))}</p>}<small>{i.cancelledAt?`선납 환불 기록 ${money((i.refunds??[]).reduce((n,r)=>n+r.amount,0))}`:i.discountPending?'할인이 확정되면 납부 금액을 안내할게요.':`남은 납부액 ${money(Math.max(0,i.amount-paidInvoice(i)))}${i.automatic?'':` · 납부기한 ${i.dueDate}`}`}</small>{i.payments.filter(p=>!p.voidedAt).at(-1)&&<small style={{display:'block'}}>최근 입금확인일 {new Date(i.payments.filter(p=>!p.voidedAt).at(-1)!.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</small>}</div></div>)}</>;
}
