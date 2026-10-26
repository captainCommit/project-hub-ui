import React from 'react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import TestCaseView from '@/components/projects/TestCaseView';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import Tour from '@/components/tour/Tour';
import { TESTING_TOUR } from './Testing.tour';

export default function Testing() {
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
        <Tour tour={TESTING_TOUR} />
        <TestCaseView />
      </div>
    </div>
  );
}