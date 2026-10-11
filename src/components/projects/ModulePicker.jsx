import React from 'react';
import { cn } from '@/lib/utils';
import { PROJECT_MODULES } from '@/api/access';

/** Toggle chips for project modules. `only` limits which modules are offered. */
export default function ModulePicker({ value, onChange, disabled = false, only = null }) {
  const toggle = (module) => onChange(value.includes(module) ? value.filter((m) => m !== module) : [...value, module]);
  const offered = only ? PROJECT_MODULES.filter((m) => only.includes(m.value)) : PROJECT_MODULES;
  return (
    <div className="flex flex-wrap gap-1.5">
      {offered.length === 0 && <span className="text-[11px] text-slate-400">Pick what they can see first.</span>}
      {offered.map(({ value: module, label }) => {
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
