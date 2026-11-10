import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, BarChart3, Building2, CalendarDays, ChevronDown, FileSpreadsheet, FileText, Folder, FolderTree, GanttChartSquare, Loader2,
  Package, Presentation, Scale, SlidersHorizontal, X,
} from 'lucide-react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import InfoTip from '@/components/projects/InfoTip';
import { DeliveryView, GanttView, GovernanceView, RaidView, ReportDocument, StatusView } from '@/components/reporting/ReportViews';
import { healthFor } from '@/components/projects/HierarchyDashboard';
import { isOpenRaid, MUTED, NAVY, ORANGE, Pill } from '@/components/projects/DirectoryKit';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast, toastError } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { useGlobalScope } from '@/lib/globalScope';
import { useUserPref } from '@/lib/userPrefs';
import { cn } from '@/lib/utils';
import { mapIssueListFromApi, mapRiskListFromApi, raidApi } from '@/api/raid';
import { raidEntityAdapters } from '@/api/raidEntities';
import {
  useAccountChangeRequests, useAccountDecisions, useAccountHierarchy, useAccountRequirements, useAccountSprints, useAccountTasks, useAccountTestCases,
} from '@/hooks/useAccountLookups';
import { downloadPdf, downloadPpt, downloadXlsx, reportFileName } from '@/lib/reportExport';
import { buildReport, defaultPeriodEnd, executiveSummary, PERIOD_TYPES, REPORT_PARTS, reportMarkdown, reportSections, reportTitle } from '@/lib/reporting';

const TABS = [
  { key: 'status', label: 'Status Summary', icon: BarChart3 },
  { key: 'gantt', label: 'Gantt', icon: GanttChartSquare },
  { key: 'delivery', label: 'Delivery', icon: Package },
  { key: 'raid', label: 'RAID', icon: AlertTriangle },
  { key: 'governance', label: 'Governance', icon: Scale },
];
const SCOPES = [
  { key: 'project', label: 'Projects', icon: Folder, noun: 'project' },
  { key: 'program', label: 'Programs', icon: FolderTree, noun: 'program' },
  { key: 'portfolio', label: 'Portfolios', icon: Building2, noun: 'portfolio' },
];
const ALL_PARTS = Object.fromEntries(REPORT_PARTS.map(part => [part.key, true]));
const OVERALL_TONES = { red: 'red', amber: 'orange', green: 'green', grey: 'grey' };

function PanelHeading({ children }) {
  return <h3 className="text-[15px] font-bold mt-5 mb-2" style={{ color: NAVY }}>{children}</h3>;
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(({ key, label, icon: Icon }) => (
        <button key={key} type="button" onClick={() => onChange(key)}
          className={cn('h-9 rounded-lg text-[13px] font-medium flex items-center justify-center gap-1.5 border transition-colors', value === key ? 'text-white border-transparent' : 'bg-white border-slate-200 hover:bg-slate-50')}
          style={value === key ? { backgroundColor: ORANGE } : { color: NAVY }}>
          {Icon && <Icon className="w-3.5 h-3.5" />}{label}
        </button>
      ))}
    </div>
  );
}

export default function ReportingCenter() {
  const { selectedAccountId } = useAuth();
  const { scopeHierarchy } = useGlobalScope();
  const allHierarchy = useAccountHierarchy();
  const hierarchy = scopeHierarchy(allHierarchy);
  const { projects, programs, portfolios } = hierarchy;

  const { tasks, isLoading: loadingTasks } = useAccountTasks();
  const sprints = useAccountSprints();
  const { requirements } = useAccountRequirements();
  const { testCases } = useAccountTestCases();
  const decisions = useAccountDecisions();
  const { changeRequests } = useAccountChangeRequests();
  const enabled = Boolean(selectedAccountId);
  const { data: risks = [] } = useQuery({ queryKey: ['account-risks', selectedAccountId], queryFn: async () => mapRiskListFromApi(await raidApi.listAccountRisks(selectedAccountId)), enabled });
  const { data: issues = [] } = useQuery({ queryKey: ['account-issues', selectedAccountId], queryFn: async () => mapIssueListFromApi(await raidApi.listAccountIssues(selectedAccountId)), enabled });
  const { data: assumptions = [] } = useQuery({ queryKey: ['assumptions', selectedAccountId], queryFn: () => raidEntityAdapters.Assumption.list(selectedAccountId), enabled });
  const { data: dependencies = [] } = useQuery({ queryKey: ['dependencies', selectedAccountId], queryFn: () => raidEntityAdapters.Dependency.list(selectedAccountId), enabled });

  const [tab, setTab] = useState('status');
  const [panelOpen, setPanelOpen] = useState(true);
  const [scopeType, setScopeType] = useState('project');
  const [selectionId, setSelectionId] = useState('');
  const [periodType, setPeriodType] = useState('weekly');
  const [endDate, setEndDate] = useState(() => defaultPeriodEnd());
  const [include, setInclude] = useState(ALL_PARTS);
  const [exporting, setExporting] = useState('');
  const [templates, setTemplates] = useUserPref('report_templates', []);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const documentRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const options = scopeType === 'program' ? programs : scopeType === 'portfolio' ? portfolios : projects;
  useEffect(() => {
    if (options.length && !options.some(o => o.id === selectionId)) setSelectionId(options[0].id);
  }, [options, selectionId]);

  const report = useMemo(() => {
    if (!selectionId || !endDate) return null;
    return buildReport({
      scopeType, selectionId, periodType, endDate, hierarchy, rules: { isOpenRaid, healthFor },
      tasks, sprints, requirements, testCases, decisions, changeRequests, risks, issues, assumptions, dependencies,
    });
    // hierarchy is rebuilt each render from these lists.
  }, [scopeType, selectionId, periodType, endDate, projects, programs, portfolios, tasks, sprints, requirements, testCases, decisions, changeRequests, risks, issues, assumptions, dependencies]);

  const sections = useMemo(() => (report ? reportSections(report, include) : []), [report, include]);

  const generate = async (kind) => {
    if (!report) return;
    setExporting(kind);
    const title = reportTitle(report);
    try {
      if (kind === 'pdf') {
        await downloadPdf(documentRef.current, reportFileName({ title }, 'pdf'));
      } else if (kind === 'ppt') {
        await downloadPpt(reportMarkdown(report, include, sections), reportFileName({ title }, 'pptx'));
      } else {
        const summary = [['Report', title], ['Reporting period', report.period.label], [report.scope.managerLabel, report.scope.manager], ['Overall status', report.overall.label],
          ...(include.executive ? executiveSummary(report).map((line, i) => [i === 0 ? 'Executive summary' : '', line]) : [])];
        await downloadXlsx([{ name: 'Summary', rows: summary, plain: true }, ...sections.map(s => ({ name: s.title, rows: [s.headers, ...s.rows] }))], reportFileName({ title }, 'xlsx'));
      }
    } catch (error) {
      toastError(error.message || 'The report could not be generated.');
    } finally {
      setExporting('');
    }
  };

  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    setTemplates((current) => [...current.filter(t => t.name !== name), { name, scopeType, selectionId, periodType, include }]);
    setTemplateDialogOpen(false);
    setTemplateName('');
    toast({ title: `Template "${name}" saved` });
  };
  const applyTemplate = (template) => {
    setScopeType(template.scopeType);
    setSelectionId(template.selectionId);
    setPeriodType(template.periodType);
    setInclude({ ...ALL_PARTS, ...template.include });
  };

  const changeScope = (next) => { setScopeType(next); setSelectionId(''); };
  const scopeNoun = SCOPES.find(s => s.key === scopeType).noun;
  const loading = allHierarchy.isLoading || loadingTasks;

  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="bg-white px-6 pt-5">
          <div className="flex items-start gap-3">
            <BarChart3 className="w-9 h-9 flex-shrink-0" style={{ color: NAVY }} />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Reporting Center</h1>
              <p className="text-sm text-slate-500 mt-0.5">Generate, customize, and share reports across your projects, programs, and portfolios.</p>
              {report && (
                <div className="mt-1.5 text-[13px]" style={{ color: NAVY }}>
                  <p><strong>Reporting Period:</strong> {report.period.label}</p>
                  <p><strong>{report.scope.managerLabel}:</strong> {report.scope.manager}</p>
                </div>
              )}
            </div>
            {!panelOpen && (
              <Button variant="outline" size="sm" onClick={() => setPanelOpen(true)}><SlidersHorizontal className="w-4 h-4 mr-1.5" /> Report settings</Button>
            )}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 mt-3">
            <div className="flex items-center gap-1 overflow-x-auto">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button key={key} type="button" onClick={() => setTab(key)}
                  className={cn('flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors', tab === key ? 'border-[#c87b14] text-[#002046] bg-orange-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
            {report && (
              <div className="pb-2">
                <Pill tone={OVERALL_TONES[report.overall.key] || 'grey'} className="px-3 py-1.5 text-[13px]" icon={<AlertTriangle className="w-3.5 h-3.5" />}>Overall Status: {report.overall.label}</Pill>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5" style={{ backgroundColor: '#F7F9FC' }}>
          {loading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>
          ) : !report ? (
            <div className="text-center py-24 text-slate-500 text-sm">{options.length ? `Choose a ${scopeNoun} to report on.` : `There are no ${scopeNoun}s to report on yet.`}</div>
          ) : tab === 'status' ? <StatusView report={report} />
            : tab === 'gantt' ? <GanttView report={report} />
              : tab === 'delivery' ? <DeliveryView report={report} />
                : tab === 'raid' ? <RaidView report={report} />
                  : <GovernanceView report={report} />}
        </div>
      </div>

      {panelOpen && (
        <aside className="w-[340px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Folder className="w-4 h-4 flex-shrink-0" style={{ color: NAVY }} />
            <h2 className="text-[15px] font-bold flex-1 truncate" style={{ color: NAVY }}>{report?.scope.label || 'Report settings'}</h2>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close report settings" className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4" style={{ color: NAVY }} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <PanelHeading>Reporting scope</PanelHeading>
            <p className="text-xs mb-1" style={{ color: MUTED }}>Scope</p>
            <Segmented options={SCOPES} value={scopeType} onChange={changeScope} />
            <p className="text-xs mt-3 mb-1" style={{ color: MUTED }}>Selection</p>
            <Select value={selectionId} onValueChange={setSelectionId}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder={`Select a ${scopeNoun}...`} /></SelectTrigger>
              <SelectContent>{options.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>

            <PanelHeading>Reporting period</PanelHeading>
            <Segmented options={PERIOD_TYPES.map(p => ({ key: p.value, label: p.label }))} value={periodType} onChange={setPeriodType} />
            <p className="text-xs mt-3 mb-1" style={{ color: MUTED }}>Period end date</p>
            <div className="relative">
              <CalendarDays className="w-4 h-4 absolute left-3 top-2.5 pointer-events-none" style={{ color: NAVY }} />
              <Input type="date" value={endDate} onChange={e => { if (e.target.value) setEndDate(e.target.value); }} className="h-9 pl-9 text-[13px]" />
            </div>
            {report && <p className="text-xs mt-1.5" style={{ color: MUTED }}>Reporting period: {report.period.longLabel}</p>}

            <PanelHeading>Include in report</PanelHeading>
            <div className="space-y-2">
              {REPORT_PARTS.map(part => (
                <div key={part.key} className="flex items-center gap-2.5">
                  <Checkbox id={`part-${part.key}`} checked={include[part.key]} onCheckedChange={v => setInclude(p => ({ ...p, [part.key]: Boolean(v) }))} />
                  <label htmlFor={`part-${part.key}`} className="text-[13px] cursor-pointer" style={{ color: NAVY }}>{part.label}</label>
                  <InfoTip>{part.help}</InfoTip>
                </div>
              ))}
            </div>

            {templates.length > 0 && (
              <>
                <PanelHeading>Saved templates</PanelHeading>
                <ul className="space-y-1">
                  {templates.map(t => (
                    <li key={t.name} className="flex items-center gap-1 rounded hover:bg-slate-50">
                      <button type="button" onClick={() => applyTemplate(t)} className="flex-1 min-w-0 truncate text-left text-[13px] px-2 py-1" style={{ color: NAVY }}>{t.name}</button>
                      <button type="button" aria-label={`Delete template ${t.name}`} onClick={() => setTemplates(current => current.filter(x => x.name !== t.name))} className="p-1 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-slate-200 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={!report || Boolean(exporting)} className="flex-1 text-white hover:opacity-90" style={{ backgroundColor: ORANGE }}>
                  {exporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />} Generate Report <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={() => generate('pdf')}><FileText className="w-4 h-4 mr-2 text-red-600" /> PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => generate('ppt')}><Presentation className="w-4 h-4 mr-2 text-[#c87b14]" /> PPT</DropdownMenuItem>
                <DropdownMenuItem onClick={() => generate('xlsx')}><FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" disabled={!report} onClick={() => setTemplateDialogOpen(true)} style={{ color: NAVY }}>Save Template</Button>
          </div>
        </aside>
      )}

      {/* Captured when someone generates a PDF. */}
      {report && <div className="hidden"><ReportDocument ref={documentRef} report={report} include={include} sections={sections} /></div>}

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Save report template</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Keeps this scope, period type and report contents so you can use them again.</p>
          <Input value={templateName} onChange={e => setTemplateName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveTemplate(); }} placeholder="Template name" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button disabled={!templateName.trim()} onClick={saveTemplate} className="text-white hover:opacity-90" style={{ backgroundColor: ORANGE }}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
