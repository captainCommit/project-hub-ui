import React, { useState } from 'react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import DecisionLog from './DecisionLog';
import ChangeRegister from './ChangeRegister';
import { Scale, FileEdit, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChangeOverview from '@/components/projects/ChangeOverview';
import { EMPTY_RAID_FILTERS } from '@/components/projects/RaidTable';
import { useAccountChangeRequests, useAccountDecisions, useAccountHierarchy } from '@/hooks/useAccountLookups';

export default function ChangeRegisterHub() {
  // ?tab=decisions|changes opens that tab (links from the Home page use it).
  const [tab, setTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return ['decisions', 'changes'].includes(requested) ? requested : 'overview';
  });

  // The overview's portfolio/program/project scope, kept while switching tabs.
  const [scope, setScope] = useState(EMPTY_RAID_FILTERS);

  const { projects, programs, portfolios } = useAccountHierarchy();
  const decisions = useAccountDecisions();
  const { changeRequests } = useAccountChangeRequests();

  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white px-6 pt-5">
          <h1 className="text-2xl font-bold text-[#002046]">Governance</h1>
          <p className="text-sm text-slate-500 mt-1">Track decisions and change requests across portfolios, programs, and projects.</p>
        </div>
        <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6 pt-3">
          <button onClick={() => setTab('overview')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'overview' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <LayoutDashboard className="w-4 h-4" /> Overview
          </button>
          <button onClick={() => setTab('decisions')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'decisions' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Scale className="w-4 h-4" /> Decisions
          </button>
          <button onClick={() => setTab('changes')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'changes' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <FileEdit className="w-4 h-4" /> Changes
          </button>
        </div>
        {tab === 'overview' ? (
          <ChangeOverview decisions={decisions} changeRequests={changeRequests} projects={projects} programs={programs} portfolios={portfolios}
            filters={scope} onFiltersChange={setScope} onOpenTab={setTab} />
        ) : tab === 'decisions' ? (
          <DecisionLog embedded />
        ) : (
          <ChangeRegister embedded />
        )}
      </div>
    </div>
  );
}