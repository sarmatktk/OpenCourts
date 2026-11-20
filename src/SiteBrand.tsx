import TennisBall from './TennisBall';

export default function SiteBrand({href='/',footer=false}:{href?:string;footer?:boolean}){
 return <a className={footer?'brand footer-brand':'brand'} href={href} aria-label="OpenCourts home"><span className="brand-mark"><TennisBall size={footer?18:20}/></span><span>open<span className="brand-light">courts</span></span></a>;
}
