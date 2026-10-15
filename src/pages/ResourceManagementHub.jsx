import React, { useState } from 'react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import ProjectResources from '@/pages/ProjectResources';
import ResourceCalendarPage from '@/pages/ResourceCalendarPage';
import Financials from '@/pages/Financials';
import { Users, Gauge, Calendar, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';

export default function ResourceManagementHub() {
  const [tab, setTab] = useState('overview');
  const { projects, programs, portfolios } = useAccountHierarchy();

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
            <h1 className="text-lg font-semibold text-slate-800">Resources</h1>
          </div>
        </div>
        <div className="flex items-center gap-1 border-b-2 border-slate-200 bg-white px-0">
          <button onClick={() => setTab('overview')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'overview' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Users className="w-4 h-4" /> Overview
          </button>
          <button onClick={() => setTab('capacity')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'capacity' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Gauge className="w-4 h-4" /> Capacity
          </button>
          <button onClick={() => setTab('availability')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'availability' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Calendar className="w-4 h-4" /> Availability
          </button>
          <button onClick={() => setTab('costs')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'costs' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Wallet className="w-4 h-4" /> Costs
          </button>
        </div>
        {tab === 'overview' ? (
          <ProjectResources embedded section="overview" />
        ) : tab === 'capacity' ? (
          <ProjectResources embedded section="capacity" />
        ) : tab === 'availability' ? (
          <ResourceCalendarPage embedded />
        ) : (
          <Financials embedded />
        )}
      </div>
    </div>
  );
}