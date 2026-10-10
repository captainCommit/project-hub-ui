import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { raidApi, mapIssueFromApi, mapIssueInputToPayload, mapIssueListFromApi } from '@/api/raid';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import RiskIssueSheet from '@/components/projects/RiskIssueSheet';
import RiskIssueDetail from '@/components/projects/RiskIssueDetail';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAccountHierarchy, useAccountResources } from '@/hooks/useAccountLookups';

export default function IssueLog() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();

  const resources = useAccountResources();
  const {
    data: issues = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['account-issues', selectedAccountId],
    queryFn: async () => mapIssueListFromApi(await raidApi.listAccountIssues(selectedAccountId)),
    enabled: !!selectedAccountId,
  });
  const { projects, programs, portfolios } = useAccountHierarchy();

  const issueDetailId = detailOpen ? selectedItem?.id : null;
  const { data: selectedIssueDetail } = useQuery({
    queryKey: ['issue-detail', issueDetailId],
    queryFn: async () => mapIssueFromApi(await raidApi.getIssue(issueDetailId)),
    enabled: !!issueDetailId,
  });

  const invalidateIssueQueries = (projectId) => {
    queryClient.invalidateQueries({ queryKey: ['account-issues', selectedAccountId] });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] });
    }
  };

  const createIssue = useMutation({
    mutationFn: async (data) => {
      if (!data?.project_id) throw new Error('Select a project before creating an issue.');
      const payload = mapIssueInputToPayload(data);
      return mapIssueFromApi(await raidApi.createIssue(data.project_id, payload));
    },
    onSuccess: (createdIssue, variables) => invalidateIssueQueries(createdIssue.project_id || variables.project_id),
  });
  const updateIssue = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = mapIssueInputToPayload(data);
      if (Object.keys(payload).length === 0) return selectedItem;
      return mapIssueFromApi(await raidApi.updateIssue(id, payload));
    },
    onSuccess: (updatedIssue, variables) => {
      const projectId = updatedIssue?.project_id || selectedItem?.project_id || variables?.data?.project_id;
      invalidateIssueQueries(projectId);
      queryClient.invalidateQueries({ queryKey: ['issue-detail', variables.id] });
      if (updatedIssue?.id) setSelectedItem(updatedIssue);
    },
  });
  const deleteIssue = useMutation({
    mutationFn: (id) => raidApi.deleteIssue(id),
    onSuccess: () => invalidateIssueQueries(selectedItem?.project_id),
  });

  const handleItemClick = (item) => { setSelectedItem(item); setDetailOpen(true); };

  const issueDetailItem = selectedIssueDetail || selectedItem;

  const IssueState = ({ title, message, action }) => (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        {action}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const renderIssueState = () => {
    if (!selectedAccountId) {
      return <IssueState title="No account selected" message="Select an account to load issues." />;
    }
    if (isError) {
      return (
        <IssueState
          title="Unable to load issues"
          message={error?.message || 'The issue log could not be loaded.'}
          action={(
            <button type="button" onClick={() => refetch()} className="mt-4 rounded-md bg-[#c87b14] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#a86610]">
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
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Issue Log</h1>
            <p className="text-xs text-slate-500">{issues.length} issue{issues.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {renderIssueState() || (
          <RiskIssueSheet
            items={issues}
            projects={projects}
            programs={programs}
            portfolios={portfolios}
            type="issue"
            onItemClick={handleItemClick}
            resources={resources}
            onAddItem={(data) => createIssue.mutate(data)}
            onUpdateItem={(id, data) => updateIssue.mutate({ id, data })}
            onDeleteItem={(id) => deleteIssue.mutate(id)}
          />
        )}
      </div>
      <RiskIssueDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={issueDetailItem}
        type="issue"
        projects={projects}
        resources={resources}
        onUpdate={(id, data) => updateIssue.mutate({ id, data })}
        onDelete={(id) => { deleteIssue.mutate(id); setDetailOpen(false); }}
      />
    </div>
  );
}