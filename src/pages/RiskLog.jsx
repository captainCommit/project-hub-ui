import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { raidApi, mapRiskFromApi, mapRiskInputToPayload, mapRiskListFromApi, mapIssueFromApi, mapIssueInputToPayload, mapIssueListFromApi } from '@/api/raid';
import { raidEntityAdapters } from '@/api/raidEntities';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import RiskIssueSheet from '@/components/projects/RiskIssueSheet';
import RiskIssueDetail from '@/components/projects/RiskIssueDetail';
import SimpleRaidSheet from '@/components/projects/SimpleRaidSheet';
import { AlertTriangle, AlertCircle, Loader2, BookOpen, Link2, LayoutDashboard } from 'lucide-react';
import RaidOverview from '@/components/projects/RaidOverview';
import { EMPTY_RAID_FILTERS } from '@/components/projects/RaidTable';
import { useAccountHierarchy, useAccountResources } from '@/hooks/useAccountLookups';
import { useMyAccess } from '@/hooks/useMyAccess';

const RAID_TABS = [
  { key: 'risks', label: 'Risks', icon: AlertTriangle, module: 'RISKS' },
  { key: 'assumptions', label: 'Assumptions', icon: BookOpen, module: 'ASSUMPTIONS' },
  { key: 'issues', label: 'Issues', icon: AlertCircle, module: 'ISSUES' },
  { key: 'dependencies', label: 'Dependencies', icon: Link2, module: 'DEPENDENCIES' },
];

export default function RiskLog() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // ?tab=risks|issues|assumptions|dependencies opens that tab (links from the Home page use it).
  const [activeTab, setActiveTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return RAID_TABS.some(t => t.key === requested) ? requested : 'overview';
  });
  // Tabs for modules this person can't see in any project are left out.
  const { canViewAnywhere } = useMyAccess();
  // One set of filters for every tab, so choosing a project on one tab carries over to the others.
  const [raidFilters, setRaidFilters] = useState(EMPTY_RAID_FILTERS);
  // Each tab puts its Export and New buttons on the tab row, in this element.
  const [actionsSlot, setActionsSlot] = useState(/** @type {HTMLDivElement | null} */ (null));
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();

  const resources = useAccountResources();
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
    queryKey: ['account-issues', selectedAccountId],
    queryFn: async () => mapIssueListFromApi(await raidApi.listAccountIssues(selectedAccountId)),
    enabled: !!selectedAccountId,
  });
  const { data: assumptions = [], isLoading: loadingAssumptions } = useQuery({
    queryKey: ['assumptions', selectedAccountId],
    queryFn: () => raidEntityAdapters.Assumption.list(selectedAccountId),
    enabled: !!selectedAccountId,
  });
  const { data: dependencies = [], isLoading: loadingDependencies } = useQuery({
    queryKey: ['dependencies', selectedAccountId],
    queryFn: () => raidEntityAdapters.Dependency.list(selectedAccountId),
    enabled: !!selectedAccountId,
  });
  const { projects, programs, portfolios } = useAccountHierarchy();

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

  const deleteRisk = useMutation({
    mutationFn: (id) => raidApi.deleteRisk(id),
    onSuccess: () => invalidateRiskQueries(selectedItem?.project_id),
  });

  const invalidateIssueQueries = () => queryClient.invalidateQueries({ queryKey: ['account-issues', selectedAccountId] });
  const createIssue = useMutation({
    mutationFn: async (data) => {
      if (!data?.project_id) throw new Error('Select a project before creating an issue.');
      return mapIssueFromApi(await raidApi.createIssue(data.project_id, mapIssueInputToPayload(data)));
    },
    onSuccess: invalidateIssueQueries,
  });
  const updateIssue = useMutation({
    mutationFn: async ({ id, data }) => mapIssueFromApi(await raidApi.updateIssue(id, mapIssueInputToPayload(data))),
    onSuccess: (updatedIssue) => {
      invalidateIssueQueries();
      if (updatedIssue?.id && selectedItem?.id === updatedIssue.id) setSelectedItem(updatedIssue);
    },
  });
  const deleteIssue = useMutation({
    mutationFn: (id) => raidApi.deleteIssue(id),
    onSuccess: invalidateIssueQueries,
  });

  const handleItemClick = (item) => { setSelectedItem(item); setDetailOpen(true); };

  // ?id= opens that risk or issue once the list has loaded (links from the Home search use it).
  const requestedId = useRef(new URLSearchParams(window.location.search).get('id'));
  useEffect(() => {
    if (!requestedId.current || (activeTab !== 'risks' && activeTab !== 'issues')) return;
    const item = (activeTab === 'risks' ? risks : issues).find(i => i.id === requestedId.current);
    if (!item) return;
    requestedId.current = null;
    handleItemClick(item);
  }, [activeTab, risks, issues]);

  const isRaidSheet = activeTab === 'risks' || activeTab === 'issues';
  const tabType = activeTab === 'risks' ? 'risk' : 'issue';
  const raidItems = activeTab === 'risks' ? risks : issues;

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelectedItem(null);
    setDetailOpen(false);
    // Statuses differ between the logs; the rest of the filters carry over.
    setRaidFilters(f => ({ ...f, status: '' }));
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
        <div className="bg-white px-6 pt-5">
          <h1 className="text-2xl font-bold text-[#002046]">RAID</h1>
          <p className="text-sm text-slate-500 mt-1">Manage risks, assumptions, issues, and dependencies across delivery.</p>
          {/* Tabs, with the open tab's Export and New buttons on the right */}
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 mt-3">
            <div className="flex items-center gap-1">
              <button onClick={() => switchTab('overview')} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', activeTab === 'overview' ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
                <LayoutDashboard className="w-4 h-4" /> Overview
              </button>
              {RAID_TABS.filter((t) => canViewAnywhere(t.module)).map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => switchTab(key)} className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', activeTab === key ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
            <div ref={setActionsSlot} className="flex items-center gap-2 pb-2" />
          </div>
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
              filters={raidFilters}
              onFiltersChange={setRaidFilters}
            />
          )
        ) : isRaidSheet ? (
          <RiskIssueSheet
            items={raidItems}
            projects={projects}
            programs={programs}
            type={tabType}
            filters={raidFilters}
            onFiltersChange={setRaidFilters}
            actionsSlot={actionsSlot}
            onItemClick={handleItemClick}
            resources={resources}
            onAddItem={(data) => (activeTab === 'risks' ? createRisk : createIssue).mutate(data)}
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
            projects={projects}
            programs={programs}
            resources={resources}
            showPriority={false}
            personLabel="Owner"
            dateLabel="Review Date"
            filters={raidFilters}
            onFiltersChange={setRaidFilters}
            actionsSlot={actionsSlot}
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
            projects={projects}
            programs={programs}
            resources={resources}
            filters={raidFilters}
            onFiltersChange={setRaidFilters}
            actionsSlot={actionsSlot}
            statuses={[
              { value: 'closed', label: 'Closed', className: 'bg-slate-100 text-slate-600' },
              { value: 'open', label: 'Open', className: 'bg-blue-100 text-blue-700' },
              { value: 'in_review', label: 'In Review', className: 'bg-yellow-100 text-yellow-700' },
              { value: 'escalated', label: 'Escalated', className: 'bg-red-100 text-red-700' },
            ]}
            showImpactDelay
            showFallbackPlan
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
          onDelete={(id) => { (activeTab === 'risks' ? deleteRisk : deleteIssue).mutate(id); setDetailOpen(false); }}
        />
      )}
    </div>
  );
}