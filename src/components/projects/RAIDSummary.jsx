import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, BookOpen, CheckSquare, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const PRIORITY_COLOR = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_COLOR = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  mitigated: 'bg-green-100 text-green-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-500',
  validated: 'bg-teal-100 text-teal-700',
  invalidated: 'bg-rose-100 text-rose-700',
  draft: 'bg-slate-100 text-slate-600',
  approved: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};

function StatCard({ icon: Icon, label, count, open, href, colorClass }) {
  return (
    <Link to={href}>
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorClass)}>
            <Icon className="w-5 h-5" />
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
        </div>
        <p className="text-2xl font-bold text-slate-800">{count}</p>
        <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
        <p className="text-xs text-slate-400 mt-1">{open} open</p>
      </div>
    </Link>
  );
}

export default function RAIDSummary({ risks = [], issues = [], assumptions = [], decisions = [], projects = [] }) {
  const getProject = (id) => projects.find(p => p.id === id);

  const openRisks = risks.filter(r => r.status === 'open' || r.status === 'in_progress');
  const openIssues = issues.filter(i => i.status === 'open' || i.status === 'in_progress');
  const openAssumptions = assumptions.filter(a => a.status === 'open');
  const pendingDecisions = decisions.filter(d => d.status === 'pending' || d.status === 'in_review' || d.status === 'draft');

  const recentItems = [
    ...openRisks.slice(0, 3).map(r => ({ ...r, _type: 'risk' })),
    ...openIssues.slice(0, 3).map(i => ({ ...i, _type: 'issue' })),
  ].sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || '')).slice(0, 6);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">RAID Log</h1>
        <p className="text-sm text-slate-500 mt-1">Risks, Assumptions, Issues, Decisions</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={AlertTriangle} label="Risks" count={risks.length} open={openRisks.length} href={createPageUrl('RiskLog')} colorClass="bg-orange-100 text-orange-600" />
        <StatCard icon={BookOpen} label="Assumptions" count={assumptions.length} open={openAssumptions.length} href={createPageUrl('AssumptionLog')} colorClass="bg-teal-100 text-teal-600" />
        <StatCard icon={AlertCircle} label="Issues" count={issues.length} open={openIssues.length} href={createPageUrl('IssueLog')} colorClass="bg-red-100 text-red-600" />
        <StatCard icon={CheckSquare} label="Decisions" count={decisions.length} open={pendingDecisions.length} href={createPageUrl('DecisionLog')} colorClass="bg-indigo-100 text-indigo-600" />
      </div>

      {recentItems.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-700 mb-3">Open Risks &amp; Issues</h2>
          <div className="space-y-2">
            {recentItems.map(item => {
              const proj = getProject(item.project_id);
              const isRisk = item._type === 'risk';
              return (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-start gap-3">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', isRisk ? 'bg-orange-100' : 'bg-red-100')}>
                    {isRisk ? <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> : <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {proj && <span className="text-[10px] text-slate-400">{proj.name}</span>}
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', PRIORITY_COLOR[item.priority] || 'bg-slate-100 text-slate-500')}>{item.priority}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', STATUS_COLOR[item.status] || 'bg-slate-100 text-slate-500')}>{item.status?.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}