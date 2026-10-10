import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { resourcesApi } from '@/api/resources';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Users, Check, X, Download, ChevronDown, ChevronRight, BarChart2, ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell, ReferenceLine } from 'recharts';
import { parseISO, isValid } from 'date-fns';

export default function ProjectResources({ embedded = false }) {
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();
  const [newRow, setNewRow] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [tableOpen, setTableOpen] = useState(true);
  const [customColumns, setCustomColumns] = useState(() => {
    try { return JSON.parse(localStorage.getItem('resource_custom_columns') || '[]'); } catch { return []; }
  });
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState('');

  // Chart filters
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterPortfolio, setFilterPortfolio] = useState('all');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  // Directory name filter
  const [nameFilter, setNameFilter] = useState('');
  // Directory filters + sorting
  const [dirDept, setDirDept] = useState('all');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const saveCustomColumns = (cols) => { setCustomColumns(cols); localStorage.setItem('resource_custom_columns', JSON.stringify(cols)); };
  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    const key = 'custom_' + newColName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!customColumns.find(c => c.key === key)) saveCustomColumns([...customColumns, { key, label: newColName.trim() }]);
    setNewColName(''); setAddingColumn(false);
  };
  const removeColumn = (key) => saveCustomColumns(customColumns.filter(c => c.key !== key));
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
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => base44.entities.Program.list() });
  const { data: portfolios = [] } = useQuery({ queryKey: ['portfolios'], queryFn: () => base44.entities.Portfolio.list() });
  const { data: allTasks = [] } = useQuery({ queryKey: ['tasks_all_resources'], queryFn: () => base44.entities.Task.list() });

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
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => resourcesApi.updateResource(id, data),
    onSuccess: (_resource, variables) => {
      invalidateResources(variables.id);
      setEditingId(null);
    },
  });
  const remove = useMutation({
    mutationFn: id => resourcesApi.deleteResource(id),
    onSuccess: (_result, resourceId) => invalidateResources(resourceId),
  });

  useEffect(() => {
    if (resourceDetail && editingId) setEditData(getEditableResourceData(resourceDetail));
  }, [resourceDetail, editingId]);

  // Compute projects assigned to each resource
  const getProjectsAssigned = (resourceName) => {
    const pids = new Set();
    allTasks.forEach(t => {
      if (t.assignee === resourceName || (Array.isArray(t.resources) && t.resources.includes(resourceName))) {
        if (t.project_id) pids.add(t.project_id);
      }
    });
    return [...pids].map(pid => projects.find(p => p.id === pid)?.name).filter(Boolean);
  };

  // Per-project weekly allocation hours + average weekly allocation per resource
  const resourceWeekly = useMemo(() => {
    const map = {};
    resources.forEach(r => {
      const name = r.full_name;
      const byProject = {};
      allTasks.forEach(t => {
        const involved = t.assignee === name || (Array.isArray(t.resources) && t.resources.includes(name));
        if (!involved || !t.project_id) return;
        let hrs = 0;
        if (Array.isArray(t.resource_hours)) {
          hrs = t.resource_hours.filter(h => h && h.resource === name).reduce((s, h) => s + (Number(h.hours) || 0), 0);
        }
        if (hrs === 0 && t.assignee === name) hrs = 0; // still count project even if 0
        byProject[t.project_id] = (byProject[t.project_id] || 0) + hrs;
      });
      const projectsList = Object.entries(byProject).map(([pid, hours]) => {
        const proj = projects.find(p => p.id === pid);
        let weeks = 1;
        if (proj && proj.start_date && proj.end_date) {
          const start = parseISO(proj.start_date);
          const end = parseISO(proj.end_date);
          if (isValid(start) && isValid(end)) {
            const days = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
            weeks = days / 7;
          }
        }
        const weekly = hours / weeks;
        return { name: proj?.name || '—', weekly };
      }).filter(p => p.name !== '—');
      const nonProject = Number(r.non_project_hours) || 0;
      const weekly = projectsList.reduce((s, p) => s + p.weekly, 0) + nonProject; // assigned projects + non-project hours
      map[name] = { projects: projectsList, weekly, nonProject };
    });
    return map;
  }, [resources, allTasks, projects]);

  const resourceNames = resources.map(r => r.full_name);

  // Utilization dashboard scope filters (portfolio → program → project)
  const scopedProjectIds = useMemo(() => {
    if (filterProject !== 'all') return new Set([filterProject]);
    if (filterProgram !== 'all') return new Set(projects.filter(p => p.program_id === filterProgram).map(p => p.id));
    if (filterPortfolio !== 'all') return new Set(projects.filter(p => p.portfolio_id === filterPortfolio).map(p => p.id));
    return null;
  }, [projects, filterProject, filterProgram, filterPortfolio]);

  const resourcesInScope = useMemo(() => {
    if (!scopedProjectIds) return null;
    const names = new Set();
    allTasks.forEach(t => {
      if (t.project_id && scopedProjectIds.has(t.project_id)) {
        if (t.assignee) names.add(t.assignee);
        if (Array.isArray(t.resources)) t.resources.forEach(rn => names.add(rn));
      }
    });
    return names;
  }, [allTasks, scopedProjectIds]);

  const filteredResources = resourceNames.filter(n => {
    if (filterAssignee !== 'all' && n !== filterAssignee) return false;
    const res = resources.find(r => r.full_name === n);
    if (filterDepartment !== 'all' && (res?.department || '—') !== filterDepartment) return false;
    if (resourcesInScope && !resourcesInScope.has(n)) return false;
    return true;
  });
  const departments = [...new Set(resources.map(r => r.department).filter(Boolean))].sort();
  const scopePrograms = programs.filter(p => filterPortfolio === 'all' || p.portfolio_id === filterPortfolio);
  const scopeProjects = projects.filter(p => {
    if (filterProgram !== 'all') return p.program_id === filterProgram;
    if (filterPortfolio !== 'all') return p.portfolio_id === filterPortfolio;
    return true;
  });

  const dirResources = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    let list = resources.filter(r => {
      if (q && !(r.full_name || '').toLowerCase().includes(q) && !(r.role || '').toLowerCase().includes(q)) return false;
      if (dirDept !== 'all' && (r.department || '') !== dirDept) return false;
      return true;
    });
    if (sortKey) {
      list = [...list].sort((a, b) => {
        let av, bv;
        const pctOf = (res) => {
          const w = resourceWeekly[res.full_name]?.weekly ?? 0;
          const c = Number(res.weekly_capacity) || 0;
          return c > 0 ? (w / c) * 100 : 0;
        };
        if (sortKey === 'weekly_allocation') {
          av = resourceWeekly[a.full_name]?.weekly ?? 0;
          bv = resourceWeekly[b.full_name]?.weekly ?? 0;
        } else if (sortKey === 'allocation') {
          av = pctOf(a); bv = pctOf(b);
        } else {
          av = a[sortKey]; bv = b[sortKey];
          if (av == null) av = '';
          if (bv == null) bv = '';
        }
        if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return list;
  }, [resources, nameFilter, dirDept, sortKey, sortDir, resourceWeekly]);

  const allocStats = useMemo(() => {
    let over = 0, under = 0, sum = 0, count = 0;
    resources.forEach(r => {
      const w = resourceWeekly[r.full_name]?.weekly ?? 0;
      const c = Number(r.weekly_capacity) || 0;
      if (c <= 0) return;
      const pct = (w / c) * 100;
      sum += pct; count++;
      if (pct > 100) over++;
      else if (pct < 100) under++;
    });
    return { total: resources.length, over, under, avg: count > 0 ? Math.round(sum / count) : 0 };
  }, [resources, resourceWeekly]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300 cursor-pointer" onClick={() => toggleSort(col)} />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-emerald-600 cursor-pointer" onClick={() => toggleSort(col)} />
      : <ArrowDown className="w-3 h-3 text-emerald-600 cursor-pointer" onClick={() => toggleSort(col)} />;
  };

  // Allocation chart data — mirrors the Resource Directory (weekly allocation, capacity, % allocation)
  const STATUS_COLORS = { over: '#ef4444', under: '#eab308', optimal: '#10b981' };

  const allocChartData = useMemo(() => {
    return filteredResources.map(name => {
      const r = resources.find(x => x.full_name === name);
      const w = resourceWeekly[name]?.weekly ?? 0;
      const c = Number(r?.weekly_capacity) || 0;
      const pct = c > 0 ? Math.round((w / c) * 100) : 0;
      const status = pct > 100 ? 'over' : pct === 100 ? 'optimal' : 'under';
      return { name: name.split(' ')[0], fullName: name, allocated: Math.round(w * 10) / 10, capacity: c, pct, status };
    }).filter(d => d.capacity > 0).sort((a, b) => b.pct - a.pct);
  }, [filteredResources, resources, resourceWeekly]);

  const deptAllocData = useMemo(() => {
    const map = {};
    const scoped = resources.filter(r => filteredResources.includes(r.full_name));
    scoped.forEach(r => {
      const dept = r.department || 'Unassigned';
      const w = resourceWeekly[r.full_name]?.weekly ?? 0;
      const c = Number(r.weekly_capacity) || 0;
      if (c <= 0) return;
      if (!map[dept]) map[dept] = { dept, sumPct: 0, count: 0, allocated: 0, capacity: 0 };
      map[dept].sumPct += (w / c) * 100;
      map[dept].count++;
      map[dept].allocated += w;
      map[dept].capacity += c;
    });
    return Object.values(map).map(d => {
      const avg = d.sumPct / d.count;
      return {
        dept: d.dept,
        avgPct: Math.round(avg),
        allocated: Math.round(d.allocated * 10) / 10,
        capacity: d.capacity,
        resources: d.count,
        status: avg > 100 ? 'over' : avg < 100 ? 'under' : 'optimal',
      };
    }).sort((a, b) => b.avgPct - a.avgPct);
  }, [resources, resourceWeekly, filteredResources]);

  const exportToCSV = () => {
    const rows = [['Full Name', 'Weekly Capacity', 'Weekly Allocation', 'Role', 'Department', '% Allocation', 'Assigned Projects', 'Non Project work'], ...resources.map(r => {
      const rw = resourceWeekly[r.full_name] || { projects: [], weekly: 0 };
      const ap = rw.projects.map(p => `${p.name} [${p.weekly.toFixed(1)}h/wk]`).join('; ');
      const pct = r.weekly_capacity ? Math.round((rw.weekly / r.weekly_capacity) * 100) : null;
      return [r.full_name, r.weekly_capacity != null ? `${r.weekly_capacity} hrs` : '', rw.weekly > 0 ? `${rw.weekly.toFixed(1)} hrs` : '', r.role || '', r.department || '', pct != null ? `${pct}%` : '', ap, r.non_project_hours != null ? `${r.non_project_hours} hrs` : ''];
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
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Utilization</h1>
              <p className="text-xs text-slate-400">{resources.length} resources tracked</p>
            </div>
          </div>
        </div>
        )}

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><Users className="w-4 h-4 text-emerald-600" /></div>
                <span className="text-xs font-medium text-slate-500">Total Resources</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 ml-10">{allocStats.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><ArrowUp className="w-4 h-4 text-red-600" /></div>
                <span className="text-xs font-medium text-slate-500">Over Allocated</span>
              </div>
              <p className="text-2xl font-bold text-red-600 ml-10">{allocStats.over}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center"><ArrowDown className="w-4 h-4 text-yellow-600" /></div>
                <span className="text-xs font-medium text-slate-500">Under Allocated</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600 ml-10">{allocStats.under}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><BarChart2 className="w-4 h-4 text-indigo-600" /></div>
                <span className="text-xs font-medium text-slate-500">Average Utilization</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 ml-10">{allocStats.avg}%</p>
            </div>
          </div>

          {/* Utilization Dashboard */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <BarChart2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-700">Utilization Dashboard</h2>
            </div>

            {/* Filters */}
            <div className="px-3 py-2 bg-slate-50 rounded-lg mb-5 border border-slate-100 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Portfolio:</span>
                  <Select value={filterPortfolio} onValueChange={(v) => { setFilterPortfolio(v); setFilterProgram('all'); setFilterProject('all'); }}>
                    <SelectTrigger className="h-7 w-40 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Portfolios</SelectItem>
                      {portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Program:</span>
                  <Select value={filterProgram} onValueChange={(v) => { setFilterProgram(v); setFilterProject('all'); }}>
                    <SelectTrigger className="h-7 w-40 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs</SelectItem>
                      {scopePrograms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Project:</span>
                  <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger className="h-7 w-44 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {scopeProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Resource:</span>
                  <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                    <SelectTrigger className="h-7 w-40 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Resources</SelectItem>
                      {resources.map(r => <SelectItem key={r.id} value={r.full_name}>{r.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Department:</span>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="h-7 w-40 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Button size="sm" variant="outline" onClick={exportToCSV} className="h-9"><Download className="w-3.5 h-3.5 mr-1.5" /> Export</Button>
                  <Button size="sm" disabled={!selectedAccountId} onClick={() => setNewRow({ full_name: '', rate: '', weekly_capacity: '', role: '', department: '', allocation: '', non_project_hours: '' })} className="bg-[#c87b14] hover:bg-[#a86610] text-white">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Resource
                  </Button>
                </div>
              </div>
            </div>

            {/* Status legend */}
            <div className="flex items-center gap-4 mb-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS.over }}></span>Over allocated (&gt;100%)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS.optimal }}></span>Optimal (=100%)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS.under }}></span>Under allocated (&lt;100%)</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Chart 1: % Allocation by Resource */}
              <div className="xl:col-span-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">% Allocation by Resource</h3>
                {allocChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(260, allocChartData.length * 36)}>
                    <BarChart data={allocChartData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 'dataMax + 20']} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Allocation']} labelFormatter={(l) => allocChartData.find(d => d.name === l)?.fullName || l} />
                      <ReferenceLine x={100} stroke="#ef4444" strokeDasharray="4 4" />
                      <Bar dataKey="pct" radius={[0, 4, 4, 0]} name="% Allocation">
                        {allocChartData.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.status]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[260px] flex items-center justify-center text-slate-300 text-xs">No allocation data available</div>}
              </div>

              {/* Chart 3: Average % Allocation by Department */}
              <div className="xl:col-span-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Average % Allocation by Department</h3>
                {deptAllocData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={deptAllocData} margin={{ top: 0, right: 10, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="dept" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} interval={0} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(v) => [`${v}%`, 'Avg Allocation']} />
                      <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" />
                      <Bar dataKey="avgPct" name="Avg Allocation" radius={[3, 3, 0, 0]}>
                        {deptAllocData.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.status]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[280px] flex items-center justify-center text-slate-300 text-xs">No department data available</div>}
              </div>
            </div>
          </div>

          {/* Collapsible resource table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button onClick={() => setTableOpen(p => !p)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-semibold text-slate-700">Resource Directory</span>
              {tableOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {tableOpen && (
              <>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={nameFilter} onChange={e => setNameFilter(e.target.value)} placeholder="Search name or role…" className="h-8 pl-8 pr-3 w-56 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                </div>
                <Select value={dirDept} onValueChange={setDirDept}>
                  <SelectTrigger className="h-8 w-44 text-xs bg-white"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(nameFilter || dirDept !== 'all') && (
                  <button onClick={() => { setNameFilter(''); setDirDept('all'); }} className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"><X className="w-3 h-3" /> Clear</button>
                )}
                <span className="ml-auto text-xs text-slate-400">{dirResources.length} of {resources.length}</span>
              </div>
              <table className="w-full text-sm border-t border-slate-100" style={{ minWidth: '1000px' }}>
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1">Full Name <SortIcon col="full_name" /></span>
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1">Weekly Capacity <SortIcon col="weekly_capacity" /></span>
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1">Weekly Allocation <SortIcon col="weekly_allocation" /></span>
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1">Role <SortIcon col="role" /></span>
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1">Department <SortIcon col="department" /></span>
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1">% Allocation <SortIcon col="allocation" /></span>
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Assigned Projects</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Non Project work</th>
                    {customColumns.map(col => (
                      <th key={col.key} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 group">
                        <span className="flex items-center gap-1">{col.label}
                          <button onClick={() => removeColumn(col.key)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400"><X className="w-3 h-3" /></button>
                        </span>
                      </th>
                    ))}
                    <th className="px-2 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedAccountId && <tr><td colSpan={9 + customColumns.length} className="text-center py-10 text-slate-400 text-xs">Select an account to view resources.</td></tr>}
                  {selectedAccountId && isLoading && <tr><td colSpan={9 + customColumns.length} className="text-center py-8 text-slate-400 text-xs">Loading resources...</td></tr>}
                  {selectedAccountId && isError && <tr><td colSpan={9 + customColumns.length} className="text-center py-8 text-xs"><div className="flex flex-col items-center gap-2 text-slate-500"><span>{error?.message || 'Unable to load resources.'}</span><Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button></div></td></tr>}
                  {selectedAccountId && !isLoading && !isError && resources.length === 0 && !newRow && <tr><td colSpan={9 + customColumns.length} className="text-center py-10 text-slate-400 text-xs">No resources yet. Click "Add Resource" to get started.</td></tr>}
                  {dirResources.map(r => {
                    const rw = resourceWeekly[r.full_name] || { projects: [], weekly: 0 };
                    const pctAlloc = r.weekly_capacity ? Math.round((rw.weekly / r.weekly_capacity) * 100) : null;
                    return (
                      <tr key={r.id} className="group border-b border-slate-50 hover:bg-slate-50">
                        {editingId === r.id ? (
                          <>
                            <td className="px-3 py-2"><Input value={editData.full_name} onChange={e => setEditData(p => ({ ...p, full_name: e.target.value }))} className="h-7 text-sm" autoFocus /></td>
                            <td className="px-3 py-2"><Select value={editData.weekly_capacity != null ? String(editData.weekly_capacity) : ''} onValueChange={v => setEditData(p => ({ ...p, weekly_capacity: Number(v) }))}><SelectTrigger className="h-7 text-xs bg-white"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="20">20 hrs</SelectItem><SelectItem value="40">40 hrs</SelectItem></SelectContent></Select></td>
                            <td className="px-3 py-2 text-xs text-slate-400 italic">Auto-computed</td>
                            <td className="px-3 py-2"><Input value={editData.role} onChange={e => setEditData(p => ({ ...p, role: e.target.value }))} className="h-7 text-sm" placeholder="e.g. Developer" /></td>
                            <td className="px-3 py-2"><Input value={editData.department} onChange={e => setEditData(p => ({ ...p, department: e.target.value }))} className="h-7 text-sm" placeholder="e.g. Engineering" /></td>
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
                            <td className="px-3 py-2 font-medium text-slate-800">{r.full_name}</td>
                            <td className="px-3 py-2 text-slate-500">{r.weekly_capacity != null ? `${r.weekly_capacity} hrs` : '—'}</td>
                            <td className="px-3 py-2 text-slate-500">{rw.weekly > 0 ? `${rw.weekly.toFixed(1)} hrs` : '—'}</td>
                            <td className="px-3 py-2 text-slate-500">{r.role || '—'}</td>
                            <td className="px-3 py-2 text-slate-500">{r.department || '—'}</td>
                            <td className="px-3 py-2">
                              {pctAlloc != null ? (() => {
                                const color = pctAlloc > 100 ? 'text-red-600' : pctAlloc === 100 ? 'text-emerald-600' : 'text-yellow-600';
                                const title = pctAlloc > 100 ? 'Over allocated' : pctAlloc === 100 ? 'Optimal' : 'Under allocated';
                                return <span className={`font-semibold ${color}`} title={title}>{pctAlloc}%</span>;
                              })() : '—'}
                            </td>
                            <td className="px-3 py-2">
                              {rw.projects.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {rw.projects.map(p => <span key={p.name} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">{p.name} <span className="text-emerald-500 font-medium">[{p.weekly.toFixed(1)}h/wk]</span></span>)}
                                </div>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                defaultValue={r.non_project_hours ?? ''}
                                onBlur={(e) => saveNonProjectHours(r, e.target.value)}
                                className="h-7 w-20 text-xs rounded-md border border-slate-200 px-2 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                placeholder="0"
                              />
                            </td>
                            {customColumns.map(col => <td key={col.key} className="px-3 py-2 text-slate-500">{r[col.key] || '—'}</td>)}
                            <td className="px-3 py-2">
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
                    <tr className="border-b border-slate-50 bg-emerald-50/30">
                      <td className="px-3 py-2"><Input value={newRow.full_name} onChange={e => setNewRow(p => ({ ...p, full_name: e.target.value }))} className="h-7 text-sm" placeholder="Full name*" autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveNew()} /></td>
                      <td className="px-3 py-2"><Select value={newRow.weekly_capacity != null ? String(newRow.weekly_capacity) : ''} onValueChange={v => setNewRow(p => ({ ...p, weekly_capacity: Number(v) }))}><SelectTrigger className="h-7 text-xs bg-white"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="20">20 hrs</SelectItem><SelectItem value="40">40 hrs</SelectItem></SelectContent></Select></td>
                      <td className="px-3 py-2 text-xs text-slate-300 italic">—</td>
                      <td className="px-3 py-2"><Input value={newRow.role} onChange={e => setNewRow(p => ({ ...p, role: e.target.value }))} className="h-7 text-sm" placeholder="e.g. Developer" /></td>
                      <td className="px-3 py-2"><Input value={newRow.department} onChange={e => setNewRow(p => ({ ...p, department: e.target.value }))} className="h-7 text-sm" placeholder="e.g. Engineering" /></td>
                      <td className="px-3 py-2 text-xs text-slate-300 italic">—</td>
                      <td className="px-3 py-2 text-xs text-slate-300 italic">—</td>
                      <td className="px-3 py-2"><Input type="number" value={newRow.non_project_hours ?? ''} onChange={e => setNewRow(p => ({ ...p, non_project_hours: e.target.value === '' ? '' : Number(e.target.value) }))} className="h-7 text-sm" placeholder="0" /></td>
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
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}