import React, { useState, useEffect } from 'react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import SprintView from '@/components/projects/SprintView';
import DeliverySummary from '@/components/projects/DeliverySummary';
import { Package, RefreshCw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccountHierarchy, useAccountResources, useAccountSprints } from '@/hooks/useAccountLookups';
import { useGlobalScope } from '@/lib/globalScope';
import Tour from '@/components/tour/Tour';
import { SPRINTS_TOUR } from './SprintManagement.tour';

export default function SprintManagement() {
  const [tab, setTab] = useState('overview');
  const [focusSprint, setFocusSprint] = useState(null);
  const [focusSprintId, setFocusSprintId] = useState(null);
  // The Sprint Board puts its New Sprint button in the header, in this element.
  const [actionsSlot, setActionsSlot] = useState(/** @type {HTMLDivElement | null} */ (null));
  const hierarchy = useAccountHierarchy();
  const { projects, programs, portfolios } = useGlobalScope().scopeHierarchy(hierarchy);
  const resources = useAccountResources();
  // A ?focusSprint= link names only the sprint; its project comes from the account's sprints.
  const accountSprints = useAccountSprints();
  const focusProjectId = focusSprint?.project_id || accountSprints.find(s => s.id === focusSprintId)?.project_id;
  // The board offers the projects inside the global scope, plus a linked sprint's project when it's outside.
  const focusProject = focusProjectId && !projects.some(p => p.id === focusProjectId) && hierarchy.projects.find(p => p.id === focusProjectId);
  const boardProjects = focusProject ? [...projects, focusProject] : projects;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('focusSprint');
    if (id) {
      setFocusSprintId(id);
      setTab('sprints');
    }
  }, []);

  const tabClass = (active) => cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
    active ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50');

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
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-6 h-6 mt-1 text-[#002046]" />
              <div>
                <h1 className="text-2xl font-bold text-[#002046]">Sprints</h1>
                <p className="text-sm text-slate-500 mt-0.5">Plan, track, and manage agile delivery across projects.</p>
              </div>
            </div>
            <div ref={setActionsSlot} data-tour="page-actions" className="flex items-center gap-2" />
            <Tour tour={SPRINTS_TOUR} />
          </div>
          <div data-tour="module-tabs" className="flex items-center gap-1 border-b border-slate-200 mt-3">
            <button onClick={() => setTab('overview')} className={tabClass(tab === 'overview')}>
              <Package className="w-4 h-4" /> Overview
            </button>
            <button onClick={() => setTab('sprints')} className={tabClass(tab === 'sprints')}>
              <Zap className="w-4 h-4" /> Sprint Board
            </button>
          </div>
        </div>
        {tab === 'overview' ? (
          <DeliverySummary
            portfolios={portfolios}
            onNavigateToSprints={() => setTab('sprints')}
            onOpenSprint={(s) => { setFocusSprint(s); setFocusSprintId(s?.id || null); setTab('sprints'); }}
          />
        ) : (
          <SprintView
            projects={boardProjects}
            programs={programs}
            portfolios={portfolios}
            resources={resources}
            initialProjectId={focusProjectId}
            focusSprintId={focusSprint?.id || focusSprintId}
            actionsSlot={actionsSlot}
          />
        )}
      </div>
    </div>
  );
}
