import handler from "vinext/server/fetch-handler";

export default {
  async fetch(request:Request, env:Cloudflare.Env, ctx:ExecutionContext){
    const response=await handler.fetch(request,env,ctx);
    const headers=new Headers(response.headers);
    headers.set('X-ORCA-Release','study-guide-20261015');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
};
