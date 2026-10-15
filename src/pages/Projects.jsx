// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { portfoliosApi } from '@/api/portfolios';
import { programsApi } from '@/api/programs';
import { projectsApi } from '@/api/projects';
import { activityApi } from '@/api/activity';
import { resourcesApi } from '@/api/resources';
import { tasksApi, mapTaskFormToPayload, mapTaskTreeToSheetRows, mapTaskSheetInputToCreatePayload, mapTaskSheetInputToTitleUpdatePayload, mapTaskSheetInputToDurationUpdatePayload, mapTaskSheetInputToProgressUpdatePayload, mapTaskSheetInputToStatusUpdatePayload, mapTaskGanttDateUpdatePayload, mapProjectBoardToKanban, mapTaskBoardPositionToPayload, mapProjectGanttToGanttTasks, mapAccountOptionsToTaskStatusOptions, mapAccountOptionsToTaskTypeOptions, mapAccountOptionsToTaskPriorityOptions } from '@/api/tasks';
import { useAuth } from '@/lib/AuthContext';
import { recordRecentProject } from '@/lib/userPrefs';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import GanttChart from '@/components/projects/GanttChart';
import TaskSheet from '@/components/projects/TaskSheet';
import KanbanBoard from '@/components/projects/KanbanBoard';
import TaskDetailPanel from '@/components/projects/TaskDetailPanel';
import ProjectDialog from '@/components/projects/ProjectDialog';
import ViewToggle from '@/components/projects/ViewToggle';
import ResourceCalendar from '@/components/projects/ResourceCalendar';
import AuditView from '@/components/projects/AuditView';
import { Loader2, Users, Settings, Edit2, FileUp, ChevronDown, Minimize2 } from 'lucide-react';
import ExportMenu from '@/components/projects/ExportMenu';
import TaskCsvImport from '@/components/projects/TaskCsvImport';
import ShareDialog from '@/components/projects/ShareDialog';
import { useMyAccess } from '@/hooks/useMyAccess';
import { Button } from '@/components/ui/button';
import { toast, toastError } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import ProjectsSummary from '@/components/projects/ProjectsSummary';
import RAIDSummary from '@/components/projects/RAIDSummary';
import TemplatesView from '@/components/projects/TemplatesView';
import SprintView from '@/components/projects/SprintView';
import TestCaseView from '@/components/projects/TestCaseView';
import DeliverySummary from '@/components/projects/DeliverySummary';
import PortfolioDetailView from '@/components/projects/PortfolioDetailView';
import ProgramDetailView from '@/components/projects/ProgramDetailView';
import PortfolioLanding from '@/components/projects/PortfolioLanding';
import StarButton from '@/components/projects/StarButton';
import ReportGenerator from '@/components/projects/ReportGenerator';
import ProgramsLanding from '@/components/projects/ProgramsLanding';
import AIAssistantWidget from '@/components/projects/AIAssistantWidget';
import { mapIssueListFromApi, mapRiskListFromApi, raidApi } from '@/api/raid';
import { raidEntityAdapters } from '@/api/raidEntities';
import { mapTaskToUserStory } from '@/api/accountData';
import { invalidateHierarchy, useAccountChangeRequests, useAccountDecisions, useAccountHierarchy, useAccountResources, useAccountSprints, useAccountTasks, useAccountVacations } from '@/hooks/useAccountLookups';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROJECT_TABS = ['sheet', 'board', 'gantt', 'audit'];
const DIRECTORY_VIEWS = ['all_portfolios', 'all_programs', 'all_projects', 'all_raid', 'templates', 'all_resource_mgmt', 'delivery', 'sprints', 'test_cases'];

function ProjectSheetState({ title, message, onRetry, isLoading = false }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-center p-8">
      <div className="max-w-md">
        {isLoading && <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />}
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} className="mt-4" style={{ backgroundColor: '#002046' }}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

function ProjectBoardState({ title, message, onRetry, isLoading = false }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-center p-8">
      <div className="max-w-md">
        {isLoading && <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />}
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} className="mt-4" style={{ backgroundColor: '#002046' }}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

function ProjectGanttState({ title, message, onRetry, isLoading = false }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-center p-8">
      <div className="max-w-md">
        {isLoading && <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />}
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} className="mt-4" style={{ backgroundColor: '#002046' }}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

function ProjectAuditState({ title, message, onRetry, isLoading = false }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-center p-8">
      <div className="max-w-md">
        {isLoading && <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />}
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} className="mt-4" style={{ backgroundColor: '#002046' }}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

function PortfolioState({ title, message, onRetry }) {
  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{message}</p>
          {onRetry && (
            <Button onClick={onRetry} className="mt-4" style={{ backgroundColor: '#002046' }}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function moveBoardCard(board, taskId, nextStatus, nextSortOrder = 0) {
  const movingTask = board.tasks.find(task => task.id === taskId);
  if (!movingTask) return board;

  const remainingTasks = board.tasks.filter(task => task.id !== taskId);
  const targetTasks = remainingTasks.filter(task => task.status === nextStatus);
  const boundedSortOrder = Math.max(0, Math.min(nextSortOrder, targetTasks.length));
  const movedTask = { ...movingTask, status: nextStatus, status_id: nextStatus, sort_order: boundedSortOrder };
  const tasks = [];

  board.columns.forEach(column => {
    if (column.id !== nextStatus) {
      tasks.push(...remainingTasks.filter(task => task.status === column.id));
      return;
    }

    const before = targetTasks.slice(0, boundedSortOrder);
    const after = targetTasks.slice(boundedSortOrder);
    tasks.push(...before, movedTask, ...after);
  });

  return { ...board, tasks };
}

function reorderTaskTreeSiblings(taskTree, parentTaskId, orderedTaskIds) {
  if (!Array.isArray(taskTree)) return taskTree;

  const normalizedParentId = parentTaskId || null;
  const reorderSiblings = (siblings) => {
    if (!Array.isArray(siblings)) return siblings;
    const byId = new Map(siblings.map(task => [task.id, task]));
    const ordered = orderedTaskIds.map(id => byId.get(id)).filter(Boolean);
    const remaining = siblings.filter(task => !orderedTaskIds.includes(task.id));

    return [...ordered, ...remaining].map((task, index) => ({
      ...task,
      sort_order: index,
    }));
  };

  if (!normalizedParentId) {
    return reorderSiblings(taskTree);
  }

  const visit = (tasks) => tasks.map(task => {
    if (task.id === normalizedParentId) {
      return {
        ...task,
        children: reorderSiblings(task.children || []),
      };
    }

    if (Array.isArray(task.children) && task.children.length > 0) {
      return {
        ...task,
        children: visit(task.children),
      };
    }

    return task;
  });

  return visit(taskTree);
}

function updateProjectGanttCacheTaskDates(cache, taskId, dates) {
  if (!cache || !taskId) return cache;

  const updateTask = (task) => {
    if (!task || typeof task !== 'object') return task;

    const nextTask = {
      ...task,
      ...(task.id === taskId ? {
        start_date: dates.start_date,
        finish_date: dates.finish_date,
      } : {}),
    };

    if (Array.isArray(task.children)) {
      nextTask.children = task.children.map(updateTask);
    }

    return nextTask;
  };

  const updateTaskArray = (tasks) => tasks.map(updateTask);

  if (Array.isArray(cache)) return updateTaskArray(cache);
  if (typeof cache !== 'object') return cache;

  const nextCache = { ...cache };
  if (Array.isArray(cache.tasks)) nextCache.tasks = updateTaskArray(cache.tasks);
  if (Array.isArray(cache.items)) nextCache.items = updateTaskArray(cache.items);
  if (Array.isArray(cache.data)) nextCache.data = updateTaskArray(cache.data);

  return updateTask(nextCache);
}

export default function Projects() {
  const { selectedAccountId, user } = useAuth();
  const { portfolioId, programId, projectId, projectTab } = useParams();
  const { canEdit, canView } = useMyAccess();
  // Without the Tasks module, the sheet, board and Gantt are read-only: they get no edit handlers.
  const canEditProjectTasks = Boolean(projectId) && canEdit(projectId, 'TASKS');
  // Someone whose access hides Tasks gets a notice instead of the sheet, board and Gantt.
  const canSeeProjectTasks = !projectId || canView(projectId, 'TASKS');
  const whenTasksEditable = (handler) => (canEditProjectTasks ? handler : undefined);
  const navigate = useNavigate();
  const location = useLocation();
  const hasPortfolioRoute = Boolean(portfolioId);
  const hasProgramRoute = Boolean(programId);
  const hasProjectRoute = Boolean(projectId);
  const hasValidPortfolioRoute = !portfolioId || UUID_RE.test(portfolioId);
  const hasValidProgramRoute = !programId || UUID_RE.test(programId);
  const hasValidProjectRoute = !projectId || UUID_RE.test(projectId);
  const activeProjectTab = PROJECT_TABS.includes(projectTab) ? projectTab : 'sheet';
  const _defaultLanding = localStorage.getItem('app_landing_page') || 'all_portfolios';
  const [selectedType, setSelectedType] = useState(_defaultLanding);
  const [selectedItem, setSelectedItem] = useState(_defaultLanding === 'sprints' ? { id: 'sprints', name: 'Sprints' } : null);
  const [taskImportOpen, setTaskImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState(_defaultLanding);
  const [expandedTasks, setExpandedTasks] = useState([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [dialogType, setDialogType] = useState('project');
  const [vacationCalendarOpen, setVacationCalendarOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState(null);
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  const [sheetFocusModeOn, setSheetFocusModeOn] = useState(false);
  const [optimisticProjectBoard, setOptimisticProjectBoard] = useState(null);
  const [projectSheetPriorityDrafts, setProjectSheetPriorityDrafts] = useState({});
  const [projectSheetPriorityErrors, setProjectSheetPriorityErrors] = useState({});
  const [pendingProjectSheetPriorityTaskIds, setPendingProjectSheetPriorityTaskIds] = useState({});
  const [pendingProjectSheetHierarchyTaskIds, setPendingProjectSheetHierarchyTaskIds] = useState({});
  const [pendingProjectSheetPredecessorTaskIds, setPendingProjectSheetPredecessorTaskIds] = useState({});
  const [pendingProjectGanttScheduleTaskIds, setPendingProjectGanttScheduleTaskIds] = useState({});
  const [pendingProjectGanttDependencyTaskIds, setPendingProjectGanttDependencyTaskIds] = useState({});
  const [deletingProjectSheetTaskIds, setDeletingProjectSheetTaskIds] = useState({});
  const [isReorderingProjectSheetTasks, setIsReorderingProjectSheetTasks] = useState(false);
  const pendingProjectSheetPriorityRequests = useRef(new Set());
  const pendingProjectSheetHierarchyRequests = useRef(new Set());
  const pendingProjectSheetPredecessorRequests = useRef(new Set());
  const pendingProjectGanttScheduleTaskRequests = useRef(new Set());
  const pendingProjectGanttScheduleRequests = useRef(new Set());
  const pendingProjectGanttDependencyRequests = useRef(new Set());
  const deletingProjectSheetTaskRequests = useRef(new Set());
  const pendingProjectSheetReorderRequest = useRef(null);

  const queryClient = useQueryClient();

  const {
    data: accountPortfolios = [],
    isLoading: loadingAccountPortfolios,
    isError: accountPortfoliosError,
    refetch: refetchAccountPortfolios,
  } = useQuery({
    queryKey: ['account-portfolios', selectedAccountId],
    queryFn: () => portfoliosApi.list(selectedAccountId),
    enabled: !!selectedAccountId,
  });

  const {
    data: routePortfolio,
    isLoading: loadingRoutePortfolio,
    isError: routePortfolioError,
    refetch: refetchRoutePortfolio,
  } = useQuery({
    queryKey: ['portfolio-detail', portfolioId],
    queryFn: () => portfoliosApi.get(portfolioId),
    enabled: !!portfolioId && hasValidPortfolioRoute,
  });

  const {
    data: routePortfolioOverview,
    isLoading: loadingRoutePortfolioOverview,
    isError: routePortfolioOverviewError,
    refetch: refetchRoutePortfolioOverview,
  } = useQuery({
    queryKey: ['portfolio-overview', portfolioId],
    queryFn: () => portfoliosApi.getOverview(portfolioId),
    enabled: !!portfolioId && hasValidPortfolioRoute,
  });

  const {
    data: routePortfolioPrograms = [],
    isLoading: loadingRoutePortfolioPrograms,
    isError: routePortfolioProgramsError,
    refetch: refetchRoutePortfolioPrograms,
  } = useQuery({
    queryKey: ['portfolio-programs', portfolioId],
    queryFn: () => portfoliosApi.listPrograms(portfolioId),
    enabled: !!portfolioId && hasValidPortfolioRoute,
  });

  const {
    data: accountProgramsProjects = { portfolios: [], programs: [], projects: [] },
    isLoading: loadingAccountProgramsProjects,
    isError: accountProgramsProjectsError,
    refetch: refetchAccountProgramsProjects,
  } = useQuery({
    queryKey: ['account-programs-projects', selectedAccountId],
    queryFn: () => programsApi.getAccountProgramsProjects(selectedAccountId),
    enabled: !!selectedAccountId && !hasPortfolioRoute,
  });

  const {
    data: routeProgram,
    isLoading: loadingRouteProgram,
    isError: routeProgramError,
    refetch: refetchRouteProgram,
  } = useQuery({
    queryKey: ['program-detail', programId],
    queryFn: () => programsApi.get(programId),
    enabled: !!programId && hasValidProgramRoute,
  });

  const {
    data: routeProgramOverview,
    isLoading: loadingRouteProgramOverview,
    isError: routeProgramOverviewError,
    refetch: refetchRouteProgramOverview,
  } = useQuery({
    queryKey: ['program-overview', programId],
    queryFn: () => programsApi.getOverview(programId),
    enabled: !!programId && hasValidProgramRoute,
  });

  const {
    data: routeProgramProjects = [],
    isLoading: loadingRouteProgramProjects,
    isError: routeProgramProjectsError,
    refetch: refetchRouteProgramProjects,
  } = useQuery({
    queryKey: ['program-projects', programId],
    queryFn: () => programsApi.getProjects(programId),
    enabled: !!programId && hasValidProgramRoute,
  });

  const {
    data: routeProject,
    isLoading: loadingRouteProject,
    isError: routeProjectError,
    refetch: refetchRouteProject,
  } = useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId && hasValidProjectRoute,
  });

  const {
    data: routeProjectOverview,
    isLoading: loadingRouteProjectOverview,
    isError: routeProjectOverviewError,
    refetch: refetchRouteProjectOverview,
  } = useQuery({
    queryKey: ['project-overview', projectId],
    queryFn: () => projectsApi.getOverview(projectId),
    enabled: !!projectId && hasValidProjectRoute,
  });

  const isProjectSheetRoute = hasProjectRoute && hasValidProjectRoute && activeProjectTab === 'sheet';
  const isProjectBoardRoute = hasProjectRoute && hasValidProjectRoute && activeProjectTab === 'board';
  const isProjectGanttRoute = hasProjectRoute && hasValidProjectRoute && activeProjectTab === 'gantt';
  const isProjectAuditRoute = hasProjectRoute && hasValidProjectRoute && activeProjectTab === 'audit';

  const projectTaskTreeQuery = useQuery({
    queryKey: ['project-task-tree', projectId],
    queryFn: () => tasksApi.getTree(projectId),
    enabled: !!projectId && isProjectSheetRoute,
  });

  const projectSheetAccountOptionsQuery = useQuery({
    queryKey: ['account-options', selectedAccountId],
    queryFn: () => tasksApi.getAccountOptions(selectedAccountId),
    enabled: !!selectedAccountId && isProjectSheetRoute,
  });

  const projectSheetAccountResourcesQuery = useQuery({
    queryKey: ['account-resources', selectedAccountId],
    queryFn: () => resourcesApi.listAccountResources(selectedAccountId),
    enabled: !!selectedAccountId && isProjectSheetRoute,
  });

  const projectSheetTaskStatusOptions = useMemo(
    () => mapAccountOptionsToTaskStatusOptions(projectSheetAccountOptionsQuery.data),
    [projectSheetAccountOptionsQuery.data]
  );

  const projectSheetTaskTypeOptions = useMemo(
    () => mapAccountOptionsToTaskTypeOptions(projectSheetAccountOptionsQuery.data),
    [projectSheetAccountOptionsQuery.data]
  );

  const projectSheetTaskPriorityOptions = useMemo(
    () => mapAccountOptionsToTaskPriorityOptions(projectSheetAccountOptionsQuery.data),
    [projectSheetAccountOptionsQuery.data]
  );

  const projectTaskTreeRows = useMemo(
    () => mapTaskTreeToSheetRows(projectTaskTreeQuery.data),
    [projectTaskTreeQuery.data]
  );

  const projectSheetTasks = projectTaskTreeRows;
  const isProjectSheetLoading = projectTaskTreeQuery.isLoading;
  const isProjectSheetError = projectTaskTreeQuery.isError;
  const retryProjectSheet = () => {
    projectTaskTreeQuery.refetch();
  };

  const sheetFocusMode = sheetFocusModeOn && isProjectSheetRoute;
  useEffect(() => {
    if (!sheetFocusMode) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]')) return;
      setSheetFocusModeOn(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sheetFocusMode]);

  // /projects/:id/sheet?task=<taskId> opens that task's detail panel and points the sheet at its row.
  const focusTaskId = isProjectSheetRoute ? new URLSearchParams(location.search).get('task') : null;
  const handledFocusTaskRef = useRef(null);
  useEffect(() => {
    if (!focusTaskId || !canSeeProjectTasks || !projectTaskTreeQuery.isSuccess) return;
    if (handledFocusTaskRef.current === focusTaskId) return;
    handledFocusTaskRef.current = focusTaskId;
    const focusTask = projectSheetTasks.find(task => task.id === focusTaskId);
    if (focusTask) {
      setEditingTask(focusTask);
      setTaskDialogOpen(true);
    } else {
      toast({ title: 'Task not found', description: 'It may have been deleted or moved to another project.' });
    }
  }, [focusTaskId, canSeeProjectTasks, projectTaskTreeQuery.isSuccess, projectSheetTasks]);

  const clearFocusTaskParam = () => {
    if (!focusTaskId) return;
    const params = new URLSearchParams(location.search);
    params.delete('task');
    const search = params.toString();
    handledFocusTaskRef.current = null;
    navigate(`${location.pathname}${search ? `?${search}` : ''}`, { replace: true });
  };

  const projectBoardQuery = useQuery({
    queryKey: ['project-board', projectId],
    queryFn: () => tasksApi.getBoard(projectId),
    enabled: !!projectId && isProjectBoardRoute,
  });

  const mappedProjectBoard = useMemo(
    () => mapProjectBoardToKanban(projectBoardQuery.data),
    [projectBoardQuery.data]
  );

  const projectBoard = optimisticProjectBoard || mappedProjectBoard;

  const isProjectBoardEmpty = projectBoard.columns.length === 0;
  const retryProjectBoard = () => {
    projectBoardQuery.refetch();
  };

  const projectGanttQuery = useQuery({
    queryKey: ['project-gantt', projectId],
    queryFn: () => tasksApi.getGantt(projectId),
    enabled: !!projectId && isProjectGanttRoute,
  });

  const projectGanttTasks = useMemo(
    () => mapProjectGanttToGanttTasks(projectGanttQuery.data),
    [projectGanttQuery.data]
  );

  const retryProjectGantt = () => {
    projectGanttQuery.refetch();
  };

  const projectAuditQuery = useQuery({
    queryKey: ['project-audit-timeline', projectId],
    queryFn: () => activityApi.listProjectAuditTimeline(projectId),
    enabled: !!projectId && isProjectAuditRoute,
  });

  const projectAuditTimeline = projectAuditQuery.data?.entries || [];
  const isProjectAuditLoading = projectAuditQuery.isLoading;
  const isProjectAuditError = projectAuditQuery.isError;
  const retryProjectAudit = () => {
    projectAuditQuery.refetch();
  };

  useEffect(() => {
    if (!projectId || !hasValidProjectRoute) return;
    if (!projectTab || !PROJECT_TABS.includes(projectTab)) {
      navigate(`/projects/${projectId}/sheet`, { replace: true });
    }
  }, [hasValidProjectRoute, navigate, projectId, projectTab]);

  const legacyDataEnabled = !hasPortfolioRoute && !hasProgramRoute && !hasProjectRoute && !['all_portfolios', 'all_programs', 'portfolio', 'program'].includes(viewMode);

  const invalidatePortfolioQueries = (nextPortfolioId) => {
    queryClient.invalidateQueries({ queryKey: ['account-portfolios', selectedAccountId] });
    queryClient.invalidateQueries({ queryKey: ['portfolio-detail', nextPortfolioId] });
    queryClient.invalidateQueries({ queryKey: ['portfolio-overview', nextPortfolioId] });
    queryClient.invalidateQueries({ queryKey: ['portfolio-programs', nextPortfolioId] });
    queryClient.invalidateQueries({ queryKey: ['account-sidebar', selectedAccountId] });
  };

  const invalidateProgramQueries = (nextProgramId, nextPortfolioId) => {
    queryClient.invalidateQueries({ queryKey: ['account-programs-projects', selectedAccountId] });
    queryClient.invalidateQueries({ queryKey: ['program-detail', nextProgramId] });
    queryClient.invalidateQueries({ queryKey: ['program-overview', nextProgramId] });
    queryClient.invalidateQueries({ queryKey: ['program-projects', nextProgramId] });
    if (nextPortfolioId) {
      queryClient.invalidateQueries({ queryKey: ['portfolio-programs', nextPortfolioId] });
    }
    queryClient.invalidateQueries({ queryKey: ['account-sidebar', selectedAccountId] });
  };

  const invalidateProgramProjectCreateQueries = (nextProgramId, nextPortfolioId) => {
    queryClient.invalidateQueries({ queryKey: ['program-projects', nextProgramId] });
    queryClient.invalidateQueries({ queryKey: ['program-overview', nextProgramId] });
    queryClient.invalidateQueries({ queryKey: ['account-programs-projects', selectedAccountId] });
    queryClient.invalidateQueries({ queryKey: ['account-sidebar', selectedAccountId] });
    if (nextPortfolioId) {
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview', nextPortfolioId] });
    }
  };

  const invalidateProjectQueries = (nextProject) => {
    queryClient.invalidateQueries({ queryKey: ['project-detail', nextProject.id] });
    queryClient.invalidateQueries({ queryKey: ['project-overview', nextProject.id] });
    if (nextProject.program_id) {
      queryClient.invalidateQueries({ queryKey: ['program-projects', nextProject.program_id] });
      queryClient.invalidateQueries({ queryKey: ['program-overview', nextProject.program_id] });
    }
    queryClient.invalidateQueries({ queryKey: ['account-programs-projects', selectedAccountId] });
    queryClient.invalidateQueries({ queryKey: ['account-sidebar', selectedAccountId] });
  };

  const invalidateProjectTaskWorkspaces = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project-board', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['account-due-tasks', selectedAccountId] }),
    ]);
  };

  const getBackendSafeMessage = (error, fallback) => {
    const data = error?.response?.data ?? error?.data;
    const detail = data?.detail ?? data?.message ?? data?.error;

    if (typeof detail === 'string' && detail.trim()) return detail.trim();
    if (Array.isArray(detail)) {
      const messages = detail
        .map(item => typeof item === 'string' ? item : item?.msg || item?.message)
        .filter(Boolean);
      if (messages.length > 0) return messages.join('\n');
    }
    if (detail && typeof detail === 'object') {
      const message = detail.message ?? detail.error ?? detail.reason;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }

    return fallback;
  };

  // Account-wide data for the non-routed views (landing pages, summaries, RAID rollups).
  const accountHierarchy = useAccountHierarchy();
  const legacyProjects = accountHierarchy.projects;
  const legacyPrograms = accountHierarchy.programs;
  const loadingProjects = legacyDataEnabled && accountHierarchy.isLoading;
  const loadingPrograms = loadingProjects;

  const portfolios = accountPortfolios;
  const loadingPortfolios = loadingAccountPortfolios;
  const useProgramHierarchyData = hasProgramRoute || hasProjectRoute || ['all_portfolios', 'all_programs', 'portfolio', 'program'].includes(viewMode);
  const programs = useProgramHierarchyData ? accountProgramsProjects.programs : legacyPrograms;
  const projects = useProgramHierarchyData ? accountProgramsProjects.projects : legacyProjects;

  const vacations = useAccountVacations();
  const resources = useAccountResources();
  const { data: risks = [] } = useQuery({
    queryKey: ['account-risks', selectedAccountId],
    queryFn: async () => mapRiskListFromApi(await raidApi.listAccountRisks(selectedAccountId)),
    enabled: !!selectedAccountId,
  });
  const { data: issues = [] } = useQuery({
    queryKey: ['account-issues', selectedAccountId],
    queryFn: async () => mapIssueListFromApi(await raidApi.listAccountIssues(selectedAccountId)),
    enabled: !!selectedAccountId,
  });
  const { data: assumptions = [] } = useQuery({
    queryKey: ['assumptions', selectedAccountId],
    queryFn: () => raidEntityAdapters.Assumption.list(selectedAccountId),
    enabled: !!selectedAccountId,
  });
  const decisions = useAccountDecisions();
  const { changeRequests } = useAccountChangeRequests();
  const sprints = useAccountSprints();
  const { tasks: accountTasks } = useAccountTasks();
  // Sprint-scoped tasks are the API's user stories.
  const stories = useMemo(() => accountTasks.filter(t => t.sprint_id).map(mapTaskToUserStory), [accountTasks]);

  // RAID and task data scoped to the routed project (reports, sheet indicators)
  const routedProjectData = useMemo(() => {
    const forProject = (items) => items.filter(item => item.project_id === projectId);
    return {
      tasks: forProject(accountTasks),
      risks: forProject(risks),
      issues: forProject(issues),
      assumptions: forProject(assumptions),
      decisions: forProject(decisions),
      changeRequests: forProject(changeRequests),
      sprints: forProject(sprints),
      stories: forProject(stories),
    };
  }, [projectId, accountTasks, risks, issues, assumptions, decisions, changeRequests, sprints, stories]);

  // Mutations
  const createProject = useMutation({
    mutationFn: (data) => {
      // Projects always live under a program in Project Hub.
      if (!data?.program_id) throw new Error('Choose a program for the new project.');
      return programsApi.createProject(data.program_id, data);
    },
    onSuccess: (newProject) => {
      invalidateHierarchy(queryClient);
      navigate(`/projects/${newProject.id}/sheet`);
    },
    onError: (error) => toastError(error.message),
  });

  const createProgram = useMutation({
    mutationFn: (data) => {
      if (!data?.portfolio_id) throw new Error('Select a portfolio before creating a program.');
      return programsApi.create(data.portfolio_id, data);
    },
    onSuccess: (newProgram) => {
      invalidateProgramQueries(newProgram.id, newProgram.portfolio_id);
      setSelectedItem(newProgram);
      setSelectedType('program');
      setViewMode('program');
      navigate(`/programs/${newProgram.id}`);
    }
  });

  const updateProgram = useMutation({
    mutationFn: ({ id, data }) => programsApi.update(id, data),
    onSuccess: (updatedProgram) => {
      invalidateProgramQueries(updatedProgram.id, updatedProgram.portfolio_id);
      setSelectedItem(updatedProgram);
      setSelectedType('program');
    }
  });

  const createProgramProject = useMutation({
    mutationFn: ({ programId: nextProgramId, data }) => programsApi.createProject(nextProgramId, data),
    onSuccess: (newProject) => {
      invalidateProgramProjectCreateQueries(newProject.program_id, newProject.portfolio_id);
      navigate(`/projects/${newProject.id}/sheet`);
    }
  });

  const updateProjectShell = useMutation({
    mutationFn: ({ id, data }) => projectsApi.update(id, data),
    onSuccess: (updatedProject) => {
      invalidateProjectQueries(updatedProject);
      setSelectedItem(updatedProject);
      setSelectedType('project');
    }
  });

  const createPortfolio = useMutation({
    mutationFn: (data) => {
      if (!selectedAccountId) throw new Error('Select an account before creating a portfolio.');
      return portfoliosApi.create(selectedAccountId, data);
    },
    onSuccess: (newPortfolio) => {
      invalidatePortfolioQueries(newPortfolio.id);
      setSelectedItem(newPortfolio);
      setSelectedType('portfolio');
      setViewMode('portfolio');
      navigate(`/portfolios/${newPortfolio.id}`);
    }
  });

  const updatePortfolio = useMutation({
    mutationFn: ({ id, data }) => portfoliosApi.update(id, data),
    onSuccess: (updatedPortfolio) => {
      invalidatePortfolioQueries(updatedPortfolio.id);
      setSelectedItem(updatedPortfolio);
      setSelectedType('portfolio');
    }
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => projectsApi.update(id, data),
    onSuccess: () => invalidateHierarchy(queryClient),
    onError: (error) => toastError(error.message),
  });

  const renameRouteProject = useMutation({
    mutationFn: ({ id, name }) => projectsApi.update(id, { name }),
    onSuccess: (_updatedProject, { id }) => {
      setProjectNameDraft(null);
      invalidateProjectQueries({ id, program_id: projectDetail?.program_id });
      invalidateHierarchy(queryClient);
    },
    onError: (error) => toastError(getBackendSafeMessage(error, 'We could not rename this project. Please try again.')),
  });

  const invalidateAccountTasks = () => queryClient.invalidateQueries({ queryKey: ['account-tasks'] });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => tasksApi.update(id, mapTaskFormToPayload(data)),
    onSuccess: invalidateAccountTasks,
    onError: (error) => toastError(error.message),
  });

  const createProjectSheetTask = useMutation({
    mutationFn: (data) => tasksApi.create(projectId, mapTaskSheetInputToCreatePayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Task not added', description: error?.message || 'Please try again.' }),
  });

  const updateProjectSheetTaskTitle = useMutation({
    mutationFn: ({ id, data }) => tasksApi.update(id, mapTaskSheetInputToTitleUpdatePayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] });
    }
  });

  const updateProjectSheetTaskDuration = useMutation({
    mutationFn: ({ id, data }) => tasksApi.update(id, mapTaskSheetInputToDurationUpdatePayload(data)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      ]);
    }
  });

  const updateProjectSheetTaskProgress = useMutation({
    mutationFn: ({ id, data }) => tasksApi.update(id, mapTaskSheetInputToProgressUpdatePayload(data)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-board', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      ]);
    }
  });

  const updateProjectSheetTaskStatus = useMutation({
    mutationFn: ({ id, data }) => tasksApi.update(id, mapTaskSheetInputToStatusUpdatePayload(data)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-board', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['account-due-tasks', selectedAccountId] }),
      ]);
    }
  });

  const updateProjectSheetTaskPriority = useMutation({
    mutationFn: ({ id, data }) => tasksApi.updatePriority(id, data),
    onSuccess: invalidateProjectTaskWorkspaces,
  });

  const updateProjectSheetTaskType = useMutation({
    mutationFn: ({ id, data }) => tasksApi.updateTaskType(id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-board', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      ]);
    }
  });

  const updateProjectGanttTaskSchedule = useMutation({
    mutationFn: ({ id, data }) => tasksApi.updateSchedule(id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-board', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['account-due-tasks', selectedAccountId] }),
      ]);
    },
  });

  const indentProjectSheetTask = useMutation({
    mutationFn: (id) => tasksApi.indent(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-board', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      ]);
    },
  });

  const outdentProjectSheetTask = useMutation({
    mutationFn: (id) => tasksApi.outdent(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-board', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      ]);
    },
  });

  const addProjectSheetTaskPredecessor = useMutation({
    mutationFn: ({ id, predecessorTaskId }) => tasksApi.addPredecessor(id, { predecessor_task_id: predecessorTaskId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      ]);
    },
  });

  const deleteProjectSheetTaskPredecessor = useMutation({
    mutationFn: ({ id, predecessorId }) => tasksApi.deletePredecessor(id, predecessorId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      ]);
    },
  });

  const addProjectGanttTaskPredecessor = useMutation({
    mutationFn: ({ id, predecessorTaskId }) => tasksApi.addPredecessor(id, { predecessor_task_id: predecessorTaskId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      ]);
    },
  });

  const deleteProjectGanttTaskPredecessor = useMutation({
    mutationFn: ({ id, predecessorId }) => tasksApi.deletePredecessor(id, predecessorId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      ]);
    },
  });

  const updateProjectBoardTaskPosition = useMutation({
    mutationFn: ({ id, data }) => tasksApi.updateBoardPosition(id, mapTaskBoardPositionToPayload(data)),
    onMutate: ({ id, data }) => {
      const previousBoard = projectBoard;
      const payload = mapTaskBoardPositionToPayload(data);
      setOptimisticProjectBoard(moveBoardCard(previousBoard, id, data.status_id ?? data.status, payload.sort_order));
      return { previousBoard };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBoard) setOptimisticProjectBoard(context.previousBoard);
      toastError('We could not move that task. Please try again.');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-board', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
      ]);
      setOptimisticProjectBoard(null);
    }
  });

  const deleteProjectSheetTask = useMutation({
    mutationFn: (id) => tasksApi.delete(id),
    onSuccess: invalidateProjectTaskWorkspaces,
  });

  const reorderProjectSheetTasks = useMutation({
    mutationFn: (data) => tasksApi.reorder(projectId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['project-task-tree', projectId] });
      const previousTaskTree = queryClient.getQueryData(['project-task-tree', projectId]);
      queryClient.setQueryData(
        ['project-task-tree', projectId],
        current => reorderTaskTreeSiblings(current, data.parent_task_id, data.ordered_task_ids)
      );
      return { previousTaskTree };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTaskTree !== undefined) {
        queryClient.setQueryData(['project-task-tree', projectId], context.previousTaskTree);
      }
      toastError('We could not reorder these tasks. The previous order has been restored.');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-task-tree', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-gantt', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-board', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-overview', projectId] }),
      ]);
    },
  });

  // Handlers
  const handleSelectItem = (item, type) => {
    setSelectedItem(item);
    setSelectedType(type);
    if (DIRECTORY_VIEWS.includes(type)) {
      setViewMode(type);
      navigate(`/Projects?view=${type}`);
    } else if (type === 'portfolio') {
      setViewMode('portfolio');
      if (item?.id) navigate(`/portfolios/${item.id}`);
    } else if (type === 'program') {
      setViewMode('program');
      if (item?.id) navigate(`/programs/${item.id}`);
    } else {
      setViewMode('project');
      // Projects open on their API-backed route, like programs.
      if (item?.id) navigate(`/projects/${item.id}`);
    }
  };

  useEffect(() => {
    if (hasPortfolioRoute || hasProgramRoute || hasProjectRoute) return;
    const params = new URLSearchParams(location.search);
    const requestedView = params.get('view');
    const id = params.get('id');
    if (id) {
      // Keep old saved links working without waiting for hierarchy queries.
      const detailRoutes = { portfolio: '/portfolios', program: '/programs', project: '/projects' };
      if (UUID_RE.test(id) && detailRoutes[requestedView]) {
        navigate(`${detailRoutes[requestedView]}/${id}${requestedView === 'project' ? '/sheet' : ''}`, { replace: true });
      }
      return;
    }
    const nextView = requestedView || _defaultLanding;
    if (nextView === 'favorites') {
      navigate('/Favorites', { replace: true });
      return;
    }
    if (!DIRECTORY_VIEWS.includes(nextView)) return;
    setSelectedItem(nextView === 'sprints' ? { id: 'sprints', name: 'Sprints' } : null);
    setSelectedType(nextView);
    setViewMode(nextView);
  }, [location.pathname, location.search, hasPortfolioRoute, hasProgramRoute, hasProjectRoute, navigate, _defaultLanding]);

  const handleDeleteItem = (item, type) => {
    if (type === 'program') {
      toastError('Program delete is not supported by Project Hub yet.', 'Not available yet');
      return;
    } else if (type === 'portfolio') {
      toastError('Portfolio delete is not available yet.', 'Not available yet');
      return;
    } else {
      projectsApi.delete(item.id)
        .then(() => invalidateHierarchy(queryClient))
        .catch(error => toastError(getBackendSafeMessage(error, 'The project could not be deleted.')));
    }
    if (selectedItem?.id === item.id) { setSelectedItem(null); setViewMode('project'); }
  };

  const handleNewProject = () => {
    setDialogType('project');
    setEditingProject(null);
    setProjectDialogOpen(true);
  };

  const handleNewProgram = () => {
    setDialogType('program');
    setEditingProject(null);
    setProjectDialogOpen(true);
  };

  const handleNewPortfolio = () => {
    setDialogType('portfolio');
    setEditingProject(null);
    setProjectDialogOpen(true);
  };

  const handleSaveProject = (data) => {
    // Duplicate name check
    if (dialogType === 'program') {
      if (programs.some(p => p.id !== editingProject?.id && p.name.toLowerCase() === data.name?.toLowerCase())) {
        toastError(`A program named "${data.name}" already exists.`, 'Name already in use'); return;
      }
      const portfolioId = data.portfolio_id || editingProject?.portfolio_id;
      if (!portfolioId) {
        toastError('Select a portfolio before saving this program.', 'Portfolio required');
        return;
      }
      const nextData = { ...data, portfolio_id: portfolioId };
      editingProject?.id ? updateProgram.mutate({ id: editingProject.id, data: nextData }) : createProgram.mutate(nextData);
    } else if (dialogType === 'portfolio') {
      if (portfolios.some(p => p.id !== editingProject?.id && p.name.toLowerCase() === data.name?.toLowerCase())) {
        toastError(`A portfolio named "${data.name}" already exists.`, 'Name already in use'); return;
      }
      editingProject?.id ? updatePortfolio.mutate({ id: editingProject.id, data }) : createPortfolio.mutate(data);
    } else {
      if (projects.some(p => p.id !== editingProject?.id && p.name.toLowerCase() === data.name?.toLowerCase())) {
        toastError(`A project named "${data.name}" already exists.`, 'Name already in use'); return;
      }
      if (editingProject?.id) {
        if (hasProjectRoute || editingProject.id === projectId) {
          updateProjectShell.mutate({ id: editingProject.id, data });
        } else {
          updateProject.mutate({ id: editingProject.id, data });
        }
      } else {
        const targetProgramId = data.program_id || editingProject?.program_id || (selectedType === 'program' ? selectedItem?.id : null);
        if (targetProgramId) {
          createProgramProject.mutate({ programId: targetProgramId, data: { ...data, program_id: targetProgramId } });
          return;
        }
        createProject.mutate(data);
      }
    }
  };

  /** Typing a name into an empty sheet row adds a top-level task at the end of the plan. */
  const handleCreateProjectSheetTask = (data) => {
    const name = String(data?.name ?? data?.title ?? '').trim();
    if (!name) return;
    const rootOrders = projectSheetTasks
      .filter((task) => !task.parent_task_id)
      .map((task) => Number(task.sort_order ?? task.order ?? 0))
      .filter(Number.isFinite);
    createProjectSheetTask.mutate({ name, sort_order: Math.max(0, ...rootOrders) + 1 });
  };

  const handleUpdateProjectSheetTaskTitle = (id, data) => {
    return updateProjectSheetTaskTitle.mutateAsync({ id, data });
  };

  const handleUpdateProjectSheetTaskDuration = (id, data) => {
    return updateProjectSheetTaskDuration.mutateAsync({ id, data });
  };

  const handleUpdateProjectSheetTaskProgress = (id, data) => {
    return updateProjectSheetTaskProgress.mutateAsync({ id, data });
  };

  const handleUpdateProjectSheetTaskStatus = (id, data) => {
    return updateProjectSheetTaskStatus.mutateAsync({ id, data });
  };

  const handleUpdateProjectSheetTaskSchedule = (id, data) => {
    return updateProjectGanttTaskSchedule.mutateAsync({ id, data });
  };

  const handleSaveProjectName = () => {
    const name = projectNameDraft?.trim();
    if (!projectDetail?.id || !name || name === projectDetail.name) {
      setProjectNameDraft(null);
      return;
    }
    renameRouteProject.mutate({ id: projectDetail.id, name });
  };

  const handleUpdateProjectSheetTaskPriority = async (id, data) => {
    const priorityId = typeof data?.priority_id === 'string' ? data.priority_id.trim() : '';
    if (!id || !priorityId) return;

    const task = projectSheetTasks.find(item => item.id === id);
    if (task?.priority_id === priorityId) return;

    const requestKey = `${id}:${priorityId}`;
    if (pendingProjectSheetPriorityRequests.current.has(requestKey)) return;

    const previousPriorityId = task?.priority_id || null;
    pendingProjectSheetPriorityRequests.current.add(requestKey);
    setPendingProjectSheetPriorityTaskIds(prev => ({ ...prev, [id]: true }));
    setProjectSheetPriorityDrafts(prev => ({ ...prev, [id]: priorityId }));
    setProjectSheetPriorityErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      await updateProjectSheetTaskPriority.mutateAsync({ id, data: { priority_id: priorityId } });
      setProjectSheetPriorityDrafts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (_error) {
      setProjectSheetPriorityDrafts(prev => {
        const next = { ...prev };
        if (previousPriorityId) next[id] = previousPriorityId;
        else delete next[id];
        return next;
      });
      setProjectSheetPriorityErrors(prev => ({
        ...prev,
        [id]: 'We could not save this priority. Please try again.',
      }));
      toastError('We could not save this priority. Please try again.');
    } finally {
      pendingProjectSheetPriorityRequests.current.delete(requestKey);
      setPendingProjectSheetPriorityTaskIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleUpdateProjectSheetTaskType = (id, data) => {
    return updateProjectSheetTaskType.mutateAsync({ id, data });
  };

  const handleProjectSheetHierarchyChange = async (id, action) => {
    if (!projectId || !id || !isProjectSheetRoute) return;
    if (pendingProjectSheetHierarchyRequests.current.has(id)) return;

    pendingProjectSheetHierarchyRequests.current.add(id);
    setPendingProjectSheetHierarchyTaskIds(prev => ({ ...prev, [id]: true }));

    try {
      if (action === 'indent') {
        await indentProjectSheetTask.mutateAsync(id);
      } else {
        await outdentProjectSheetTask.mutateAsync(id);
      }
    } catch (error) {
      toastError(getBackendSafeMessage(error, 'We could not change this task hierarchy. Please try again.'));
      throw error;
    } finally {
      pendingProjectSheetHierarchyRequests.current.delete(id);
      setPendingProjectSheetHierarchyTaskIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleIndentProjectSheetTask = (id) => handleProjectSheetHierarchyChange(id, 'indent');

  const handleOutdentProjectSheetTask = (id) => handleProjectSheetHierarchyChange(id, 'outdent');

  const handleProjectSheetPredecessorChange = async (id, requestKey, mutationRunner) => {
    if (!projectId || !id || !isProjectSheetRoute) return;
    if (pendingProjectSheetPredecessorRequests.current.has(requestKey)) return;
    if (pendingProjectSheetPredecessorTaskIds[id]) return;

    pendingProjectSheetPredecessorRequests.current.add(requestKey);
    setPendingProjectSheetPredecessorTaskIds(prev => ({ ...prev, [id]: true }));

    try {
      await mutationRunner();
    } catch (error) {
      toastError(getBackendSafeMessage(error, 'We could not update this task dependency. Please try again.'));
      throw error;
    } finally {
      pendingProjectSheetPredecessorRequests.current.delete(requestKey);
      setPendingProjectSheetPredecessorTaskIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleAddProjectSheetTaskPredecessor = (id, predecessorTaskId) => {
    if (!predecessorTaskId) return;
    return handleProjectSheetPredecessorChange(
      id,
      `${id}:add:${predecessorTaskId}`,
      () => addProjectSheetTaskPredecessor.mutateAsync({ id, predecessorTaskId })
    );
  };

  const handleRemoveProjectSheetTaskPredecessor = (id, predecessorId) => {
    if (!predecessorId) return;
    return handleProjectSheetPredecessorChange(
      id,
      `${id}:delete:${predecessorId}`,
      () => deleteProjectSheetTaskPredecessor.mutateAsync({ id, predecessorId })
    );
  };

  const handleDeleteProjectSheetTask = async (id) => {
    if (!id || deletingProjectSheetTaskRequests.current.has(id)) return;

    deletingProjectSheetTaskRequests.current.add(id);
    setDeletingProjectSheetTaskIds(prev => ({ ...prev, [id]: true }));

    try {
      await deleteProjectSheetTask.mutateAsync(id);
      setProjectSheetPriorityDrafts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setProjectSheetPriorityErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setPendingProjectSheetPriorityTaskIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      pendingProjectSheetPriorityRequests.current.forEach(requestKey => {
        if (requestKey.startsWith(`${id}:`)) {
          pendingProjectSheetPriorityRequests.current.delete(requestKey);
        }
      });
      setEditingTask(prev => prev?.id === id ? null : prev);
      if (editingTask?.id === id) {
        setTaskDialogOpen(false);
      }
    } catch (error) {
      toastError(getBackendSafeMessage(error, 'We could not delete this task. Please try again.'));
      throw error;
    } finally {
      deletingProjectSheetTaskRequests.current.delete(id);
      setDeletingProjectSheetTaskIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleReorderProjectSheetTasks = async (data) => {
    const orderedTaskIds = Array.isArray(data?.ordered_task_ids) ? data.ordered_task_ids : [];
    const parentTaskId = data?.parent_task_id || null;
    const requestKey = `${parentTaskId || 'root'}:${orderedTaskIds.join('|')}`;

    if (!projectId || orderedTaskIds.length === 0) return;
    if (pendingProjectSheetReorderRequest.current) return;

    pendingProjectSheetReorderRequest.current = requestKey;
    setIsReorderingProjectSheetTasks(true);

    try {
      await reorderProjectSheetTasks.mutateAsync({
        parent_task_id: parentTaskId,
        ordered_task_ids: orderedTaskIds,
      });
    } finally {
      pendingProjectSheetReorderRequest.current = null;
      setIsReorderingProjectSheetTasks(false);
    }
  };

  const handleMoveProjectBoardTask = (id, data) => {
    return updateProjectBoardTaskPosition.mutateAsync({ id, data });
  };

  const handleUpdateProjectGanttTaskSchedule = async (id, dates) => {
    if (!projectId || !id || !isProjectGanttRoute) return;

    const task = projectGanttTasks.find(item => item.id === id);
    if (!task?.start_date || !task?.finish_date) return;

    let nextDates;
    try {
      nextDates = mapTaskGanttDateUpdatePayload({
        start_date: dates?.start_date,
        finish_date: dates?.finish_date,
      });
    } catch (error) {
      toastError(error?.message || 'Enter valid task schedule dates.', 'Check the dates');
      return;
    }

    const changedDates = {};
    if (nextDates.start_date !== task.start_date) changedDates.start_date = nextDates.start_date;
    if (nextDates.finish_date !== task.finish_date) changedDates.finish_date = nextDates.finish_date;
    if (Object.keys(changedDates).length === 0) return;

    const requestKey = `${id}:${nextDates.start_date}:${nextDates.finish_date}`;
    if (pendingProjectGanttScheduleTaskRequests.current.has(id)) return;
    if (pendingProjectGanttScheduleRequests.current.has(requestKey)) return;

    pendingProjectGanttScheduleTaskRequests.current.add(id);
    pendingProjectGanttScheduleRequests.current.add(requestKey);
    setPendingProjectGanttScheduleTaskIds(prev => ({ ...prev, [id]: true }));

    await queryClient.cancelQueries({ queryKey: ['project-gantt', projectId] });
    const previousProjectGantt = queryClient.getQueryData(['project-gantt', projectId]);
    queryClient.setQueryData(
      ['project-gantt', projectId],
      current => updateProjectGanttCacheTaskDates(current, id, nextDates)
    );

    try {
      await updateProjectGanttTaskSchedule.mutateAsync({ id, data: changedDates });
    } catch (_error) {
      queryClient.setQueryData(['project-gantt', projectId], previousProjectGantt);
      toastError('We could not update this task schedule. The previous dates were restored.');
    } finally {
      pendingProjectGanttScheduleTaskRequests.current.delete(id);
      pendingProjectGanttScheduleRequests.current.delete(requestKey);
      setPendingProjectGanttScheduleTaskIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleProjectGanttDependencyChange = async (id, requestKey, mutationRunner) => {
    if (!projectId || !id || !isProjectGanttRoute) return;
    if (pendingProjectGanttDependencyRequests.current.has(requestKey)) return;
    if (pendingProjectGanttDependencyTaskIds[id]) return;

    pendingProjectGanttDependencyRequests.current.add(requestKey);
    setPendingProjectGanttDependencyTaskIds(prev => ({ ...prev, [id]: true }));

    try {
      await mutationRunner();
    } catch (error) {
      toastError(getBackendSafeMessage(error, 'We could not update this task dependency. Please try again.'));
    } finally {
      pendingProjectGanttDependencyRequests.current.delete(requestKey);
      setPendingProjectGanttDependencyTaskIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleAddProjectGanttTaskPredecessor = (id, predecessorTaskId) => {
    if (!id || !predecessorTaskId) return;
    return handleProjectGanttDependencyChange(
      id,
      `${id}:add:${predecessorTaskId}`,
      () => addProjectGanttTaskPredecessor.mutateAsync({ id, predecessorTaskId })
    );
  };

  const handleRemoveProjectGanttTaskPredecessor = (id, predecessorId) => {
    if (!id || !predecessorId) return;
    return handleProjectGanttDependencyChange(
      id,
      `${id}:delete:${predecessorId}`,
      () => deleteProjectGanttTaskPredecessor.mutateAsync({ id, predecessorId })
    );
  };

  const handleRenameItem = (id, newName, type) => {
    if (type === 'program') {
      updateProgram.mutate({ id, data: { name: newName } });
    } else if (type === 'portfolio') {
      updatePortfolio.mutate({ id, data: { name: newName } });
    } else {
      updateProject.mutate({ id, data: { name: newName } });
    }
  };

  const handleToggleExpand = (taskId) => {
    setExpandedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };



  const isPortfolioRouteLoading = loadingRoutePortfolio || loadingRoutePortfolioOverview || loadingRoutePortfolioPrograms;
  const isPortfolioRouteError = routePortfolioError || routePortfolioOverviewError || routePortfolioProgramsError;
  const portfolioDetail = routePortfolio
    ? {
        ...routePortfolio,
        ...(routePortfolioOverview?.portfolio || {}),
        program_count: routePortfolioOverview?.program_count,
        project_count: routePortfolioOverview?.project_count,
        progress: routePortfolioOverview?.progress,
      }
    : null;

  const retryPortfolioRoute = () => {
    refetchRoutePortfolio();
    refetchRoutePortfolioOverview();
    refetchRoutePortfolioPrograms();
  };

  const isProgramRouteLoading = loadingRouteProgram || loadingRouteProgramOverview || loadingRouteProgramProjects;
  const isProgramRouteError = routeProgramError || routeProgramOverviewError || routeProgramProjectsError;
  const programDetail = routeProgram
    ? {
        ...routeProgram,
        ...(routeProgramOverview?.program || {}),
        project_count: routeProgramOverview?.project_count,
        completed_count: routeProgramOverview?.completed_count,
        progress: routeProgramOverview?.progress,
        risk_count: routeProgramOverview?.risk_count,
        issue_count: routeProgramOverview?.issue_count,
      }
    : null;

  const retryProgramRoute = () => {
    refetchRouteProgram();
    refetchRouteProgramOverview();
    refetchRouteProgramProjects();
  };

  const isProjectRouteLoading = loadingRouteProject || loadingRouteProjectOverview;
  const isProjectRouteError = routeProjectError || routeProjectOverviewError;
  const projectDetail = routeProject
    ? {
        ...routeProject,
        ...(routeProjectOverview?.project || {}),
        progress: routeProjectOverview?.progress ?? routeProject.progress,
        percent_complete: routeProjectOverview?.progress ?? routeProject.percent_complete,
        stats: routeProjectOverview?.stats,
        health: routeProjectOverview?.health,
        total_tasks: routeProjectOverview?.total_tasks,
        completed_tasks: routeProjectOverview?.completed_tasks,
        open_risks: routeProjectOverview?.open_risks,
        open_issues: routeProjectOverview?.open_issues,
      }
    : null;
  const projectProgram = projectDetail?.program_id ? programs.find(p => p.id === projectDetail.program_id) : null;
  const projectPortfolio = projectDetail?.portfolio_id ? portfolios.find(p => p.id === projectDetail.portfolio_id) : null;

  // Feeds "Recent projects" in the sidebar and on My work.
  const recentProjectId = projectDetail?.id;
  const recentProjectName = projectDetail?.name;
  const recentProjectColor = projectDetail?.color;
  useEffect(() => {
    if (recentProjectId) recordRecentProject(user?.id, { id: recentProjectId, name: recentProjectName, color: recentProjectColor });
  }, [user?.id, recentProjectId, recentProjectName, recentProjectColor]);

  const retryProjectRoute = () => {
    refetchRouteProject();
    refetchRouteProjectOverview();
  };

  const isLoading = !hasPortfolioRoute && !hasProgramRoute && !hasProjectRoute && (loadingProjects || loadingPrograms || loadingPortfolios || loadingAccountProgramsProjects);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {!sheetFocusMode && <ProjectSidebar
        projects={projects}
        programs={programs}
        portfolios={portfolios}
        selectedItem={selectedItem}
        selectedType={selectedType}
        onSelectItem={handleSelectItem}
        onNewProject={handleNewProject}
        onNewProgram={handleNewProgram}
        onNewPortfolio={handleNewPortfolio}
        onRenameItem={handleRenameItem}
        onDeleteItem={handleDeleteItem}
        onEditItem={(item, type) => {
          setEditingProject(item);
          setDialogType(type);
          setProjectDialogOpen(true);
        }}
        onShowVacationCalendar={() => setVacationCalendarOpen(true)}
      />}
      
      {/* Directory views pad themselves; a project page always needs padding, even when opened from a program. */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!hasProjectRoute && ['all_portfolios','all_programs','portfolio','program'].includes(viewMode) ? '' : sheetFocusMode ? 'p-3' : 'p-8'}`}>
        {hasProjectRoute ? (
          !hasValidProjectRoute ? (
            <PortfolioState title="Invalid project link" message="This project URL is not a valid Project Hub UUID." />
          ) : isProjectRouteLoading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
          ) : isProjectRouteError || !projectDetail ? (
            <PortfolioState title="Project not found" message="We could not load this project. It may have been removed or you may not have access." onRetry={retryProjectRoute} />
          ) : (
            <>
              {sheetFocusMode ? (
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <span className="font-semibold text-slate-800 truncate">{projectDetail.name}</span>
                  <span className="text-xs text-slate-400">Focus mode</span>
                  <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1 text-slate-600" onClick={() => setSheetFocusModeOn(false)}>
                    <Minimize2 className="w-3.5 h-3.5" /> Exit focus
                  </Button>
                </div>
              ) : (
                <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <ViewToggle
                      view={activeProjectTab === 'board' ? 'mondayboard' : activeProjectTab}
                      onViewChange={(nextView) => {
                        const nextTab = nextView === 'mondayboard' || nextView === 'board' ? 'board' : nextView;
                        navigate(`/projects/${projectDetail.id}/${PROJECT_TABS.includes(nextTab) ? nextTab : 'sheet'}`);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-1 py-1 bg-white shadow-sm">
                    <ExportMenu tasks={routedProjectData.tasks} project={projectDetail} viewType={activeProjectTab} />
                    {canEditProjectTasks && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setTaskImportOpen(true)}>
                          <FileUp className="w-4 h-4 mr-2" /> Import
                        </Button>
                        <TaskCsvImport
                          open={taskImportOpen}
                          onOpenChange={setTaskImportOpen}
                          projectId={projectDetail.id}
                          onDone={invalidateProjectTaskWorkspaces}
                        />
                      </>
                    )}
                    <ReportGenerator project={projectDetail} />
                    <Button size="sm" variant="ghost" onClick={() => setShareOpen(true)} className="h-9 gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5" /> People
                    </Button>
                    <div className="w-px h-6 bg-slate-200" />
                    <Button size="sm" variant="ghost"
                      onClick={() => { setEditingProject(projectDetail); setDialogType('project'); setProjectDialogOpen(true); }}
                      className="h-9 text-slate-500 hover:text-slate-700 hover:bg-slate-50" title="Project Settings">
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                  {projectNameDraft !== null ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={projectNameDraft}
                        onChange={(e) => setProjectNameDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProjectName(); if (e.key === 'Escape') setProjectNameDraft(null); }}
                        disabled={renameRouteProject.isPending}
                        className="text-xl font-bold h-9 max-w-md"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleSaveProjectName} disabled={renameRouteProject.isPending}>
                        {renameRouteProject.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setProjectNameDraft(null)} disabled={renameRouteProject.isPending}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h1 className="text-xl font-bold text-slate-800 truncate">{projectDetail.name}</h1>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Rename project" onClick={() => setProjectNameDraft(projectDetail.name || '')}>
                        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                      <StarButton type="project" id={projectDetail.id} name={projectDetail.name} color={projectDetail.color} iconClassName="w-4 h-4" />
                    </div>
                  )}
                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-slate-500">
                      {projectDetail.status && <span>Status: <span className="font-medium text-slate-700">{projectDetail.status}</span></span>}
                      {projectDetail.progress !== undefined && projectDetail.progress !== null && <span>Progress: <span className="font-medium text-slate-700">{projectDetail.progress}%</span></span>}
                      <span>PM: <span className="font-medium text-slate-700">{projectDetail.owner || projectDetail.project_manager || 'Not assigned'}</span></span>
                      {projectDetail.open_risks !== undefined && <span>Open risks: <span className="font-medium text-slate-700">{projectDetail.open_risks}</span></span>}
                      {projectDetail.open_issues !== undefined && <span>Open issues: <span className="font-medium text-slate-700">{projectDetail.open_issues}</span></span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setProjectDetailsOpen(open => !open)}
                      aria-expanded={projectDetailsOpen}
                      className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600"
                    >
                      Details <ChevronDown className={`w-3 h-3 transition-transform ${projectDetailsOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {projectDetailsOpen && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>Program: <button
                          onClick={() => projectDetail.program_id ? navigate(`/programs/${projectDetail.program_id}`) : navigate('/Projects?view=all_programs')}
                          className="text-indigo-500 font-medium hover:text-indigo-700"
                        >{projectProgram?.name || 'Program'}</button></span>
                        <span>•</span>
                        <span>Portfolio: <span className="text-amber-600 font-medium">{projectPortfolio?.name || 'Unavailable'}</span></span>
                        {(projectDetail.start_date || projectDetail.end_date) && <><span>•</span><span>{projectDetail.start_date || '—'} – {projectDetail.end_date || '—'}</span></>}
                      </div>
                      {projectDetail.description && <p className="text-sm text-slate-600 max-w-3xl whitespace-pre-line">{projectDetail.description}</p>}
                    </div>
                  )}
                </div>
                </>
              )}
              <ShareDialog open={shareOpen} onOpenChange={setShareOpen} item={projectDetail} itemType="project" />

              {!canSeeProjectTasks && activeProjectTab !== 'audit' ? (
                <ProjectSheetState title="Tasks aren't shared with you" message="Your access to this project doesn't include its tasks. Ask a project manager or account owner if you need them." />
              ) : activeProjectTab === 'sheet' ? (
                isProjectSheetLoading ? (
                  <ProjectSheetState title="Loading project sheet" message="Fetching this project's task hierarchy…" isLoading />
                ) : isProjectSheetError ? (
                  <ProjectSheetState title="Project sheet could not load" message="We could not load tasks for this project. Please try again." onRetry={retryProjectSheet} />
                ) : (
                  <TaskSheet
                    tasks={projectSheetTasks}
                    project={projectDetail}
                    projects={[]}
                    programs={programs}
                    onUpdateTaskPriority={whenTasksEditable(handleUpdateProjectSheetTaskPriority)}
                    onUpdateTaskTitle={whenTasksEditable(handleUpdateProjectSheetTaskTitle)}
                    onUpdateTaskDuration={whenTasksEditable(handleUpdateProjectSheetTaskDuration)}
                    onUpdateTaskSchedule={whenTasksEditable(handleUpdateProjectSheetTaskSchedule)}
                    onUpdateTaskProgress={whenTasksEditable(handleUpdateProjectSheetTaskProgress)}
                    onUpdateTaskStatus={whenTasksEditable(projectSheetTaskStatusOptions.activeOptions.length > 0 ? handleUpdateProjectSheetTaskStatus : undefined)}
                    taskStatusOptions={projectSheetTaskStatusOptions.activeOptions}
                    onUpdateTaskType={whenTasksEditable(projectSheetTaskTypeOptions.activeOptions.length > 0 ? handleUpdateProjectSheetTaskType : undefined)}
                    taskTypeOptions={projectSheetTaskTypeOptions.activeOptions}
                    priorityOptions={projectSheetTaskPriorityOptions.activeOptions}
                    priorityOptionsState={{
                      isLoading: projectSheetAccountOptionsQuery.isLoading,
                      isError: projectSheetAccountOptionsQuery.isError,
                      onRetry: projectSheetAccountOptionsQuery.refetch,
                      hasOptionSet: projectSheetTaskPriorityOptions.found,
                      hasActiveOptions: projectSheetTaskPriorityOptions.activeOptions.length > 0,
                    }}
                    priorityDrafts={projectSheetPriorityDrafts}
                    priorityErrors={projectSheetPriorityErrors}
                    priorityPendingTaskIds={pendingProjectSheetPriorityTaskIds}
                    onIndentTask={whenTasksEditable(handleIndentProjectSheetTask)}
                    onOutdentTask={whenTasksEditable(handleOutdentProjectSheetTask)}
                    hierarchyPendingTaskIds={pendingProjectSheetHierarchyTaskIds}
                    onAddPredecessor={whenTasksEditable(handleAddProjectSheetTaskPredecessor)}
                    onRemovePredecessor={whenTasksEditable(handleRemoveProjectSheetTaskPredecessor)}
                    predecessorPendingTaskIds={pendingProjectSheetPredecessorTaskIds}
                    onAddTask={whenTasksEditable(handleCreateProjectSheetTask)}
                    onDeleteTask={whenTasksEditable(handleDeleteProjectSheetTask)}
                    deletingTaskIds={deletingProjectSheetTaskIds}
                    onReorderTasks={whenTasksEditable(handleReorderProjectSheetTasks)}
                    isReorderingTasks={isReorderingProjectSheetTasks}
                    readOnly
                    hideProjectHeader
                    viewMode="project"
                    vacations={vacations}
                    risks={routedProjectData.risks}
                    issues={routedProjectData.issues}
                    assumptions={routedProjectData.assumptions}
                    decisions={routedProjectData.decisions}
                    resources={[]}
                    enableResourceAssignments={isProjectSheetRoute && canEditProjectTasks}
                    accountResources={projectSheetAccountResourcesQuery.data || []}
                    accountResourcesState={{
                      isLoading: projectSheetAccountResourcesQuery.isLoading,
                      isError: projectSheetAccountResourcesQuery.isError,
                      onRetry: projectSheetAccountResourcesQuery.refetch,
                    }}
                    selectedAccountId={selectedAccountId}
                    projectId={projectId}
                    focusTaskId={focusTaskId}
                    focusMode={sheetFocusMode}
                    onToggleFocusMode={() => setSheetFocusModeOn(on => !on)}
                  />
                )
              ) : activeProjectTab === 'board' ? (
                projectBoardQuery.isLoading ? (
                  <ProjectBoardState title="Loading project board" message="Fetching this project's board…" isLoading />
                ) : projectBoardQuery.isError ? (
                  <ProjectBoardState title="Project board could not load" message="We could not load the board for this project. Please try again." onRetry={retryProjectBoard} />
                ) : isProjectBoardEmpty ? (
                  <ProjectBoardState title="No board columns" message="This project does not have any board columns to show yet." />
                ) : (
                  <KanbanBoard
                    columns={projectBoard.columns}
                    tasks={projectBoard.tasks}
                    readOnly
                    allowDrag={canEditProjectTasks}
                    boardPositionMode
                    onTaskUpdate={whenTasksEditable(handleMoveProjectBoardTask)}
                    onTaskClick={(task) => { setEditingTask(task); setTaskDialogOpen(true); }}
                  />
                )
              ) : activeProjectTab === 'gantt' ? (
                projectGanttQuery.isLoading ? (
                  <ProjectGanttState title="Loading project Gantt" message="Fetching this project's scheduled tasks…" isLoading />
                ) : projectGanttQuery.isError ? (
                  <ProjectGanttState title="Project Gantt could not load" message="We could not load the Gantt data for this project. Please try again." onRetry={retryProjectGantt} />
                ) : projectGanttTasks.length === 0 ? (
                  <ProjectGanttState title="No scheduled tasks" message="This project does not have tasks with both valid start and finish dates to show in the Gantt view." />
                ) : (
                  <GanttChart
                    tasks={projectGanttTasks}
                    project={projectDetail}
                    enableScheduleEditing={canEditProjectTasks}
                    pendingTaskIds={pendingProjectGanttScheduleTaskIds}
                    onTaskScheduleChange={handleUpdateProjectGanttTaskSchedule}
                    enableDependencyEditing={canEditProjectTasks}
                    dependencyPendingTaskIds={pendingProjectGanttDependencyTaskIds}
                    onAddDependency={handleAddProjectGanttTaskPredecessor}
                    onRemoveDependency={handleRemoveProjectGanttTaskPredecessor}
                    expandedTasks={expandedTasks}
                    onToggleExpand={handleToggleExpand}
                  />
                )
              ) : (
                isProjectAuditLoading ? (
                  <ProjectAuditState title="Loading project audit" message="Fetching this project's audit history…" isLoading />
                ) : isProjectAuditError ? (
                  <ProjectAuditState title="Project audit could not load" message="We could not load audit data for this project. Please try again." onRetry={retryProjectAudit} />
                ) : projectAuditTimeline.length === 0 ? (
                  <ProjectAuditState title="No audit entries" message="This project does not have audit or activity entries to show yet." />
                ) : (
                  <AuditView auditEntries={projectAuditTimeline} />
                )
              )}
            </>
          )
        ) : hasPortfolioRoute ? (
          !hasValidPortfolioRoute ? (
            <PortfolioState title="Invalid portfolio link" message="This portfolio URL is not a valid Project Hub UUID." />
          ) : isPortfolioRouteLoading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
          ) : isPortfolioRouteError || !portfolioDetail ? (
            <PortfolioState title="Portfolio not found" message="We could not load this portfolio. It may have been removed or you may not have access." onRetry={retryPortfolioRoute} />
          ) : (
            <PortfolioDetailView
              portfolio={portfolioDetail}
              programs={routePortfolioPrograms}
              projects={[]}
              risks={[]}
              issues={[]}
              onSelectProgram={() => {}}
              onSelectProject={() => {}}
              onEditItem={(item, type) => { setEditingProject(item); setDialogType(type); setProjectDialogOpen(true); }}
              onNewProject={() => {}}
              onNewProgram={() => {}}
              onRenameItem={handleRenameItem}
              onBackToDirectory={() => navigate('/Projects')}
            />
          )
        ) : hasProgramRoute ? (
          !hasValidProgramRoute ? (
            <PortfolioState title="Invalid program link" message="This program URL is not a valid Project Hub UUID." />
          ) : isProgramRouteLoading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
          ) : isProgramRouteError || !programDetail ? (
            <PortfolioState title="Program not found" message="We could not load this program. It may have been removed or you may not have access." onRetry={retryProgramRoute} />
          ) : (
            <ProgramDetailView
              program={programDetail}
              projects={routeProgramProjects}
              portfolios={portfolios}
              risks={[]}
              issues={[]}
              onSelectProject={p => navigate(`/projects/${p.id}/sheet`)}
              onEditItem={(item, type) => { setEditingProject(item); setDialogType(type); setProjectDialogOpen(true); }}
              onNewProject={(nextProgramId) => { setEditingProject({ program_id: nextProgramId, portfolio_id: programDetail.portfolio_id }); setDialogType('project'); setProjectDialogOpen(true); }}
              onRenameItem={handleRenameItem}
              onUpdateProject={() => queryClient.invalidateQueries({ queryKey: ['program-projects', programId] })}
              onBackToInventory={() => navigate('/Projects?view=all_programs')}
            />
          )
        ) : viewMode === 'all_portfolios' ? (
          !selectedAccountId ? (
            <PortfolioState title="No account selected" message="Select an account to load portfolios." />
          ) : accountPortfoliosError ? (
            <PortfolioState title="Portfolios could not load" message="We could not load portfolios for this account." onRetry={refetchAccountPortfolios} />
          ) : (
          <PortfolioLanding
            portfolios={portfolios}
            programs={programs}
            projects={projects}
            risks={risks}
            issues={issues}
            onNewPortfolio={handleNewPortfolio}
            onSelectPortfolio={p => navigate(`/portfolios/${p.id}`)}
          />
          )
        ) : viewMode === 'all_programs' ? (
          !selectedAccountId ? (
            <PortfolioState title="No account selected" message="Select an account to load programs." />
          ) : accountProgramsProjectsError ? (
            <PortfolioState title="Programs could not load" message="We could not load programs for this account." onRetry={refetchAccountProgramsProjects} />
          ) : loadingAccountProgramsProjects ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
          ) : (
          <ProgramsLanding
            programs={programs}
            projects={projects}
            portfolios={portfolios}
            risks={risks}
            issues={issues}
            onNewProgram={handleNewProgram}
            onSelectProgram={p => handleSelectItem(p, 'program')}
          />
          )
        ) : viewMode === 'all_projects' ? (
          <ProjectsSummary
            projects={projects}
            programs={programs}
            portfolios={portfolios}
            tasks={accountTasks}
            onSelectProject={(p) => handleSelectItem(p, 'project')}
            onNewProject={() => { setEditingProject({}); setDialogType('project'); setProjectDialogOpen(true); }}
          />
        ) : viewMode === 'all_raid' ? (
          <RAIDSummary
            risks={risks}
            issues={issues}
            assumptions={assumptions}
            decisions={decisions}
            projects={projects}
          />
        ) : viewMode === 'templates' ? (
          <TemplatesView />
        ) : viewMode === 'all_resource_mgmt' ? (
          <div />
        ) : viewMode === 'delivery' ? (
          <DeliverySummary projects={projects} programs={programs} portfolios={portfolios} onNavigateToSprints={() => handleSelectItem({ id: 'sprints' }, 'sprints')} />
        ) : viewMode === 'test_cases' ? (
          <TestCaseView />
        ) : viewMode === 'sprints' ? (
          <SprintView projects={projects} programs={programs} portfolios={portfolios} resources={resources} />
        ) : viewMode === 'portfolio' && selectedItem ? (
          <PortfolioDetailView
            portfolio={selectedItem}
            programs={programs}
            projects={projects}
            risks={risks}
            issues={issues}
            onSelectProgram={p => handleSelectItem(p, 'program')}
            onSelectProject={p => handleSelectItem(p, 'project')}
            onEditItem={(item, type) => { setEditingProject(item); setDialogType(type); setProjectDialogOpen(true); }}
            onNewProject={(programId) => { setEditingProject({ program_id: programId }); setDialogType('project'); setProjectDialogOpen(true); }}
            onNewProgram={(portfolioId) => { setEditingProject({ portfolio_id: portfolioId }); setDialogType('program'); setProjectDialogOpen(true); }}
            onRenameItem={handleRenameItem}
            onDeletePortfolio={(port) => { handleDeleteItem(port, 'portfolio'); setSelectedItem(null); setViewMode('all_portfolios'); }}
            onDeleteProject={(id) => handleDeleteItem({ id }, 'project')}
            onBackToDirectory={() => { setSelectedItem(null); setViewMode('all_portfolios'); }}
          />
        ) : viewMode === 'program' && selectedItem ? (
          <ProgramDetailView
            program={selectedItem}
            projects={projects}
            portfolios={portfolios}
            risks={risks}
            issues={issues}
            onSelectProject={p => handleSelectItem(p, 'project')}
            onEditItem={(item, type) => { setEditingProject(item); setDialogType(type); setProjectDialogOpen(true); }}
            onNewProject={(programId) => { setEditingProject({ program_id: programId }); setDialogType('project'); setProjectDialogOpen(true); }}
            onRenameItem={handleRenameItem}
            onUpdateProject={() => invalidateHierarchy(queryClient)}
            onDeleteProgram={(prog) => { handleDeleteItem(prog, 'program'); setSelectedItem(null); setViewMode('all_portfolios'); }}
            onDeleteProject={(id) => handleDeleteItem({ id }, 'project')}
            onBackToInventory={() => { setSelectedItem(null); setViewMode('all_programs'); }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">No project selected</h2>
              <p>Create a new project to get started</p>
            </div>
          </div>
        )}
      </div>

      {taskDialogOpen && editingTask && (
        <TaskDetailPanel
          task={editingTask}
          resources={resources}
          onClose={() => { setTaskDialogOpen(false); setEditingTask(null); clearFocusTaskParam(); }}
          onUpdate={(id, data) => {
            if (hasProjectRoute && !canEditProjectTasks) return;
            updateTask.mutate({ id, data }, { onSuccess: () => { if (hasProjectRoute) invalidateProjectTaskWorkspaces(); } });
          }}
        />
      )}

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={editingProject}
        onSave={handleSaveProject}
        onDelete={dialogType === 'portfolio' || dialogType === 'program' || (hasProjectRoute && dialogType === 'project') ? undefined : () => {
          if (editingProject && dialogType === 'portfolio') {
            handleDeleteItem(editingProject, 'portfolio');
            setSelectedItem(null); setViewMode('all_portfolios');
          } else if (editingProject && dialogType === 'program') {
            handleDeleteItem(editingProject, 'program');
            setSelectedItem(null); setViewMode('all_portfolios');
          } else if (editingProject && dialogType === 'project') {
            handleDeleteItem(editingProject, 'project');
            setSelectedItem(null); setViewMode('all_projects');
          }
        }}
        type={dialogType}
        programs={programs}
        portfolios={portfolios}
      />

      <ResourceCalendar
        open={vacationCalendarOpen}
        onOpenChange={setVacationCalendarOpen}
      />

      <AIAssistantWidget hidden={Boolean(taskDialogOpen && editingTask)} />
    </div>
  );
}