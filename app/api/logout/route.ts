import {getChatGPTUser} from '../../chatgpt-auth';
import {logoutResponse} from '../../lib/logout';

export async function POST(request:Request){return logoutResponse(request,!!await getChatGPTUser());}
