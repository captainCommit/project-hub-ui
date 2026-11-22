import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourcesApi } from '@/api/resources';
import { accountsApi } from '@/api/accounts';
import { toast, toastError } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { confirmAction } from '@/components/ui/confirm-dialog';
import {
  Plus, Users, X, ArrowUp, ArrowDown, ArrowUpDown, BarChart2, BarChart3, Lightbulb,
  AlertTriangle, Info, ChevronRight, Search, RotateCcw, Pencil, UserMinus, Settings2,
} from 'lucide-react';
import InfoTip from '@/components/projects/InfoTip';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { ALLOCATION_OVERRIDES_KEY, useAccountHierarchy, useAccountTasks, useAllocationOverrides } from '@/hooks/useAccountLookups';
import { useGlobalScope } from '@/lib/globalScope';
import { useMyAccess } from '@/hooks/useMyAccess';
import {
  FilterBar, SearchInput, FilterSelect, optionsFrom, ExportButton, PrimaryButton, DataTable, DetailsChevron, StatGrid, Pill,
  NAVY, MUTED, TONES,
} from '@/components/projects/DirectoryKit';
import {
  computeResourceWeekly, allocationPct, healthOf, HEALTH, HEALTH_ORDER, HEALTH_OPTIONS, EMPTY_RESOURCE_SCOPE,
  scopedProjectIds, namesInProjects, ResourceScopeSelects, PersonLine,
} from '@/components/resources/ResourceKit';
import AddResourceDialog from '@/components/resources/AddResourceDialog';

const CARD = 'bg-white rounded-xl border border-[#E6ECF4]';
const PROJECT_TONES = ['blue', 'amber', 'green', 'purple'];

/** Overview stat card: a tinted round icon, the label, the number and a muted line. */
function ToneStat({ icon: Icon, tone, label, value, sub, valueColor = NAVY }) {
  const t = TONES[tone];
  return (
    <div className={`${CARD} px-5 py-4 flex items-start gap-4 min-w-0`}>
      <span className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.bg }}>
        <Icon className="w-5 h-5" style={{ color: t.fg }} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold" style={{ color: NAVY }}>{label}</p>
        <p className="text-[28px] font-bold leading-tight" style={{ color: valueColor }}>{value}</p>
        <p className="text-xs" style={{ color: MUTED }}>{sub}</p>
      </div>
    </div>
  );
}

function InsightRow({ icon: Icon, tone, title, sub, onClick }) {
  const t = TONES[tone];
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 border-t border-slate-100 first:border-t-0">
      <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.bg }}>
        <Icon className="w-4 h-4" style={{ color: t.fg }} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: NAVY }}>{title}</p>
        <p className="text-xs" style={{ color: MUTED }}>{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </button>
  );
}

function AllocationCell({ pct }) {
  const health = healthOf(pct);
  if (pct === null) return <span className="text-xs" style={{ color: MUTED }}>No capacity</span>;
  return (
    <div className="flex items-center gap-3 min-w-[170px]">
      <span className="text-sm font-semibold w-11" style={{ color: health.color }}>{pct}%</span>
      <div className="w-[110px] h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#EAF0F6' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: health.color }} />
      </div>
    </div>
  );
}

const hrs = (hours) => `${(Number(hours) || 0).toFixed(1)} hrs`;
const fixed1 = (hours) => (Number(hours) || 0).toFixed(1);

/** An hours box that saves when it loses focus (or on Enter). Read-only text when editing isn't allowed. */
function HoursInput({ value, onCommit, label, highlighted = false, editable = true }) {
  if (!editable) return <span className="font-semibold" style={{ color: NAVY }}>{fixed1(value)}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <input key={fixed1(value)} type="number" min={0} step="0.1" defaultValue={fixed1(value)} aria-label={label}
        onBlur={e => onCommit(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className={`h-7 w-16 text-xs font-semibold text-right rounded-md border px-2 focus:outline-none focus:ring-1 focus:ring-slate-400 ${highlighted ? 'border-[#E8711A] bg-orange-50' : 'border-slate-200'}`}
        style={{ color: NAVY }} />
      <Pencil className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} aria-hidden />
    </span>
  );
}

/**
 * The tray on the Capacity tab: one person's weekly hours per project (pulled from their tasks, overridable for
 * planning) and their non-project time. Opens when their row is clicked.
 */
function AllocationPanel({ resource, weekly, canEdit, canDelete, onSet, onReset, onSetNonProject, onEditAssignments, onRemove, onClose }) {
  const derivedTotal = weekly.projects.reduce((s, p) => s + p.derived, 0);
  const anyOverride = weekly.projects.some(p => p.overridden);
  const capacity = Number(resource.weekly_capacity) || 0;
  const utilization = allocationPct(weekly.weekly, capacity);
  const parse = (text) => {
    const value = String(text).trim() === '' ? null : Number(text);
    return value !== null && (!Number.isFinite(value) || value < 0) ? undefined : value;
  };
  const commitProject = (project, text) => {
    const value = parse(text);
    if (value === undefined) return;
    // Typing the task-derived figure (or clearing the box) removes the override.
    if (value === null || Math.abs(value - project.derived) < 0.05) { if (project.overridden) onSet(project.id, null); return; }
    if (Math.abs(value - project.weekly) >= 0.05) onSet(project.id, value);
  };
  const commitNonProject = (text) => {
    const parsed = parse(text);
    if (parsed === undefined) return;
    const value = parsed ?? 0;
    if (Math.abs(value - weekly.nonProject) >= 0.005) onSetNonProject(value);
  };
  const subtitle = [resource.role, resource.department].filter(Boolean).join(' · ');

  return (
    <aside className="w-[420px] 2xl:w-[480px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      <div className="flex items-start gap-3 px-5 pt-5 pb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate" style={{ color: NAVY }}>{resource.full_name}</h2>
          <p className="text-sm" style={{ color: MUTED }}>{subtitle || 'No job title set'}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5" style={{ color: NAVY }} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-[13px]" style={{ color: NAVY }}>
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Allocations are pulled from project tasks the resource is assigned to. {canEdit ? 'You can override the hours for a project or the non-project allocation if needed.' : ''}</span>
        </div>

        <h3 className="text-base font-bold" style={{ color: NAVY }}>Allocation Details</h3>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50" style={{ color: NAVY }}>
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Project / Allocation</th>
                <th className="text-center px-2 py-2 font-semibold whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">Task-Derived <InfoTip className="w-3.5 h-3.5">Task hours spread evenly over the length of the project.</InfoTip></span>
                  <span className="block text-[11px] font-normal" style={{ color: MUTED }}>hrs/wk</span>
                </th>
                <th className="text-center px-2 py-2 font-semibold whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">Allocated <InfoTip className="w-3.5 h-3.5">The hours to plan with. Starts at the task-derived figure; change it to override.</InfoTip></span>
                  <span className="block text-[11px] font-normal" style={{ color: MUTED }}>hrs/wk</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {weekly.projects.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-xs" style={{ color: MUTED }}>Not assigned to any project yet.</td></tr>
              )}
              {weekly.projects.map(p => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2" style={{ color: NAVY }}>{p.name}</td>
                  <td className="px-2 py-2 text-center" style={{ color: MUTED }}>{fixed1(p.derived)}</td>
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    <HoursInput value={p.weekly} onCommit={text => commitProject(p, text)} label={`Allocated hours for ${p.name}`}
                      highlighted={p.overridden} editable={canEdit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          <div className="flex items-center justify-between px-3 py-3">
            <span className="text-sm font-semibold" style={{ color: NAVY }}>Project Allocation</span>
            <span className="text-sm font-bold" style={{ color: NAVY }}>{hrs(weekly.projectWeekly)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-3">
            <span>
              <span className="block text-sm font-semibold" style={{ color: NAVY }}>Non-Project Allocation</span>
              <span className="block text-xs" style={{ color: MUTED }}>Meetings, admin, training, etc.</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <HoursInput value={weekly.nonProject} onCommit={commitNonProject} label="Non-project hours" editable={canEdit} />
              <span style={{ color: MUTED }}>hrs</span>
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-3 rounded-b-lg" style={{ backgroundColor: '#FFF4EA' }}>
            <span className="text-sm font-bold" style={{ color: NAVY }}>Total Allocation <span className="font-normal text-xs" style={{ color: MUTED }}>(Project + Non-Project)</span></span>
            <span className="text-base font-bold" style={{ color: NAVY }}>{hrs(weekly.weekly)}</span>
          </div>
        </div>
        <p className="text-xs" style={{ color: MUTED }}>
          Weekly capacity {capacity ? hrs(capacity) : 'not set'}{utilization !== null && <> · <span className="font-semibold" style={{ color: healthOf(utilization).color }}>{utilization}% utilized</span></>}
        </p>

        {(canEdit || canDelete) && (
          <div className="flex flex-col items-start gap-2 pt-2 border-t border-slate-100">
            {canEdit && (
              <button type="button" disabled={!anyOverride} onClick={onReset}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium disabled:opacity-40 enabled:hover:underline" style={{ color: NAVY }}>
                <RotateCcw className="w-3.5 h-3.5" /> Reset project hours to task-derived ({hrs(derivedTotal)})
              </button>
            )}
            {canEdit && (
              <button type="button" onClick={onEditAssignments} className="inline-flex items-center gap-1.5 text-[13px] font-medium hover:underline" style={{ color: NAVY }}>
                <Settings2 className="w-3.5 h-3.5" /> Edit capacity and assignments
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-red-600 hover:underline">
                <UserMinus className="w-3.5 h-3.5" /> Remove from Resources
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// section: 'overview' (allocation summary), 'capacity' (resource directory) or 'all'.
// scope / onScopeChange: the page filters, kept by the Resources page so they carry across its tabs.
// onOpenCapacity({ health?, search? }): the Overview's way into the Capacity tab, pre-filtered.
// initialHealth / initialSearch: what the Capacity tab opens filtered to.
export default function ProjectResources({
  embedded = false, section = 'all', scope: scopeProp = undefined, onScopeChange = undefined, onOpenCapacity = undefined,
  initialHealth = '', initialSearch = '',
}) {
  const showOverview = section !== 'capacity';
  const showCapacity = section !== 'overview';
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();
  const { can } = useMyAccess();
  const canCreate = can('RESOURCES', 'CREATE');
  const canEdit = can('RESOURCES', 'EDIT');
  const canDelete = can('RESOURCES', 'DELETE');

  const [ownScope, setOwnScope] = useState(EMPTY_RESOURCE_SCOPE);
  const scope = scopeProp || ownScope;
  const setScope = onScopeChange || setOwnScope;
  const [department, setDepartment] = useState('');
  // Overview table
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewShow, setOverviewShow] = useState('');
  // Capacity directory
  const [nameFilter, setNameFilter] = useState(initialSearch);
  const [healthFilter, setHealthFilter] = useState(initialHealth);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  // The Capacity table shows allocation as hours or as a share of the person's week.
  const [allocationMode, setAllocationMode] = useState('hours');
  const [panelResourceId, setPanelResourceId] = useState(null);
  // The Add Resource modal: 'add', or the resource whose assignments are being edited.
  const [dialog, setDialog] = useState(null);

  const {
    data: allResources = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['account-resources', selectedAccountId],
    queryFn: () => resourcesApi.listAccountResources(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });
  // Every member comes back (for people pickers elsewhere); the Resources pages show the ones added here.
  const resources = useMemo(() => allResources.filter(r => r.listed), [allResources]);
  // A person's load counts all their work (projects); the global scope and page filters narrow who is listed.
  const hierarchy = useAccountHierarchy();
  const { projects } = hierarchy;
  const { active: scopeActive, scopeHierarchy } = useGlobalScope();
  const { projects: inScopeProjects, programs, portfolios } = scopeHierarchy(hierarchy);
  const { tasks: allTasks } = useAccountTasks();

  const invalidateResources = () => {
    queryClient.invalidateQueries({ queryKey: ['account-resources', selectedAccountId] });
    queryClient.invalidateQueries({ queryKey: [ALLOCATION_OVERRIDES_KEY, selectedAccountId] });
  };

  // Account members, for picking who to add (name, job title and department come from their profile).
  const { data: accountUsers = [] } = useQuery({
    queryKey: ['account-members', selectedAccountId],
    queryFn: () => accountsApi.listMembers(selectedAccountId),
    enabled: Boolean(selectedAccountId) && showCapacity && canCreate,
  });
  const candidates = useMemo(() => {
    const onResources = new Set(resources.filter(r => r.user_id).map(r => r.user_id));
    return accountUsers.filter(u => u.is_active !== false && !onResources.has(u.id));
  }, [accountUsers, resources]);

  const create = useMutation({
    mutationFn: d => resourcesApi.createResource(selectedAccountId, d),
    onSuccess: (resource) => {
      invalidateResources();
      setDialog(null);
      toast({ title: 'Resource added', description: `${resource?.full_name || 'They'} ${resource?.full_name ? 'is' : 'are'} now on Resources.` });
    },
    onError: (error) => toastError(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => resourcesApi.updateResource(id, data),
    onSuccess: () => { invalidateResources(); setDialog(null); },
    onError: (error) => toastError(error.message),
  });
  const remove = useMutation({
    mutationFn: id => resourcesApi.deleteResource(id),
    onSuccess: () => { setPanelResourceId(null); invalidateResources(); },
    onError: (error) => toastError(error.message),
  });

  const allocationOverrides = useAllocationOverrides();
  const resourceWeekly = useMemo(() => computeResourceWeekly(resources, allTasks, projects, allocationOverrides), [resources, allTasks, projects, allocationOverrides]);
  const refreshOverrides = () => queryClient.invalidateQueries({ queryKey: [ALLOCATION_OVERRIDES_KEY, selectedAccountId] });
  const setProjectAllocation = useMutation({
    mutationFn: ({ resourceId, projectId, hours }) => resourcesApi.setProjectAllocation(resourceId, projectId, hours),
    onSuccess: refreshOverrides,
    onError: (error) => toastError(error.message),
  });
  const resetProjectAllocations = useMutation({
    mutationFn: (resourceId) => resourcesApi.resetProjectAllocations(resourceId),
    onSuccess: refreshOverrides,
    onError: (error) => toastError(error.message),
  });
  const pctOf = (r) => allocationPct(resourceWeekly[r.full_name]?.weekly, r.weekly_capacity);

  // Page filters: who works in (or is assigned to) the chosen portfolio / program / project, and their department.
  const namesInScope = useMemo(
    () => namesInProjects(allTasks, scopedProjectIds(scope, inScopeProjects, scopeActive), resources),
    [allTasks, scope, inScopeProjects, scopeActive, resources],
  );
  const scopedResources = useMemo(() => resources.filter(r => {
    if (namesInScope && !namesInScope.has(r.full_name)) return false;
    if (department && (r.department || '') !== department) return false;
    return true;
  }), [resources, namesInScope, department]);
  const departments = optionsFrom(resources.map(r => r.department));

  const stats = useMemo(() => {
    const counts = { over: 0, under: 0, optimal: 0, unassigned: 0 };
    let sum = 0, withCapacity = 0;
    scopedResources.forEach(r => {
      const pct = pctOf(r);
      counts[healthOf(pct).key]++;
      if (pct !== null) { sum += pct; withCapacity++; }
    });
    return { total: scopedResources.length, counts, avg: withCapacity ? Math.round(sum / withCapacity) : 0 };
  }, [scopedResources, resourceWeekly]);

  const overviewRows = useMemo(() => {
    const q = overviewSearch.trim().toLowerCase();
    return scopedResources.filter(r => {
      if (q && !(r.full_name || '').toLowerCase().includes(q) && !(r.role || '').toLowerCase().includes(q)) return false;
      if (overviewShow && healthOf(pctOf(r)).key !== overviewShow) return false;
      return true;
    });
  }, [scopedResources, overviewSearch, overviewShow, resourceWeekly]);

  const dirResources = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    let list = scopedResources.filter(r => {
      if (q && !(r.full_name || '').toLowerCase().includes(q) && !(r.role || '').toLowerCase().includes(q)) return false;
      if (healthFilter && healthOf(pctOf(r)).key !== healthFilter) return false;
      return true;
    });
    if (sortKey) {
      list = [...list].sort((a, b) => {
        let av, bv;
        if (sortKey === 'weekly_allocation') {
          av = resourceWeekly[a.full_name]?.weekly ?? 0;
          bv = resourceWeekly[b.full_name]?.weekly ?? 0;
        } else if (sortKey === 'project_allocation') {
          av = resourceWeekly[a.full_name]?.projectWeekly ?? 0;
          bv = resourceWeekly[b.full_name]?.projectWeekly ?? 0;
        } else if (sortKey === 'allocation') {
          av = pctOf(a) ?? -1; bv = pctOf(b) ?? -1;
        } else if (sortKey === 'health') {
          av = HEALTH_ORDER.indexOf(healthOf(pctOf(a)).key); bv = HEALTH_ORDER.indexOf(healthOf(pctOf(b)).key);
        } else {
          av = a[sortKey] ?? ''; bv = b[sortKey] ?? '';
        }
        if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return list;
  }, [scopedResources, nameFilter, healthFilter, sortKey, sortDir, resourceWeekly]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const SortIcon = ({ col }) => {
    const click = (e) => { e.stopPropagation(); toggleSort(col); };
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300 cursor-pointer" onClick={click} />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-white cursor-pointer" onClick={click} />
      : <ArrowDown className="w-3 h-3 text-white cursor-pointer" onClick={click} />;
  };

  const exportToCSV = (list) => {
    const rows = [['Full Name', 'Role', 'Department', 'Weekly Capacity', 'Weekly Allocation', '% Allocation', 'Health', 'Assigned Projects', 'Non Project work'], ...list.map(r => {
      const rw = resourceWeekly[r.full_name] || { projects: [], weekly: 0 };
      const ap = rw.projects.map(p => `${p.name} [${p.weekly.toFixed(1)}h/wk]`).join('; ');
      const pct = pctOf(r);
      return [r.full_name, r.role || '', r.department || '', r.weekly_capacity != null ? `${r.weekly_capacity} hrs` : '', rw.weekly > 0 ? `${rw.weekly.toFixed(1)} hrs` : '', pct != null ? `${pct}%` : '', healthOf(pct).label, ap, r.non_project_hours != null ? `${r.non_project_hours} hrs` : ''];
    })];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'resource_utilization.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const shownAllocation = (hours, capacity) => {
    if (allocationMode === 'hours') return hrs(hours);
    const cap = Number(capacity) || 0;
    return cap ? `${Math.round((Number(hours) || 0) / cap * 100)}%` : '—';
  };
  const openCapacity = (filter) => {
    if (onOpenCapacity) onOpenCapacity(filter);
  };
  const submitDialog = (values) => {
    if (dialog === 'add') create.mutate(values);
    else if (dialog) update.mutate({ id: dialog.id, data: values });
  };
  const removeResource = async (resource) => {
    const ok = await confirmAction({
      title: `Remove ${resource.full_name} from Resources?`,
      description: 'Their project assignments and hour overrides go too, along with any access those assignments gave them. Their tasks are not changed.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) remove.mutate(resource.id);
  };

  const overviewColumns = [
    { key: 'name', label: 'Resource', sortValue: r => r.full_name, render: r => <PersonLine name={r.full_name} /> },
    { key: 'role', label: 'Role', sortValue: r => r.role, render: r => <span className="text-sm text-slate-600">{r.role || '—'}</span> },
    { key: 'department', label: 'Department', sortValue: r => r.department, render: r => <span className="text-sm text-slate-600">{r.department || '—'}</span> },
    { key: 'total', label: 'Total Allocation', sortValue: r => pctOf(r) ?? -1, render: r => <AllocationCell pct={pctOf(r)} /> },
    {
      key: 'projects', label: 'Project Allocation', render: r => {
        const rw = resourceWeekly[r.full_name] || { projects: [] };
        const cap = Number(r.weekly_capacity) || 0;
        if (!rw.projects.length) return <span className="text-xs" style={{ color: MUTED }}>No project work</span>;
        return (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {rw.projects.slice(0, 3).map((p, i) => (
              <span key={p.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                <Pill tone={PROJECT_TONES[i % PROJECT_TONES.length]} className="px-2">{cap ? `${Math.round(p.weekly / cap * 100)}%` : `${p.weekly.toFixed(1)}h`}</Pill>
                {p.name}
              </span>
            ))}
            {rw.projects.length > 3 && <span className="text-xs" style={{ color: MUTED }}>+{rw.projects.length - 3} more</span>}
          </div>
        );
      },
    },
    { key: 'open', label: '', className: 'w-8', render: () => <DetailsChevron /> },
  ];

  const scopeFilters = (
    <>
      <ResourceScopeSelects scope={scope} onChange={setScope} portfolios={portfolios} programs={programs} projects={inScopeProjects} />
      <FilterSelect value={department} onChange={setDepartment} allLabel="All Departments" options={departments} />
    </>
  );

  const panelResource = panelResourceId ? resources.find(r => r.id === panelResourceId) : null;
  // Beside the tray the table drops Department so Utilization stays in view.
  const compactTable = Boolean(panelResource);
  const columnCount = compactTable ? 6 : 7;
  const shareOf = (key) => (stats.total ? Math.round(stats.counts[key] / stats.total * 100) : 0);
  const headerCell = (label, col, extra = null) => (
    <th className="text-left px-3 py-3 text-[13px] font-semibold">
      <span className="flex items-center gap-1">{label} {extra} <SortIcon col={col} /></span>
    </th>
  );
  const messageRow = (content, className = 'text-slate-400') => (
    <tr><td colSpan={columnCount} className={`text-center py-10 text-xs ${className}`}>{content}</td></tr>
  );

  return (
    <div className={`flex bg-slate-50 ${embedded ? 'flex-1 overflow-hidden' : 'h-screen'}`} style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {!embedded && (
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      )}

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {!embedded && (
        <div className="bg-white px-6 pt-5 pb-4 border-b border-slate-200 flex-shrink-0">
          <h1 className="text-2xl font-bold text-[#002046]">Resources</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor capacity, allocation, availability and costs across your delivery teams</p>
        </div>
        )}

        <div className="flex-1 overflow-auto px-6 py-5 space-y-4" style={{ backgroundColor: '#F7F9FC' }}>
          {showOverview && (<>
          <FilterBar right={<ExportButton onClick={() => exportToCSV(scopedResources)} disabled={scopedResources.length === 0} />}>
            {scopeFilters}
          </FilterBar>

          <StatGrid className="lg:grid-cols-4">
            <ToneStat icon={Users} tone="blue" label="Total Resources" value={stats.total} sub="Across selected scope" />
            <ToneStat icon={ArrowUp} tone="red" label="Overallocated" value={stats.counts.over} sub="Above 100% capacity" valueColor={TONES.red.fg} />
            <ToneStat icon={ArrowDown} tone="amber" label="Underallocated" value={stats.counts.under} sub="Below target allocation" valueColor={TONES.amber.fg} />
            <ToneStat icon={BarChart2} tone="blue" label="Average Utilization" value={`${stats.avg}%`} sub="Across selected resources" />
          </StatGrid>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className={`${CARD} p-5 lg:col-span-2`}>
              <div className="flex items-center gap-3 mb-5">
                <BarChart3 className="w-5 h-5" style={{ color: NAVY }} />
                <h2 className="text-base font-bold flex-1" style={{ color: NAVY }}>Overall Resource Allocation</h2>
                <span className="text-xs" style={{ color: MUTED }}>Total resources: {stats.total}</span>
              </div>
              <div className="flex h-5 rounded-full overflow-hidden bg-slate-100">
                {stats.total > 0 && HEALTH_ORDER.filter(k => stats.counts[k] > 0).map(k => (
                  <div key={k} style={{ width: `${stats.counts[k] / stats.total * 100}%`, backgroundColor: HEALTH[k].color }} title={`${HEALTH[k].label}: ${stats.counts[k]}`} />
                ))}
              </div>
              <div className="flex mt-2">
                {stats.total > 0 && HEALTH_ORDER.filter(k => stats.counts[k] > 0).map(k => (
                  <span key={k} className="text-xs text-center" style={{ width: `${stats.counts[k] / stats.total * 100}%`, color: MUTED }}>{shareOf(k)}%</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-xs" style={{ color: MUTED }}>
                {HEALTH_ORDER.map(k => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: HEALTH[k].color }} />{HEALTH[k].legend}
                  </span>
                ))}
              </div>
            </div>

            <div className={`${CARD} overflow-hidden`}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <Lightbulb className="w-5 h-5" style={{ color: NAVY }} />
                <h2 className="text-base font-bold" style={{ color: NAVY }}>Key Insights</h2>
              </div>
              <InsightRow icon={AlertTriangle} tone="red"
                title={`${stats.counts.over} resource${stats.counts.over === 1 ? ' is' : 's are'} overallocated`}
                sub="Review assignments exceeding capacity." onClick={() => openCapacity({ health: 'over' })} />
              <InsightRow icon={AlertTriangle} tone="amber"
                title={`${stats.counts.under} resource${stats.counts.under === 1 ? ' is' : 's are'} underallocated`}
                sub="Check if capacity can be reassigned." onClick={() => openCapacity({ health: 'under' })} />
              <InsightRow icon={Info} tone="blue"
                title={`Average utilization is ${stats.avg}%`}
                sub="Across selected resources." onClick={() => openCapacity({})} />
            </div>
          </div>

          <div className={`${CARD} p-5 space-y-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 mt-0.5" style={{ color: NAVY }} />
                <div>
                  <h2 className="text-base font-bold" style={{ color: NAVY }}>Resource Allocation</h2>
                  <p className="text-xs" style={{ color: MUTED }}>See how each resource is allocated across projects.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SearchInput value={overviewSearch} onChange={setOverviewSearch} placeholder="Search resources..." className="min-w-[200px]" />
                <span className="text-sm" style={{ color: MUTED }}>Show</span>
                <FilterSelect value={overviewShow} onChange={setOverviewShow} allLabel="All resources" options={HEALTH_OPTIONS} />
              </div>
            </div>
            <DataTable
              columns={overviewColumns}
              rows={overviewRows}
              onRowClick={r => openCapacity({ search: r.full_name })}
              noun="resources"
              empty={resources.length ? 'No resources match your filters.' : 'No resources yet. Add people on the Capacity tab.'}
              dense
            />
          </div>
          </>)}

          {showCapacity && (<>
          <FilterBar>
            <SearchInput value={nameFilter} onChange={setNameFilter} placeholder="Search name or role..." />
            {scopeFilters}
            <FilterSelect value={healthFilter} onChange={setHealthFilter} allLabel="All Health" options={HEALTH_OPTIONS} />
          </FilterBar>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm" style={{ color: MUTED }}>Allocation by</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                {[['hours', 'Hours'], ['percent', 'Percentage']].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setAllocationMode(key)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${allocationMode === key ? 'bg-[#002046] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton onClick={() => exportToCSV(dirResources)} disabled={dirResources.length === 0} />
              {canCreate && (
                <PrimaryButton icon={Plus} disabled={!selectedAccountId} onClick={() => setDialog('add')}>
                  Add Resource
                </PrimaryButton>
              )}
            </div>
          </div>

          <div className={`${CARD} overflow-x-auto`}>
              <table className="w-full text-sm" style={{ minWidth: panelResource ? undefined : '900px' }}>
                <thead className="bg-[#002046] [&_th]:text-white">
                  <tr>
                    <th className="text-left px-4 py-3 text-[13px] font-semibold">
                      <span className="flex items-center gap-1">Resource <SortIcon col="full_name" /></span>
                    </th>
                    {!compactTable && headerCell('Department', 'department')}
                    {headerCell('Weekly Capacity', 'weekly_capacity')}
                    {headerCell('Project Allocation', 'project_allocation',
                      <InfoTip className="w-3.5 h-3.5 text-white/80">Worked out from the person's task hours, unless overridden in the resource details.</InfoTip>)}
                    {headerCell('Non-Project Allocation', 'non_project_hours',
                      <InfoTip className="w-3.5 h-3.5 text-white/80">Time outside projects, such as meetings, support and admin. Set it in the resource details.</InfoTip>)}
                    {headerCell('Total Allocated', 'weekly_allocation')}
                    {headerCell('Utilization', 'allocation')}
                  </tr>
                </thead>
                <tbody>
                  {!selectedAccountId && messageRow('Select an account to view resources.')}
                  {selectedAccountId && isLoading && messageRow('Loading resources...')}
                  {selectedAccountId && isError && messageRow(
                    <div className="flex flex-col items-center gap-2 text-slate-500"><span>{error?.message || 'Unable to load resources.'}</span><Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button></div>, '',
                  )}
                  {selectedAccountId && !isLoading && !isError && resources.length === 0 && messageRow(canCreate ? 'No resources yet. Click "Add Resource" to get started.' : 'No resources to show.')}
                  {selectedAccountId && !isLoading && resources.length > 0 && dirResources.length === 0 && messageRow('No resources match your filters.')}
                  {dirResources.map(r => {
                    const rw = resourceWeekly[r.full_name] || { projects: [], weekly: 0, projectWeekly: 0, nonProject: 0 };
                    const pctAlloc = pctOf(r);
                    return (
                      <tr key={r.id} onClick={() => setPanelResourceId(r.id)}
                        className={`border-b border-slate-100 cursor-pointer ${panelResourceId === r.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold" style={{ color: NAVY }}>{r.full_name}</p>
                          <p className="text-xs text-slate-400">{r.role || 'No job title set'}</p>
                        </td>
                        {!compactTable && <td className="px-3 py-2.5 text-slate-600">{r.department || '—'}</td>}
                        <td className="px-3 py-2.5 text-slate-600">{r.weekly_capacity != null ? `${r.weekly_capacity} hrs` : '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2">
                            <span>
                              <span className="block font-medium" style={{ color: NAVY }}>{shownAllocation(rw.projectWeekly, r.weekly_capacity)}</span>
                              <span className="block text-xs text-slate-400">({rw.projects.length} project{rw.projects.length === 1 ? '' : 's'})</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{shownAllocation(rw.nonProject, r.weekly_capacity)}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{shownAllocation(rw.weekly, r.weekly_capacity)}</td>
                        <td className="px-3 py-2.5 min-w-[96px]">
                          {pctAlloc != null ? (
                            <>
                              <span className="block font-semibold" style={{ color: healthOf(pctAlloc).color }}>{pctAlloc}%</span>
                              <span className="block w-full h-1.5 mt-1 rounded-full overflow-hidden" style={{ backgroundColor: '#EAF0F6' }}>
                                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pctAlloc)}%`, backgroundColor: healthOf(pctAlloc).color }} />
                              </span>
                            </>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          </div>
          <p className="text-xs" style={{ color: MUTED }}>
            <Search className="w-3 h-3 inline mr-1" />Showing {dirResources.length} of {resources.length} resources. Select a resource to see and override their allocation. Health: {HEALTH_ORDER.map(k => HEALTH[k].legend).join(' · ')}.
          </p>
          </>)}

        </div>
      </div>
      {showCapacity && panelResource && (
        <AllocationPanel
          key={panelResource.id}
          resource={panelResource}
          weekly={resourceWeekly[panelResource.full_name] || { projects: [], projectWeekly: 0, weekly: 0, nonProject: 0 }}
          canEdit={canEdit}
          canDelete={canDelete}
          onSet={(projectId, hours) => setProjectAllocation.mutate({ resourceId: panelResource.id, projectId, hours })}
          onReset={() => resetProjectAllocations.mutate(panelResource.id)}
          onSetNonProject={(hours) => update.mutate({ id: panelResource.id, data: { non_project_hours: hours } })}
          onEditAssignments={() => setDialog(panelResource)}
          onRemove={() => removeResource(panelResource)}
          onClose={() => setPanelResourceId(null)}
        />
      )}
      {showCapacity && (
        <AddResourceDialog
          open={Boolean(dialog)}
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          resource={dialog && dialog !== 'add' ? dialog : null}
          candidates={candidates}
          portfolios={hierarchy.portfolios}
          programs={hierarchy.programs}
          projects={hierarchy.projects}
          onSubmit={submitDialog}
          saving={create.isPending || update.isPending}
        />
      )}
    </div>
  );
}
