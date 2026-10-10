import React from 'react';
import { Settings } from 'lucide-react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import SettingsContent from '@/components/projects/SettingsContent';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';

export default function AppSettings() {
  const { projects, programs, portfolios } = useAccountHierarchy();

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