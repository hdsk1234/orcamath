import type {Operations as Book} from './operations';
export async function operationRequest(body:Record<string,unknown>){const r=await fetch('/api/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),p=await r.json() as {error?:string;operations:Book};if(!r.ok)throw Error(p.error??'저장하지 못했습니다.');return p;}
