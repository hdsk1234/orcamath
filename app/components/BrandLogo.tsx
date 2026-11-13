import {imageSrcSet} from '../lib/images';
export default function BrandLogo({className='brand-logo'}:{className?:string}){
 return <img className={className} src="/brand/orca-symbol-v1.webp" srcSet={imageSrcSet("/brand/orca-symbol-v1.webp")} sizes="44px" width={44} height={44} alt="ORCA EDU 범고래 로고"/>;
}
