import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MultiSelectFilter({
  options = [],
  selected = [],
  onChange,
  allLabel = 'All',
  className,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const allSelected = selected.length === 0;
  const triggerLabel = allSelected
    ? allLabel
    : selected.length === 1
      ? (options.find((o) => o.value === selected[0])?.label || '1 selected')
      : `${selected.length} selected`;

  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center justify-between gap-1.5 h-7 w-40 px-2 text-xs bg-white border border-slate-300 rounded-md text-slate-700 hover:border-slate-400 transition-colors',
          className
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 left-0 bg-white border border-slate-200 rounded-md shadow-lg max-h-64 overflow-auto min-w-[180px] py-1">
          <button
            type="button"
            onClick={() => onChange([])}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 text-left',
              allSelected ? 'text-[#002046] font-medium' : 'text-slate-600'
            )}
          >
            <span
              className={cn(
                'w-3.5 h-3.5 border rounded flex items-center justify-center flex-shrink-0',
                allSelected ? 'bg-[#002046] border-[#002046]' : 'bg-white border-slate-300'
              )}
            >
              {allSelected && <Check className="w-3 h-3 text-white" />}
            </span>
            {allLabel}
          </button>
          <div className="border-t border-slate-100 my-1" />
          {options.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-slate-400">No options</p>
          )}
          {options.map((o) => {
            const sel = selected.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => toggle(o.value)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 text-left',
                  sel ? 'text-[#002046] font-medium' : 'text-slate-600'
                )}
              >
                <span
                  className={cn(
                    'w-3.5 h-3.5 border rounded flex items-center justify-center flex-shrink-0',
                    sel ? 'bg-[#002046] border-[#002046]' : 'bg-white border-slate-300'
                  )}
                >
                  {sel && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}