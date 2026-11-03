import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourcesApi } from '@/api/resources';
import { accountsApi } from '@/api/accounts';
import { toastError } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, Edit2, Users, Check, X, ArrowUp, ArrowDown, ArrowUpDown, BarChart2, BarChart3, Lightbulb,
  AlertTriangle, Info, ChevronRight, Search,
} from 'lucide-react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { useAccountHierarchy, useAccountTasks } from '@/hooks/useAccountLookups';
import { useGlobalScope } from '@/lib/globalScope';
import {
  FilterBar, SearchInput, FilterSelect, optionsFrom, ExportButton, PrimaryButton, DataTable, DetailsChevron, StatGrid, Pill,
  NAVY, MUTED, TONES,
} from '@/components/projects/DirectoryKit';
import {
  computeResourceWeekly, allocationPct, healthOf, HEALTH, HEALTH_ORDER, HEALTH_OPTIONS, EMPTY_RESOURCE_SCOPE,
  scopedProjectIds, namesInProjects, ResourceScopeSelects, PersonLine,
} from '@/components/resources/ResourceKit';

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

function HealthBadge({ pct }) {
  const h = healthOf(pct);
  return <Pill tone={h.tone} dot>{h.label}</Pill>;
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
  const [newRow, setNewRow] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [customColumns, setCustomColumns] = useState(() => {
    try { return JSON.parse(localStorage.getItem('resource_custom_columns') || '[]'); } catch { return []; }
  });

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

  const removeColumn = (key) => {
    const cols = customColumns.filter(c => c.key !== key);
    setCustomColumns(cols);
    try { localStorage.setItem('resource_custom_columns', JSON.stringify(cols)); } catch {}
  };
  const getEditableResourceData = (resource) => {
    const extra = {};
    customColumns.forEach(c => { extra[c.key] = resource[c.key] || ''; });
    return {
      full_name: resource.full_name || resource.name || '',
      rate: resource.rate ?? '',
      weekly_capacity: resource.weekly_capacity ?? resource.capacity ?? '',
      role: resource.role || '',
      department: resource.department || '',
      allocation: resource.allocation ?? resource.utilization ?? '',
      non_project_hours: resource.non_project_hours ?? '',
      user_id: resource.user_id || '',
      ...extra,
    };
  };

  const {
    data: resources = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['account-resources', selectedAccountId],
    queryFn: () => resourcesApi.listAccountResources(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  });
  const { data: resourceDetail } = useQuery({
    queryKey: ['resource-detail', editingId],
    queryFn: () => resourcesApi.getResource(editingId),
    enabled: Boolean(editingId),
  });
  // A person's load counts all their work (projects); the global scope and page filters narrow who is listed.
  const hierarchy = useAccountHierarchy();
  const { projects } = hierarchy;
  const { active: scopeActive, scopeHierarchy } = useGlobalScope();
  const { projects: inScopeProjects, programs, portfolios } = scopeHierarchy(hierarchy);
  const { tasks: allTasks } = useAccountTasks();

  const invalidateResources = (resourceId) => {
    queryClient.invalidateQueries({ queryKey: ['account-resources', selectedAccountId] });
    if (resourceId) queryClient.invalidateQueries({ queryKey: ['resource-detail', resourceId] });
  };

  const create = useMutation({
    mutationFn: d => resourcesApi.createResource(selectedAccountId, d),
    onSuccess: (resource) => {
      invalidateResources(resource?.id);
      setNewRow(null);
    },
    onError: (error) => toastError(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => resourcesApi.updateResource(id, data),
    onSuccess: (_resource, variables) => {
      invalidateResources(variables.id);
      setEditingId(null);
    },
    onError: (error) => toastError(error.message),
  });
  // Account members, for linking a resource to someone's login (their assigned work then counts as theirs).
  const { data: accountUsers = [] } = useQuery({
    queryKey: ['account-members', selectedAccountId],
    queryFn: () => accountsApi.listMembers(selectedAccountId),
    enabled: Boolean(selectedAccountId) && showCapacity,
  });
  const userLabel = (user) => user?.full_name || user?.email || 'Unknown user';
  const LinkedUserSelect = ({ value, resourceId = undefined, onChange }) => {
    // People already linked to another resource can't be picked again.
    const taken = new Set(resources.filter(r => r.id !== resourceId && r.user_id).map(r => r.user_id));
    return (
      <Select value={value || 'none'} onValueChange={v => onChange(v === 'none' ? '' : v)}>
        <SelectTrigger className="h-7 text-xs bg-white" title="The login this resource belongs to; work assigned to the resource counts as theirs">
          <SelectValue placeholder="Not linked" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Login: not linked</SelectItem>
          {accountUsers.filter(u => !taken.has(u.id) || u.id === value).map(u => (
            <SelectItem key={u.id} value={u.id}>Login: {userLabel(u)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };
  const remove = useMutation({
    mutationFn: id => resourcesApi.deleteResource(id),
    onSuccess: (_result, resourceId) => invalidateResources(resourceId),
  });

  useEffect(() => {
    if (resourceDetail && editingId) setEditData(getEditableResourceData(resourceDetail));
  }, [resourceDetail, editingId]);

  const resourceWeekly = useMemo(() => computeResourceWeekly(resources, allTasks, projects), [resources, allTasks, projects]);
  const pctOf = (r) => allocationPct(resourceWeekly[r.full_name]?.weekly, r.weekly_capacity);

  // Page filters: who has work in the chosen portfolio / program / project, and their department.
  const namesInScope = useMemo(
    () => namesInProjects(allTasks, scopedProjectIds(scope, inScopeProjects, scopeActive)),
    [allTasks, scope, inScopeProjects, scopeActive],
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
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300 cursor-pointer" onClick={() => toggleSort(col)} />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-white cursor-pointer" onClick={() => toggleSort(col)} />
      : <ArrowDown className="w-3 h-3 text-white cursor-pointer" onClick={() => toggleSort(col)} />;
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

  const handleSaveNew = () => { if (!selectedAccountId || !newRow?.full_name?.trim()) return; create.mutate(newRow); };
  const handleStartEdit = (r) => { setEditingId(r.id); setEditData(getEditableResourceData(r)); };
  const handleSaveEdit = () => { if (!editData.full_name?.trim()) return; update.mutate({ id: editingId, data: editData }); };
  const saveNonProjectHours = (r, val) => {
    const num = val === '' ? null : Number(val);
    if ((r.non_project_hours ?? null) === num) return;
    update.mutate({ id: r.id, data: { non_project_hours: num } });
  };
  const openCapacity = (filter) => {
    if (onOpenCapacity) onOpenCapacity(filter);
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

  const shareOf = (key) => (stats.total ? Math.round(stats.counts[key] / stats.total * 100) : 0);

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

      <div className="flex-1 flex flex-col overflow-hidden">
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
                  <h2 className="text-base font-bold" style={{ color: NAVY }}>Resource Allocation by Resource</h2>
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
          <FilterBar right={<>
            <ExportButton onClick={() => exportToCSV(dirResources)} disabled={dirResources.length === 0} />
            <PrimaryButton icon={Plus} disabled={!selectedAccountId} onClick={() => setNewRow({ full_name: '', rate: '', weekly_capacity: '', role: '', department: '', allocation: '', non_project_hours: '' })}>
              New Resource
            </PrimaryButton>
          </>}>
            <SearchInput value={nameFilter} onChange={setNameFilter} placeholder="Search name or role..." />
            {scopeFilters}
            <FilterSelect value={healthFilter} onChange={setHealthFilter} allLabel="All Health" options={HEALTH_OPTIONS} />
          </FilterBar>

          <div className={`${CARD} overflow-x-auto`}>
              <table className="w-full text-sm" style={{ minWidth: '1000px' }}>
                <thead className="bg-[#002046] [&_th]:text-white">
                  <tr>
                    <th className="text-left px-4 py-3 text-[13px] font-semibold">
                      <span className="flex items-center gap-1">Resource <SortIcon col="full_name" /></span>
                    </th>
                    <th className="text-left px-3 py-3 text-[13px] font-semibold">
                      <span className="flex items-center gap-1">Department <SortIcon col="department" /></span>
                    </th>
                    <th className="text-left px-3 py-3 text-[13px] font-semibold">
                      <span className="flex items-center gap-1">Weekly Capacity <SortIcon col="weekly_capacity" /></span>
                    </th>
                    <th className="text-left px-3 py-3 text-[13px] font-semibold">
                      <span className="flex items-center gap-1">Weekly Allocation <SortIcon col="weekly_allocation" /></span>
                    </th>
                    <th className="text-left px-3 py-3 text-[13px] font-semibold">
                      <span className="flex items-center gap-1">% Allocation <SortIcon col="allocation" /></span>
                    </th>
                    <th className="text-left px-3 py-3 text-[13px] font-semibold">
                      <span className="flex items-center gap-1">Health <SortIcon col="health" /></span>
                    </th>
                    <th className="text-left px-3 py-3 text-[13px] font-semibold">Assigned Projects</th>
                    <th className="text-left px-3 py-3 text-[13px] font-semibold">Non Project Work</th>
                    {customColumns.map(col => (
                      <th key={col.key} className="text-left px-3 py-3 text-[13px] font-semibold group">
                        <span className="flex items-center gap-1">{col.label}
                          <button onClick={() => removeColumn(col.key)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400"><X className="w-3 h-3" /></button>
                        </span>
                      </th>
                    ))}
                    <th className="px-2 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedAccountId && <tr><td colSpan={9 + customColumns.length} className="text-center py-10 text-slate-400 text-xs">Select an account to view resources.</td></tr>}
                  {selectedAccountId && isLoading && <tr><td colSpan={9 + customColumns.length} className="text-center py-8 text-slate-400 text-xs">Loading resources...</td></tr>}
                  {selectedAccountId && isError && <tr><td colSpan={9 + customColumns.length} className="text-center py-8 text-xs"><div className="flex flex-col items-center gap-2 text-slate-500"><span>{error?.message || 'Unable to load resources.'}</span><Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button></div></td></tr>}
                  {selectedAccountId && !isLoading && !isError && resources.length === 0 && !newRow && <tr><td colSpan={9 + customColumns.length} className="text-center py-10 text-slate-400 text-xs">No resources yet. Click "New Resource" to get started.</td></tr>}
                  {selectedAccountId && !isLoading && resources.length > 0 && dirResources.length === 0 && <tr><td colSpan={9 + customColumns.length} className="text-center py-10 text-slate-400 text-xs">No resources match your filters.</td></tr>}
                  {dirResources.map(r => {
                    const rw = resourceWeekly[r.full_name] || { projects: [], weekly: 0 };
                    const pctAlloc = pctOf(r);
                    return (
                      <tr key={r.id} className="group border-b border-slate-100 hover:bg-slate-50">
                        {editingId === r.id ? (
                          <>
                            <td className="px-4 py-2 space-y-1 min-w-[220px]">
                              <Input value={editData.full_name} onChange={e => setEditData(p => ({ ...p, full_name: e.target.value }))} className="h-7 text-sm" placeholder="Full name*" autoFocus />
                              <Input value={editData.role} onChange={e => setEditData(p => ({ ...p, role: e.target.value }))} className="h-7 text-xs" placeholder="Role, e.g. Developer" />
                              <LinkedUserSelect value={editData.user_id} resourceId={r.id} onChange={v => setEditData(p => ({ ...p, user_id: v }))} />
                            </td>
                            <td className="px-3 py-2"><Input value={editData.department} onChange={e => setEditData(p => ({ ...p, department: e.target.value }))} className="h-7 text-sm" placeholder="e.g. Engineering" /></td>
                            <td className="px-3 py-2"><Select value={editData.weekly_capacity != null ? String(editData.weekly_capacity) : ''} onValueChange={v => setEditData(p => ({ ...p, weekly_capacity: Number(v) }))}><SelectTrigger className="h-7 text-xs bg-white"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="20">20 hrs</SelectItem><SelectItem value="40">40 hrs</SelectItem></SelectContent></Select></td>
                            <td className="px-3 py-2 text-xs text-slate-400 italic">Auto-computed</td>
                            <td className="px-3 py-2 text-xs text-slate-400 italic">Auto-computed</td>
                            <td className="px-3 py-2 text-xs text-slate-400 italic">Auto-computed</td>
                            <td className="px-3 py-2 text-xs text-slate-400 italic">Auto-computed</td>
                            <td className="px-3 py-2"><Input type="number" value={editData.non_project_hours ?? ''} onChange={e => setEditData(p => ({ ...p, non_project_hours: e.target.value === '' ? '' : Number(e.target.value) }))} className="h-7 text-sm" placeholder="0" /></td>
                            {customColumns.map(col => <td key={col.key} className="px-3 py-2"><Input value={editData[col.key] || ''} onChange={e => setEditData(p => ({ ...p, [col.key]: e.target.value }))} className="h-7 text-sm" /></td>)}
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <button onClick={handleSaveEdit} className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded"><Check className="w-3 h-3" /></button>
                                <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded"><X className="w-3 h-3" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5">
                              <p className="font-semibold" style={{ color: NAVY }}>{r.full_name}</p>
                              <p className="text-xs text-slate-400">{r.role || 'No role set'}</p>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">{r.department || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-600">{r.weekly_capacity != null ? `${r.weekly_capacity} hrs` : '—'}</td>
                            <td className="px-3 py-2.5 text-slate-600">{rw.weekly > 0 ? `${rw.weekly.toFixed(1)} hrs` : '—'}</td>
                            <td className="px-3 py-2.5">
                              {pctAlloc != null ? <span className="font-semibold" style={{ color: healthOf(pctAlloc).color }}>{pctAlloc}%</span> : '—'}
                            </td>
                            <td className="px-3 py-2.5"><HealthBadge pct={pctAlloc} /></td>
                            <td className="px-3 py-2.5">
                              {rw.projects.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {rw.projects.map(p => <span key={p.id} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">{p.name} <span className="text-slate-500 font-medium">[{p.weekly.toFixed(1)}h/wk]</span></span>)}
                                </div>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                defaultValue={r.non_project_hours ?? ''}
                                onBlur={(e) => saveNonProjectHours(r, e.target.value)}
                                className="h-7 w-20 text-xs rounded-md border border-slate-200 px-2 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                placeholder="0"
                              />
                            </td>
                            {customColumns.map(col => <td key={col.key} className="px-3 py-2.5 text-slate-500">{r[col.key] || '—'}</td>)}
                            <td className="px-3 py-2.5">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 justify-end">
                                <button onClick={() => handleStartEdit(r)} className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => remove.mutate(r.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {newRow && (
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <td className="px-4 py-2 space-y-1 min-w-[220px]">
                        <Input value={newRow.full_name} onChange={e => setNewRow(p => ({ ...p, full_name: e.target.value }))} className="h-7 text-sm" placeholder="Full name*" autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveNew()} />
                        <Input value={newRow.role} onChange={e => setNewRow(p => ({ ...p, role: e.target.value }))} className="h-7 text-xs" placeholder="Role, e.g. Developer" />
                        <LinkedUserSelect value={newRow.user_id} onChange={v => setNewRow(p => ({ ...p, user_id: v }))} />
                      </td>
                      <td className="px-3 py-2"><Input value={newRow.department} onChange={e => setNewRow(p => ({ ...p, department: e.target.value }))} className="h-7 text-sm" placeholder="e.g. Engineering" /></td>
                      <td className="px-3 py-2"><Select value={newRow.weekly_capacity != null ? String(newRow.weekly_capacity) : ''} onValueChange={v => setNewRow(p => ({ ...p, weekly_capacity: Number(v) }))}><SelectTrigger className="h-7 text-xs bg-white"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="20">20 hrs</SelectItem><SelectItem value="40">40 hrs</SelectItem></SelectContent></Select></td>
                      <td className="px-3 py-2 text-xs text-slate-300 italic">—</td>
                      <td className="px-3 py-2 text-xs text-slate-300 italic">—</td>
                      <td className="px-3 py-2 text-xs text-slate-300 italic">—</td>
                      <td className="px-3 py-2 text-xs text-slate-300 italic">—</td>
                      <td className="px-3 py-2"><Input type="number" value={newRow.non_project_hours ?? ''} onChange={e => setNewRow(p => ({ ...p, non_project_hours: e.target.value === '' ? '' : Number(e.target.value) }))} className="h-7 text-sm" placeholder="0" /></td>
                      {customColumns.map(col => <td key={col.key} className="px-3 py-2" />)}
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={handleSaveNew} className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setNewRow(null)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          </div>
          <p className="text-xs" style={{ color: MUTED }}>
            <Search className="w-3 h-3 inline mr-1" />Showing {dirResources.length} of {resources.length} resources. Health: {HEALTH_ORDER.map(k => HEALTH[k].legend).join(' · ')}.
          </p>
          </>)}

        </div>
      </div>
    </div>
  );
}
