import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { raidApi, mapRiskFromApi, mapRiskInputToPayload, mapRiskListFromApi } from '@/api/raid';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import RiskIssueSheet from '@/components/projects/RiskIssueSheet';
import RiskIssueDetail from '@/components/projects/RiskIssueDetail';
import SimpleRaidSheet from '@/components/projects/SimpleRaidSheet';
import { AlertTriangle, AlertCircle, Loader2, BookOpen, Link2, LayoutDashboard } from 'lucide-react';
import RaidOverview from '@/components/projects/RaidOverview';

export default function RiskLog() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();

  const { data: resources = [] } = useQuery({
    queryKey: ['project_resources'],
    queryFn: () => base44.entities.ProjectResource.list()
  });
  const {
    data: risks = [],
    isLoading: loadingRisks,
    isError: isRiskError,
    error: riskError,
    refetch: refetchRisks,
  } = useQuery({
    queryKey: ['account-risks', selectedAccountId],
    queryFn: async () => mapRiskListFromApi(await raidApi.listAccountRisks(selectedAccountId)),
    enabled: !!selectedAccountId,
  });
  const { data: issues = [], isLoading: loadingIssues } = useQuery({
    queryKey: ['issues'],
    queryFn: () => base44.entities.Issue.list('-created_date')
  });
  const { data: assumptions = [], isLoading: loadingAssumptions } = useQuery({ queryKey: ['assumptions'], queryFn: () => base44.entities.Assumption.list('-created_date') });
  const { data: dependencies = [], isLoading: loadingDependencies } = useQuery({ queryKey: ['dependencies'], queryFn: () => base44.entities.Dependency.list('-created_date') });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });
  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: () => base44.entities.Portfolio.list() });

  const riskDetailId = activeTab === 'risks' && detailOpen ? selectedItem?.id : null;
  const { data: selectedRiskDetail } = useQuery({
    queryKey: ['risk-detail', riskDetailId],
    queryFn: async () => mapRiskFromApi(await raidApi.getRisk(riskDetailId)),
    enabled: !!riskDetailId,
  });

  const invalidateRiskQueries = (projectId) => {
    queryClient.invalidateQueries({ queryKey: ['account-risks', selectedAccountId] });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] });
    }
  };

  const createRisk = useMutation({
    mutationFn: async (data) => {
      if (!data?.project_id) throw new Error('Select a project before creating a risk.');
      const payload = mapRiskInputToPayload(data);
      return mapRiskFromApi(await raidApi.createRisk(data.project_id, payload));
    },
    onSuccess: (createdRisk, variables) => invalidateRiskQueries(createdRisk.project_id || variables.project_id),
  });
  const updateRisk = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = mapRiskInputToPayload(data);
      if (Object.keys(payload).length === 0) return selectedItem;
      return mapRiskFromApi(await raidApi.updateRisk(id, payload));
    },
    onSuccess: (updatedRisk, variables) => {
      const projectId = updatedRisk?.project_id || selectedItem?.project_id || variables?.data?.project_id;
      invalidateRiskQueries(projectId);
      queryClient.invalidateQueries({ queryKey: ['risk-detail', variables.id] });
      if (updatedRisk?.id) setSelectedItem(updatedRisk);
    },
  });

  const createIssue = useMutation({
    mutationFn: (data) => base44.entities.Issue.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues'] })
  });
  const updateIssue = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Issue.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues'] })
  });
  const deleteIssue = useMutation({
    mutationFn: (id) => base44.entities.Issue.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues'] })
  });

  const handleItemClick = (item) => { setSelectedItem(item); setDetailOpen(true); };

  const isRaidSheet = activeTab === 'risks' || activeTab === 'issues';
  const tabType = activeTab === 'risks' ? 'risk' : 'issue';
  const raidItems = activeTab === 'risks' ? risks : issues;

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelectedItem(null);
    setDetailOpen(false);
  };

  const riskDetailItem = activeTab === 'risks' ? (selectedRiskDetail || selectedItem) : selectedItem;
  const showRiskState = activeTab === 'overview' || activeTab === 'risks';

  const RiskState = ({ title, message, action }) => (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#c87b14]" />
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        {action}
      </div>
    </div>
  );

  if ((showRiskState && loadingRisks) || loadingIssues || loadingAssumptions || loadingDependencies) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const renderRiskState = () => {
    if (!showRiskState) return null;
    if (!selectedAccountId) {
      return <RiskState title="No account selected" message="Select an account to load risks." />;
    }
    if (isRiskError) {
      return (
        <RiskState
          title="Unable to load risks"
          message={riskError?.message || 'The risk log could not be loaded.'}
          action={(
            <button type="button" onClick={() => refetchRisks()} className="mt-4 rounded-md bg-[#c87b14] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#a86610]">
              Retry
            </button>
          )}
        />
      );
    }
    return null;
  };

  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}}
        onNewPortfolio={() => {}} onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center">
          <h1 className="text-lg font-semibold text-slate-800">RAID Log</h1>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b-2 border-slate-200 bg-white px-0">
          <button onClick={() => switchTab('overview')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', activeTab === 'overview' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <LayoutDashboard className="w-4 h-4" /> Overview
          </button>
          <button onClick={() => switchTab('risks')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', activeTab === 'risks' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <AlertTriangle className="w-4 h-4" /> Risks
          </button>
          <button onClick={() => switchTab('assumptions')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', activeTab === 'assumptions' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <BookOpen className="w-4 h-4" /> Assumptions
          </button>
          <button onClick={() => switchTab('issues')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', activeTab === 'issues' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <AlertCircle className="w-4 h-4" /> Issues
          </button>
          <button onClick={() => switchTab('dependencies')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', activeTab === 'dependencies' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Link2 className="w-4 h-4" /> Dependencies
          </button>
        </div>
        {renderRiskState() || (activeTab === 'overview' ? (
          risks.length === 0 ? (
            <RiskState title="No risks found" message="No risks have been created for this account yet." />
          ) : (
            <RaidOverview
              risks={risks}
              issues={issues}
              assumptions={assumptions}
              dependencies={dependencies}
              projects={projects}
              programs={programs}
              portfolios={portfolios}
            />
          )
        ) : isRaidSheet ? (
          <RiskIssueSheet
            items={raidItems}
            projects={projects}
            programs={programs}
            portfolios={portfolios}
            type={tabType}
            onItemClick={handleItemClick}
            resources={resources}
            onAddItem={(data) => (activeTab === 'risks' ? createRisk : createIssue).mutate(data)}
            onUpdateItem={(id, data) => (activeTab === 'risks' ? updateRisk : updateIssue).mutate({ id, data })}
            onDeleteItem={activeTab === 'risks' ? undefined : (id) => deleteIssue.mutate(id)}
          />
        ) : activeTab === 'assumptions' ? (
          <SimpleRaidSheet
            entityType="Assumption"
            queryKey={['assumptions']}
            idPrefix="AL"
            idField="assumption_id"
            idStart={1}
            noun="Assumption"
            descriptionLabel="Assumption Description"
            storageKey="assumption_log_views"
            projects={projects}
            programs={programs}
            portfolios={portfolios}
            resources={resources}
          />
        ) : (
          <SimpleRaidSheet
            entityType="Dependency"
            queryKey={['dependencies']}
            idPrefix="DY"
            idField="dependency_id"
            idStart={101}
            noun="Dependency"
            descriptionLabel="Description"
            storageKey="dependency_log_views"
            projects={projects}
            programs={programs}
            portfolios={portfolios}
            resources={resources}
            statuses={[
              { value: 'closed', label: 'Closed', className: 'bg-slate-100 text-slate-600' },
              { value: 'open', label: 'Open', className: 'bg-blue-100 text-blue-700' },
              { value: 'in_review', label: 'In Review', className: 'bg-yellow-100 text-yellow-700' },
              { value: 'escalated', label: 'Escalated', className: 'bg-red-100 text-red-700' },
            ]}
            showImpactDelay
            showFallbackPlan
            showAssignedTo
          />
        ))}
      </div>
      {isRaidSheet && (
        <RiskIssueDetail
          open={detailOpen}
          onOpenChange={setDetailOpen}
          item={riskDetailItem}
          type={tabType}
          projects={projects}
          resources={resources}
          onUpdate={(id, data) => (activeTab === 'risks' ? updateRisk : updateIssue).mutate({ id, data })}
          onDelete={activeTab === 'risks' ? undefined : (id) => { deleteIssue.mutate(id); setDetailOpen(false); }}
        />
      )}
    </div>
  );
}