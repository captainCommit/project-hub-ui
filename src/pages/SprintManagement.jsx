import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import SprintView from '@/components/projects/SprintView';
import { Package, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SprintManagement() {
  const [tab, setTab] = useState('overview');
  const [focusSprint, setFocusSprint] = useState(null);
  const [focusSprintId, setFocusSprintId] = useState(null);
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });
  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: () => base44.entities.Portfolio.list() });
  const { data: resources = [] } = useQuery({ queryKey: ['project_resources'], queryFn: () => base44.entities.ProjectResource.list() });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('focusSprint');
    if (id) {
      setFocusSprintId(id);
      setTab('sprints');
    }
  }, []);

  const sprintProps = { projects, programs, portfolios, resources };

  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-1 border-b-2 border-slate-200 bg-white px-6">
          <button onClick={() => setTab('overview')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'overview' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Package className="w-4 h-4" /> Overview
          </button>
          <button onClick={() => setTab('sprints')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', tab === 'sprints' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Zap className="w-4 h-4" /> Sprints
          </button>
        </div>
        {tab === 'overview' ? (
          <SprintView key="overview" {...sprintProps} initialTab="overview" hideTabs onOpenSprint={(s) => { setFocusSprint(s); setFocusSprintId(s?.id || null); setTab('sprints'); }} />
        ) : (
          <SprintView key="sprints" {...sprintProps} initialTab="sprints" hideTabs initialProjectId={focusSprint?.project_id} focusSprintId={focusSprint?.id || focusSprintId} />
        )}
      </div>
    </div>
  );
}