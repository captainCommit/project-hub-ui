import React, { useState } from 'react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import DecisionLog from './DecisionLog';
import ChangeRegister from './ChangeRegister';
import { Scale, FileEdit, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChangeOverview from '@/components/projects/ChangeOverview';
import { useAccountChangeRequests, useAccountDecisions, useAccountHierarchy } from '@/hooks/useAccountLookups';

export default function ChangeRegisterHub() {
  const [tab, setTab] = useState('overview');

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
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Change Management</h1>
          </div>
        </div>
        <div className="flex items-center gap-1 border-b-2 border-slate-200 bg-white px-0">
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
          <ChangeOverview decisions={decisions} changeRequests={changeRequests} projects={projects} programs={programs} portfolios={portfolios} />
        ) : tab === 'decisions' ? (
          <DecisionLog embedded />
        ) : (
          <ChangeRegister embedded />
        )}
      </div>
    </div>
  );
}