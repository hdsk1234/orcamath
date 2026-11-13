export function createCompanionMotion(canvas:HTMLCanvasElement,img:HTMLImageElement,kind:number){
 canvas.width=360;canvas.height=360;const ctx=canvas.getContext('2d');if(!ctx)return null;
 const grid=18,size=360,cell=size/grid,source=document.createElement('canvas');source.width=size;source.height=size;source.getContext('2d')!.drawImage(img,0,0,size,size);
 const g=(x:number,y:number,cx:number,cy:number,rx:number,ry:number)=>Math.exp(-2*((x-cx)**2/rx**2+(y-cy)**2/ry**2));
 function point(x:number,y:number,t:number,a:number){let dx=0,dy=0;
  if(kind===0){const tail=g(x,y,.28,.72,.28,.25),f1=g(x,y,.57,.63,.19,.23),f2=g(x,y,.84,.56,.17,.22);dy=.021*Math.sin(t*1.5)*tail+.015*Math.sin(t*1.1+.8)*f1+.012*Math.sin(t*1.1+2.2)*f2;dx=.009*Math.cos(t*1.5)*tail;}
  else if(kind===1){const tail=g(x,y,.25,.38,.23,.35),fin=g(x,y,.63,.77,.28,.2);dy=.023*Math.sin(t*1.75)*tail+.012*Math.sin(t*1.3+1.3)*fin;dx=.012*Math.cos(t*1.75)*tail;}
  else if(kind===2){const l=g(x,y,.36,.77,.24,.22),r=g(x,y,.82,.78,.17,.22);dy=.018*Math.sin(t*.9)*l+.015*Math.sin(t*.9+1.2)*r;dx=.009*Math.cos(t*.9)*l-.008*Math.cos(t*.9+1.2)*r;}
  else if(kind===3){const tail=g(x,y,.60,.77,.32,.24),fin=g(x,y,.37,.48,.20,.35);dx=.015*Math.sin(t*1.05)*tail+.012*Math.sin(t*1.8+1.7)*fin;dy=.007*Math.cos(t*1.05)*tail;}
  else{let lower=Math.max(0,Math.min(1,(y-.40)/.30));lower=lower*lower*(3-2*lower);const side=Math.abs(x-.5)*2;dx=.013*Math.sin(t*1.25+x*11)*lower+.010*Math.sin(t*.95+y*10)*side;dy=.016*Math.sin(t*1.1+x*12)*lower+.007*Math.cos(t*1.25+y*9)*side;}
  const phase=kind*.8;dy+=.007*Math.sin(t*.73+phase);dx+=.003*Math.sin(t*.55+phase);const angle=.008*Math.sin(t*.6+phase)*a,c=Math.cos(angle),s=Math.sin(angle),qx=x-.5,qy=y-.5;
  return [(.5+.88*(c*qx-s*qy+dx*a))*size,(.5+.88*(s*qx+c*qy+dy*a))*size];
 }
 return(t:number,a:number)=>{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,size,size);const points:number[][][]=[];for(let y=0;y<=grid;y++){const row:number[][]=[];for(let x=0;x<=grid;x++)row.push(point(x/grid,y/grid,t,a));points.push(row);}
 for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const p=points[y][x],q=points[y][x+1],r=points[y+1][x],sx=x*cell,sy=y*cell,pad=.55;ctx.setTransform((q[0]-p[0])/cell,(q[1]-p[1])/cell,(r[0]-p[0])/cell,(r[1]-p[1])/cell,p[0],p[1]);const l=Math.max(0,sx-pad),top=Math.max(0,sy-pad),w=Math.min(size,sx+cell+pad)-l,h=Math.min(size,sy+cell+pad)-top;ctx.drawImage(source,l,top,w,h,l-sx,top-sy,w,h);}
 ctx.setTransform(1,0,0,1,0,0);canvas.dataset.motionTime=t.toFixed(3);};
}
