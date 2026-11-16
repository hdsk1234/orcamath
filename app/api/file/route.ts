import {identity,failure,AppError} from '../../lib/server';
import {FILE_ATTACHMENTS_MESSAGE} from '../../lib/file-storage';

export async function GET(){try{
 await identity();
 throw new AppError(503,FILE_ATTACHMENTS_MESSAGE);
}catch(error){return failure(error);}}
