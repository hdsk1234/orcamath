import manifest from './image-manifest.json';
type ImageEntry = {src:string;width:number;height:number;variants:{width:number;src:string}[]};
const images:Record<string,ImageEntry> = manifest;
export function imageAsset(src:string){return images[src];}
export function optimizedImage(src:string){return images[src]?.src??src;}
export function imageSrcSet(src:string){return images[src]?.variants.map(v=>`${v.src} ${v.width}w`).join(', ');}
