import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from './useTheme';
import PlayTogetherHeader from './PlayTogetherHeader';
import './play-together.css';
export default function PlayTogetherShell({children,home=false,backHref,backLabel}:{children:ReactNode;home?:boolean;backHref?:string;backLabel?:string}){
  const {dark}=useTheme();
  return <div className={dark?'app dark':'app'}><PlayTogetherHeader/><main className="pt-page"><a className="pt-back" href={backHref??(home?'/':'/play-together')}><ArrowLeft size={16}/>{backLabel??(home?'Back to courts':'Back to games')}</a>{children}<div className="pt-footer"><a href="/privacy">Privacy policy</a><span>OpenCourts · Play Together</span></div></main></div>;
}
