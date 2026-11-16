const cookieNames=['orca.session-token','__Secure-orca.session-token','orca-link','__Host-orca-link'];

// Ending a local JWT session must also work when OAuth settings or secrets are unavailable.
export function logoutResponse(request:Request){
 const url=new URL(request.url);
 if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{Allow:'POST'}});
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return new Response('Invalid origin',{status:403});
 const names=new Set(cookieNames);
 for(const cookie of (request.headers.get('cookie')??'').split(';')){
  const name=cookie.trim().split('=')[0];
  if(/^(?:__Secure-)?orca\.session-token\.\d+$/.test(name))names.add(name);
 }
 const headers=new Headers({'Cache-Control':'private, no-store',Location:'/login'});
 for(const name of names)headers.append('Set-Cookie',`${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${name.startsWith('__')?'; Secure':''}`);
 return new Response(null,{status:303,headers});
}
