import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Settings } from 'lucide-react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import SettingsContent from '@/components/projects/SettingsContent';

export default function AppSettings() {
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });
  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: () => base44.entities.Portfolio.list() });

  return (
    <div className="flex h-screen bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">App Settings</h1>
              <p className="text-xs text-slate-400 mt-0.5">Configure display preferences for this app</p>
            </div>
          </div>
          <SettingsContent />
        </div>
      </div>
    </div>
  );
}