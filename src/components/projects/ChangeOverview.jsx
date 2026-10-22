import React from 'react';
import { Scale, FilePen, X, ClipboardList, Clock, ClipboardCheck, ChevronRight, ArrowRight } from 'lucide-react';
import MultiSelectFilter from '@/components/projects/MultiSelectFilter';
import { StatCard, NAVY, MUTED } from '@/components/projects/DirectoryKit';
import { inRaidScope, raidStatusLabel } from '@/components/projects/RaidTable';

// Colours are hex values: index.css remaps Tailwind's green/blue/amber classes to the brand navy/orange.
// Sampled from the Governance mockup.
const STATUS_COLORS = {
  draft: '#A0A8B4',
  open: '#38BDF8',
  pending: '#D89420',
  in_review: '#D89420',
  approved: '#1C8448',
  implemented: '#2874F4',
  cancelled: '#C81014',
  rejected: '#B91C1C',
  deferred: '#748498',
  superseded: '#475569',
};

const DECISION_STATUSES = ['draft', 'in_review', 'approved', 'cancelled', 'deferred'];
const CHANGE_STATUSES = ['draft', 'in_review', 'approved', 'implemented', 'cancelled', 'deferred'];

/** Counts for the usual statuses (always listed) plus any other status the items use. */
function statusCounts(items, base) {
  const keys = [...base, ...new Set(items.map(i => i.status || 'draft').filter(k => !base.includes(k)))];
  return keys.map(key => ({
    key,
    label: raidStatusLabel(key),
    color: STATUS_COLORS[key] || '#94A3B8',
    count: items.filter(i => (i.status || 'draft') === key).length,
  }));
}

function StatusBreakdown({ icon: Icon, title, items, statuses }) {
  const total = items.length;
  const segments = statusCounts(items, statuses);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-6 h-6" style={{ color: NAVY }} />
        <h3 className="text-lg font-bold flex-1" style={{ color: NAVY }}>{title}</h3>
        <span className="text-sm" style={{ color: MUTED }}>{total} total</span>
      </div>
      <div className="flex h-7 rounded-full overflow-hidden bg-slate-100 mb-5">
        {total > 0 && segments.filter(s => s.count > 0).map(s => (
          <div key={s.key} style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }} title={`${s.label}: ${s.count}`} />
        ))}
      </div>
      <div className="space-y-2.5">
        {segments.map(s => (
          <div key={s.key} className="flex items-center justify-between text-[15px]">
            <span className="flex items-center gap-2" style={{ color: MUTED }}>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />{s.label}
            </span>
            <span className="font-semibold" style={{ color: NAVY }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttentionRow({ icon: Icon, iconColor, title, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-4 px-2 py-3 text-left rounded-lg hover:bg-slate-50 border-t border-slate-100">
      <Icon className="w-6 h-6 flex-shrink-0" style={{ color: iconColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: NAVY }}>{title}</p>
        <p className="text-xs" style={{ color: MUTED }}>{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </button>
  );
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// filters / onFiltersChange: the portfolio, program and project scope, kept by the Governance page.
// onOpenTab('decisions' | 'changes') opens that log.
export default function ChangeOverview({ decisions = [], changeRequests = [], projects = [], programs = [], portfolios = [], filters, onFiltersChange, onOpenTab }) {
  const { portfolios: filterPortfolios, programs: filterPrograms, projects: filterProjects } = filters;
  const setScope = (patch) => onFiltersChange({ ...filters, ...patch });

  const portfolioProgramIds = filterPortfolios.length ? programs.filter(p => filterPortfolios.includes(p.portfolio_id)).map(p => p.id) : null;
  const scopedProgramIds = portfolioProgramIds || programs.map(p => p.id);
  const programOptions = programs.filter(p => scopedProgramIds.includes(p.id));
  const activeProgramIds = filterPrograms.length ? filterPrograms.filter(id => scopedProgramIds.includes(id)) : scopedProgramIds;
  const projectOptions = projects.filter(p => activeProgramIds.includes(p.program_id));

  const fDecisions = decisions.filter(d => inRaidScope(d, filters, programs));
  const fChanges = changeRequests.filter(c => inRaidScope(c, filters, programs));
  const hasFilters = !!(filterPortfolios.length || filterPrograms.length || filterProjects.length);

  const decisionsInReview = fDecisions.filter(d => d.status === 'in_review').length;
  const changesInReview = fChanges.filter(c => c.status === 'in_review').length;
  const inReview = decisionsInReview + changesInReview;
  const approvedChanges = fChanges.filter(c => c.status === 'approved').length;

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: '#F7F9FC', fontFamily: 'Segoe UI, sans-serif' }}>
      <div className="px-6 py-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter options={portfolios.map(p => ({ value: p.id, label: p.name }))} selected={filterPortfolios}
            onChange={(v) => setScope({ portfolios: v, programs: [], projects: [] })} allLabel="All Portfolios" className="h-11 w-auto min-w-[190px] px-4 gap-6 rounded-lg border-slate-200 text-[15px] text-[#002046] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-[#002046]" />
          <MultiSelectFilter options={programOptions.map(p => ({ value: p.id, label: p.name }))} selected={filterPrograms}
            onChange={(v) => setScope({ programs: v, projects: [] })} allLabel="All Programs" className="h-11 w-auto min-w-[190px] px-4 gap-6 rounded-lg border-slate-200 text-[15px] text-[#002046] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-[#002046]" />
          <MultiSelectFilter options={projectOptions.map(p => ({ value: p.id, label: p.name }))} selected={filterProjects}
            onChange={(v) => setScope({ projects: v })} allLabel="All Projects" className="h-11 w-auto min-w-[190px] px-4 gap-6 rounded-lg border-slate-200 text-[15px] text-[#002046] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-[#002046]" />
          {hasFilters && (
            <button onClick={() => setScope({ portfolios: [], programs: [], projects: [] })} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 ml-1">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard value={fDecisions.length} label="Total Decisions" sub="Across selected scope" />
          <StatCard value={fChanges.length} label="Change Requests" sub="Across selected scope" />
          <StatCard value={inReview} label="In Review" sub={`${plural(decisionsInReview, 'decision', 'decisions')} · ${plural(changesInReview, 'change', 'changes')}`} />
          <StatCard value={approvedChanges} label="Approved Changes" sub="Awaiting implementation" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatusBreakdown icon={Scale} title="Decisions" items={fDecisions} statuses={DECISION_STATUSES} />
          <StatusBreakdown icon={FilePen} title="Change Requests" items={fChanges} statuses={CHANGE_STATUSES} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-5 h-5" style={{ color: NAVY }} />
            <h3 className="text-base font-bold flex-1" style={{ color: NAVY }}>Requires Attention</h3>
            <button type="button" onClick={() => onOpenTab('decisions')} className="flex items-center gap-1 text-sm hover:underline" style={{ color: MUTED }}>
              View details <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {inReview === 0 && approvedChanges === 0 ? (
            <p className="text-sm py-4 border-t border-slate-100" style={{ color: MUTED }}>Nothing is waiting on a decision or an implementation.</p>
          ) : (
            <>
              {inReview > 0 && (
                <AttentionRow icon={Clock} iconColor="#D68211"
                  title={`${plural(inReview, 'item', 'items')} in review`}
                  sub={`${plural(decisionsInReview, 'decision', 'decisions')} and ${plural(changesInReview, 'change request', 'change requests')} awaiting an outcome`}
                  onClick={() => onOpenTab(decisionsInReview > 0 ? 'decisions' : 'changes')} />
              )}
              {approvedChanges > 0 && (
                <AttentionRow icon={ClipboardCheck} iconColor={NAVY}
                  title={`${plural(approvedChanges, 'approved change', 'approved changes')} awaiting implementation`}
                  sub="Approval completed; implementation still pending"
                  onClick={() => onOpenTab('changes')} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
