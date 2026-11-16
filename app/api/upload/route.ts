import {identity,checkOrigin,failure,AppError} from '../../lib/server';
import {canWriteRecords} from '../../lib/domain';
import {FILE_ATTACHMENTS_MESSAGE} from '../../lib/file-storage';

export async function POST(request:Request){try{
 checkOrigin(request);
 const {viewer}=await identity();
 if(!canWriteRecords(viewer.role))throw new AppError(403,'학부모 계정은 파일을 업로드할 수 없습니다.');
 throw new AppError(503,FILE_ATTACHMENTS_MESSAGE);
}catch(error){return failure(error);}}
