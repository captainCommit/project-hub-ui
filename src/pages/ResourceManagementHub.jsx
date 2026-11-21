import React, { useState } from 'react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import ProjectResources from '@/pages/ProjectResources';
import ResourceCalendarPage from '@/pages/ResourceCalendarPage';
import Financials from '@/pages/Financials';
import { Users, Gauge, Calendar, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import Tour from '@/components/tour/Tour';
import { RESOURCES_TOUR } from './ResourceManagementHub.tour';
import { EMPTY_RESOURCE_SCOPE } from '@/components/resources/ResourceKit';

export default function ResourceManagementHub() {
  const [tab, setTab] = useState('overview');
  const { projects, programs, portfolios } = useAccountHierarchy();
  // One set of portfolio / program / project filters for every tab, as on RAID and Governance.
  const [scope, setScope] = useState(EMPTY_RESOURCE_SCOPE);
  // What the Capacity tab opens filtered to when the Overview sends someone there.
  const [capacityFilter, setCapacityFilter] = useState({});

  const switchTab = (next) => {
    setCapacityFilter({});
    setTab(next);
  };
  const openCapacity = (filter = {}) => {
    setCapacityFilter(filter);
    setTab('capacity');
  };

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
          <Tour tour={RESOURCES_TOUR} />
          <h1 className="text-2xl font-bold text-[#002046]">Resources</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor capacity, allocation, availability and costs across your delivery teams</p>
        </div>
        <div data-tour="module-tabs" className="flex items-center gap-1 border-b border-slate-200 bg-white px-6 pt-3">
          <button onClick={() => switchTab('overview')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'overview' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Users className="w-4 h-4" /> Overview
          </button>
          <button onClick={() => switchTab('capacity')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'capacity' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Gauge className="w-4 h-4" /> Capacity
          </button>
          <button onClick={() => switchTab('availability')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'availability' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Calendar className="w-4 h-4" /> Availability
          </button>
          <button onClick={() => switchTab('costs')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'costs' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Wallet className="w-4 h-4" /> Costs
          </button>
        </div>
        {tab === 'overview' ? (
          <ProjectResources embedded section="overview" scope={scope} onScopeChange={setScope} onOpenCapacity={openCapacity} />
        ) : tab === 'capacity' ? (
          <ProjectResources embedded section="capacity" scope={scope} onScopeChange={setScope}
            initialHealth={capacityFilter.health || ''} initialSearch={capacityFilter.search || ''} />
        ) : tab === 'availability' ? (
          <ResourceCalendarPage embedded scope={scope} onScopeChange={setScope} />
        ) : (
          <Financials embedded />
        )}
      </div>
    </div>
  );
}