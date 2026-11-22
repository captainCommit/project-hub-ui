import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Info, Loader2, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NAVY, MUTED } from '@/components/projects/DirectoryKit';

const ORANGE = '#E8711A'; // the same as Add User (Account > Users and Roles)

const nameOf = (user) => user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Unknown user';

/** A dropdown with a search box. multiple: a checklist whose picks show as removable chips under it. */
function SearchPicker({ options, value, onChange, placeholder, multiple = false, disabled = false, countNoun = undefined }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = multiple ? value : (value ? [value] : []);
  const shown = options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const pick = (id) => {
    if (!multiple) { onChange(id); setOpen(false); return; }
    onChange(selected.includes(id) ? selected.filter(v => v !== id) : [...selected, id]);
  };
  const single = !multiple && options.find(o => o.value === value);
  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(''); }}>
        <PopoverTrigger asChild disabled={disabled}>
          <button type="button" disabled={disabled}
            className="w-full h-9 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-left disabled:bg-slate-50 disabled:cursor-not-allowed">
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
            <span className="flex-1 truncate" style={{ color: single ? NAVY : MUTED }}>{single ? single.label : placeholder}</span>
            <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0 w-[var(--radix-popover-trigger-width)]">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
              className="w-full h-8 rounded border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {shown.length === 0 && <p className="px-3 py-3 text-xs text-center" style={{ color: MUTED }}>Nothing matches.</p>}
            {shown.map(o => (
              <button key={o.value} type="button" onClick={() => pick(o.value)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-slate-50">
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {selected.includes(o.value) && <Check className="w-4 h-4" style={{ color: NAVY }} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate" style={{ color: NAVY }}>{o.label}</span>
                  {o.sub && <span className="block text-xs truncate" style={{ color: MUTED }}>{o.sub}</span>}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {multiple && selected.length > 0 && (
        <div className="rounded-md border border-slate-200 p-2">
          <div className="flex flex-wrap gap-1.5">
            {selected.map(id => {
              const option = options.find(o => o.value === id);
              if (!option) return null;
              return (
                <span key={id} className="inline-flex items-center gap-1 rounded-md bg-[#EAF0F8] px-2 py-1 text-xs" style={{ color: NAVY }}>
                  {option.label}
                  <button type="button" onClick={() => pick(id)} aria-label={`Remove ${option.label}`} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                </span>
              );
            })}
          </div>
          {countNoun && <p className="text-[11px] text-right mt-1" style={{ color: MUTED }}>{selected.length} of {options.length} {countNoun}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * Resources > Capacity > Add Resource: pick an existing user, their weekly capacity and where they work.
 * Their name, job title and department come from their user profile. With `resource`, edits that resource instead.
 *
 * candidates: account members not yet on Resources ({ id, full_name, email, title, department }).
 * onSubmit({ user_id?, weekly_capacity, portfolio_ids, program_ids, project_ids }) returns a promise.
 */
export default function AddResourceDialog({ open, onOpenChange, resource = null, candidates, portfolios, programs, projects, onSubmit, saving }) {
  const editing = Boolean(resource);
  const [userId, setUserId] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [portfolioIds, setPortfolioIds] = useState([]);
  const [programIds, setProgramIds] = useState([]);
  const [projectIds, setProjectIds] = useState([]);

  useEffect(() => {
    if (!open) return;
    setUserId('');
    setCapacity(String(resource?.weekly_capacity ?? 40));
    setPortfolioIds(resource?.portfolio_ids ?? []);
    setProgramIds(resource?.program_ids ?? []);
    setProjectIds(resource?.project_ids ?? []);
  }, [open, resource]);

  const programOptions = useMemo(() => programs.filter(p => portfolioIds.includes(p.portfolio_id)), [programs, portfolioIds]);
  const projectOptions = useMemo(() => projects.filter(p => programIds.includes(p.program_id)), [projects, programIds]);

  // Narrowing a parent drops what was picked under it; adding a program brings in all its projects.
  const changePortfolios = (ids) => {
    setPortfolioIds(ids);
    const keptPrograms = programIds.filter(id => ids.includes(programs.find(p => p.id === id)?.portfolio_id));
    setProgramIds(keptPrograms);
    setProjectIds(projectIds.filter(id => keptPrograms.includes(projects.find(p => p.id === id)?.program_id)));
  };
  const changePrograms = (ids) => {
    const added = ids.filter(id => !programIds.includes(id));
    setProgramIds(ids);
    const kept = projectIds.filter(id => ids.includes(projects.find(p => p.id === id)?.program_id));
    const brought = projects.filter(p => added.includes(p.program_id)).map(p => p.id);
    setProjectIds([...new Set([...kept, ...brought])]);
  };

  const capacityNumber = Number(capacity);
  const complete = (editing || userId) && capacityNumber > 0 && capacityNumber <= 168 && portfolioIds.length > 0 && programIds.length > 0;
  const chosen = candidates.find(u => u.id === userId);
  const submit = (e) => {
    e.preventDefault();
    if (!complete || saving) return;
    onSubmit({
      ...(editing ? {} : { user_id: userId }),
      weekly_capacity: capacityNumber,
      portfolio_ids: portfolioIds,
      program_ids: programIds,
      project_ids: projectIds,
    });
  };
  const label = (text, required = false) => (
    <Label className="text-xs font-semibold" style={{ color: NAVY }}>{text}{required && <span className="text-red-500"> *</span>}</Label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: NAVY }}>{editing ? `Edit Resource · ${resource.full_name}` : 'Add Resource'}</DialogTitle>
          <p className="text-xs" style={{ color: MUTED }}>
            {editing
              ? 'Change their weekly capacity and the portfolios, programs and projects they are assigned to.'
              : 'Add an existing user as a resource, assign portfolios, programs, projects, and set their weekly capacity.'}
          </p>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          {!editing && (
            <div className="space-y-1.5">
              {label('Resource Name', true)}
              <SearchPicker
                options={candidates.map(u => ({ value: u.id, label: nameOf(u), sub: [u.title, u.department].filter(Boolean).join(' · ') || u.email }))}
                value={userId} onChange={setUserId} placeholder="Search and select a user" />
              {chosen && (
                <p className="text-xs" style={{ color: MUTED }}>
                  Job title and department come from their user profile: {[chosen.title, chosen.department].filter(Boolean).join(' · ') || 'not set yet'}.
                </p>
              )}
              {candidates.length === 0 && <p className="text-xs" style={{ color: MUTED }}>Everyone in the account is already on Resources. Invite new people under Account → Users &amp; Roles.</p>}
            </div>
          )}
          <div className="space-y-1.5">
            {label('Weekly Capacity', true)}
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={168} step="0.5" value={capacity} onChange={e => setCapacity(e.target.value)} aria-label="Weekly capacity in hours"
                className="h-9 w-24 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              <span className="text-sm" style={{ color: MUTED }}>hrs/wk</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {label('Assigned Portfolios', true)}
            <SearchPicker multiple options={portfolios.map(p => ({ value: p.id, label: p.name }))} value={portfolioIds}
              onChange={changePortfolios} placeholder="Search and select portfolios" />
          </div>
          <div className="space-y-1.5">
            {label('Assigned Programs', true)}
            <SearchPicker multiple options={programOptions.map(p => ({ value: p.id, label: p.name }))} value={programIds}
              onChange={changePrograms} placeholder={portfolioIds.length ? 'Search and select programs' : 'Select a portfolio first'}
              disabled={!portfolioIds.length} />
          </div>
          <div className="space-y-1.5">
            {label('Assign Projects (optional)')}
            <SearchPicker multiple options={projectOptions.map(p => ({ value: p.id, label: p.name }))} value={projectIds}
              onChange={setProjectIds} placeholder={programIds.length ? 'Search projects to add…' : 'Select a program first'}
              disabled={!programIds.length} countNoun="projects" />
          </div>
          <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ backgroundColor: '#EEF4FB', color: '#334155' }}>
            <Info className="w-4 h-4 flex-shrink-0 mt-px" style={{ color: NAVY }} />
            <span>
              {editing ? 'Saving updates their assignments. ' : 'This will add the user to the Resources list with the selected portfolios, programs, and projects. '}
              Assigned projects also give them access to those projects. You can set or override project and non-project
              allocation hours from the resource details after adding.
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" className="gap-1.5 text-white border-0" style={{ backgroundColor: ORANGE }} disabled={!complete || saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? 'Save Changes' : 'Add Resource'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
