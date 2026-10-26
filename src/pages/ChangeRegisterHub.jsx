import React, { useState } from 'react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import DecisionLog from './DecisionLog';
import ChangeRegister from './ChangeRegister';
import { Scale, FileEdit, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChangeOverview from '@/components/projects/ChangeOverview';
import { EMPTY_RAID_FILTERS } from '@/components/projects/RaidTable';
import { useAccountChangeRequests, useAccountDecisions, useAccountHierarchy } from '@/hooks/useAccountLookups';
import { useGlobalScope } from '@/lib/globalScope';
import Tour from '@/components/tour/Tour';
import { GOVERNANCE_TOUR } from './ChangeRegisterHub.tour';

export default function ChangeRegisterHub() {
  // ?tab=decisions|changes opens that tab (links from the Home page use it).
  const [tab, setTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return ['decisions', 'changes'].includes(requested) ? requested : 'overview';
  });

  // One set of filters for every tab, so choosing a project on one tab carries over to the others.
  const [scope, setScope] = useState(EMPTY_RAID_FILTERS);
  // Each tab puts its Export and New buttons on the tab row, in this element.
  const [actionsSlot, setActionsSlot] = useState(/** @type {HTMLDivElement | null} */ (null));

  const switchTab = (next) => {
    setTab(next);
    // Decisions and changes have their own statuses; the rest of the filters carry over.
    setScope(f => ({ ...f, status: '' }));
  };

  // The overview counts only what's inside the global scope; the Decisions and Changes tabs narrow their own lists.
  const { inScope, scopeHierarchy } = useGlobalScope();
  const { projects, programs, portfolios } = scopeHierarchy(useAccountHierarchy());
  const decisions = useAccountDecisions().filter(inScope);
  const changeRequests = useAccountChangeRequests().changeRequests.filter(inScope);

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
          <Tour tour={GOVERNANCE_TOUR} />
          <h1 className="text-2xl font-bold text-[#002046]">Governance</h1>
          <p className="text-sm text-slate-500 mt-1">Track decisions and change requests across portfolios, programs, and projects.</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 bg-white px-6 pt-3">
          <div data-tour="module-tabs" className="flex items-center gap-1">
            <button onClick={() => switchTab('overview')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'overview' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
              <LayoutDashboard className="w-4 h-4" /> Overview
            </button>
            <button onClick={() => switchTab('decisions')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'decisions' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
              <Scale className="w-4 h-4" /> Decisions
            </button>
            <button onClick={() => switchTab('changes')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'changes' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
              <FileEdit className="w-4 h-4" /> Changes
            </button>
          </div>
          <div ref={setActionsSlot} data-tour="page-actions" className="flex items-center gap-2 pb-2" />
        </div>
        {tab === 'overview' ? (
          <ChangeOverview decisions={decisions} changeRequests={changeRequests} projects={projects} programs={programs} portfolios={portfolios}
            filters={scope} onFiltersChange={setScope} onOpenTab={switchTab} />
        ) : tab === 'decisions' ? (
          <DecisionLog embedded filters={scope} onFiltersChange={setScope} actionsSlot={actionsSlot} />
        ) : (
          <ChangeRegister embedded filters={scope} onFiltersChange={setScope} actionsSlot={actionsSlot} />
        )}
      </div>
    </div>
  );
}