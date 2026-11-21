import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** A small (i) that explains the label next to it. */
export default function InfoTip({ children, className = 'w-3.5 h-3.5 text-slate-400' }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild><Info className={`${className} cursor-help flex-shrink-0`} /></TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs font-normal">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
