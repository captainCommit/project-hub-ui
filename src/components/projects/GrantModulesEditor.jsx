import React from 'react';
import { PROJECT_MODULES } from '@/api/access';
import ModulePicker from '@/components/projects/ModulePicker';
import { cn } from '@/lib/utils';

const ALL = PROJECT_MODULES.map((m) => m.value);

/**
 * Which parts of a project a grant shows, and (for members) which of those it lets them edit.
 * viewModules null means everything is visible. Editing always implies seeing.
 * onChange receives { view_modules, modules }.
 */
export default function GrantModulesEditor({ role, viewModules, modules, onChange, disabled = false }) {
  if (role === 'MANAGER') {
    return <p className="text-[11px] text-slate-500">Managers see and edit everything here.</p>;
  }
  const seesAll = viewModules == null;
  const visible = seesAll ? ALL : viewModules;

  const setVisible = (next) => {
    // Hiding a module also stops them editing it.
    onChange({ view_modules: next, modules: modules.filter((m) => (next == null ? true : next.includes(m))) });
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-slate-500">Can see</p>
          <div className="inline-flex rounded-md border border-slate-200 p-0.5 text-[11px]">
            {[
              { label: 'Everything', active: seesAll, next: null },
              { label: 'Only some', active: !seesAll, next: seesAll ? [...ALL] : viewModules },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                disabled={disabled}
                onClick={() => !option.active && setVisible(option.next)}
                className={cn('px-2 py-0.5 rounded', option.active ? 'bg-[#002046] text-white' : 'text-slate-500 hover:text-slate-700')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {!seesAll && <ModulePicker value={viewModules} onChange={setVisible} disabled={disabled} />}
      </div>
      {role === 'MEMBER' && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-500">Can edit</p>
          <ModulePicker value={modules} only={visible} disabled={disabled} onChange={(next) => onChange({ view_modules: viewModules, modules: next })} />
        </div>
      )}
      {role === 'VIEWER' && <p className="text-[11px] text-slate-400">Viewers can't edit anything.</p>}
    </div>
  );
}
