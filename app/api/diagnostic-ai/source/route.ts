import {identity,checkOrigin,failure,AppError} from '../../../lib/server';
import {requireAiOwner} from '../../../lib/diagnostic-ai';
import {FILE_ATTACHMENTS_MESSAGE} from '../../../lib/file-storage';

async function unavailable(){try{
 const {viewer}=await identity();
 try{requireAiOwner(viewer);}catch(error){throw new AppError(403,error instanceof Error?error.message:'접근 권한이 없습니다.');}
 throw new AppError(503,FILE_ATTACHMENTS_MESSAGE);
}catch(error){return failure(error);}}

export async function GET(){return unavailable();}
export async function POST(request:Request){try{checkOrigin(request);}catch(error){return failure(error);}return unavailable();}
