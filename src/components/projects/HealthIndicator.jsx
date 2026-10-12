import React from 'react';
import { cn } from '@/lib/utils';

// RAG health for the portfolio and program directories. The rules live with each directory's getRag;
// the descriptions here must match them.
// Colours are fixed hex values: index.css remaps Tailwind's green and amber classes to the brand navy/orange,
// which would make "on track" look navy.
export const RAG = {
  red:   { label: 'Off track',   color: '#dc2626', description: 'Open critical/high issue, or more than 3 open critical/high risks' },
  amber: { label: 'At risk',     color: '#f59e0b', description: '1–3 open critical/high risks' },
  green: { label: 'On track',    color: '#16a34a', description: 'No open critical/high risks or issues' },
  grey:  { label: 'Not started', color: '#cbd5e1', description: 'Nothing to measure yet' },
};

export function HealthDot({ rag }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={rag.description}>
      <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: rag.color }} />
      <span className="text-xs text-slate-600">{rag.label}</span>
    </span>
  );
}

// greyDescription: what a grey dot means in this directory (the rule differs between portfolios and programs).
export function HealthLegend({ greyDescription, className }) {
  const items = [RAG.green, RAG.amber, RAG.red, { ...RAG.grey, description: greyDescription || RAG.grey.description }];
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500', className)}>
      <span className="font-semibold text-slate-600">Health:</span>
      {items.map(item => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: item.color }} />
          <span><span className="font-medium text-slate-700">{item.label}</span> – {item.description}</span>
        </span>
      ))}
    </div>
  );
}
