import React from 'react';
import { cn } from '@/lib/utils';
import { PROJECT_MODULES } from '@/api/access';

/** Toggle chips for the project modules a member may edit. */
export default function ModulePicker({ value, onChange, disabled = false }) {
  const toggle = (module) => onChange(value.includes(module) ? value.filter((m) => m !== module) : [...value, module]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {PROJECT_MODULES.map(({ value: module, label }) => {
        const on = value.includes(module);
        return (
          <button
            key={module}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => toggle(module)}
            className={cn(
              'px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors',
              on ? 'bg-[#002046] border-[#002046] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400',
              disabled && 'opacity-60 cursor-default hover:border-slate-200',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
