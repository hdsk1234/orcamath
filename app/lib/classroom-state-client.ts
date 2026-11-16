import type {Workspace,Viewer} from './domain.ts';
export type ClassroomData={workspace:Workspace;viewer:Viewer;revision:number;teacherViewers?:Viewer[]};
export class ClassroomStateError extends Error{
 status:number;
 constructor(status:number,message:string){super(message);this.status=status;}
}
/** Share concurrent focus/poll/manual refreshes without storing account data globally. */
export function createClassroomStateLoader(fetcher:typeof fetch=fetch){
 let active:{promise:Promise<ClassroomData>;controller:AbortController}|null=null;
 return {
  load():Promise<ClassroomData>{
   if(active)return active.promise;
   const controller=new AbortController();
   const promise=(async()=>{
    const response=await fetcher('/api/state',{cache:'no-store',signal:controller.signal});
    const payload=await response.json() as ClassroomData&{error?:string};
    if(!response.ok)throw new ClassroomStateError(response.status,payload.error??'연결을 확인해 주세요.');
    return payload;
   })().finally(()=>{if(active?.promise===promise)active=null;});
   active={promise,controller};
   return promise;
  },
  abort(){const previous=active;active=null;previous?.controller.abort();},
 };
}
