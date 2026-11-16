// A display name never grants a staff role.
export function signupRole(_name:string,choice:string){return choice==='parent'?'parent':'student';}
