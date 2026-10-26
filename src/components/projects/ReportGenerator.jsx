import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Copy, FileText, Loader2, Presentation, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { aiReportsApi, aiSettingsApi } from '@/api/ai';
import { AssistantUnavailable } from '@/components/assistant/AssistantParts';
import { toast, toastError } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { useAiStatus } from '@/hooks/useAiStatus';
import { downloadPdf, downloadPpt, reportFileName } from '@/lib/reportExport';
import { cn } from '@/lib/utils';

const POLL_MS = 1500;

const REPORT_TYPES = [
  {
    id: 'weekly_status',
    scopes: ['PROJECT'],
    title: 'Weekly Status Report',
    description: 'Progress, highlights, blockers, risks and next steps for the period.',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    id: 'steering_committee',
    scopes: ['PROJECT'],
    title: 'Steering Committee Update',
    description: 'Decisions needed, milestones, the risk and issue register, and recommendations.',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  {
    id: 'executive_summary',
    scopes: ['PROJECT'],
    title: 'Executive Summary',
    description: 'One-page health, key figures and what leadership needs to know.',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    id: 'raid',
    scopes: ['PROJECT'],
    title: 'RAID Report',
    description: 'Open risks, issues, assumptions, decisions and change requests, as tables.',
    color: 'bg-rose-50 border-rose-200 text-rose-700',
  },
  {
    id: 'health',
    scopes: ['PROGRAM', 'PORTFOLIO'],
    title: 'Health Summary',
    description: 'Every project’s health, the ones needing attention, top risks, pending decisions and milestones.',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  {
    id: 'changes',
    scopes: ['PROJECT', 'PROGRAM', 'PORTFOLIO'],
    title: 'What Changed',
    description: 'Everything that moved since the start date: finished work, changes, new risks and decisions.',
    color: 'bg-slate-50 border-slate-200 text-slate-700',
  },
];

const TYPE_TITLES = Object.fromEntries(REPORT_TYPES.map((type) => [type.id, type.title]));

const isoDay = (date) => date.toISOString().slice(0, 10);
const daysAgo = (days) => isoDay(new Date(Date.now() - days * 86_400_000));
const isActive = (report) => report && ['QUEUED', 'RUNNING'].includes(report.status);

// Report links point into the app (/projects/…); the dialog closes when one is followed.
const markdownComponents = (onNavigate) => ({
  h1: ({ children }) => <h1 className="text-xl font-bold text-[#002046] mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold text-[#002046] border-b-2 border-[#c87b14] pb-1 mt-5 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-800 mt-3 mb-1">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-slate-700 mb-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-slate-700">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-slate-700">{children}</ol>,
  table: ({ children }) => <table className="w-full text-xs border-collapse mb-3">{children}</table>,
  th: ({ children }) => <th className="bg-[#002046] text-white text-left font-semibold px-2 py-1.5 border border-slate-300">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1.5 border border-slate-200 align-top">{children}</td>,
  a: ({ href = '', children }) => (href.startsWith('/')
    ? <Link to={href} onClick={onNavigate} className="text-[#002046] underline underline-offset-2">{children}</Link>
    : <span>{children}</span>),
});

/**
 * Writes AI reports for a project, program or portfolio. The report is written on the server from what the
 * signed-in person can see; this dialog asks for it, polls until it's written, shows it, and downloads it.
 */
export default function ReportGenerator({ scope = 'project', project, program, portfolio }) {
  const scopeType = scope.toUpperCase();
  const entity = scopeType === 'PROGRAM' ? program : scopeType === 'PORTFOLIO' ? portfolio : project;
  const { selectedAccountId: accountId } = useAuth();
  const { aiEnabled } = useAiStatus();
  const queryClient = useQueryClient();
  const previewRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [since, setSince] = useState(() => daysAgo(7));
  const [reportId, setReportId] = useState(/** @type {string | null} */ (null));
  const [exporting, setExporting] = useState(/** @type {string | null} */ (null));

  const types = REPORT_TYPES.filter((type) => type.scopes.includes(scopeType));
  const enabled = open && !!accountId && !!entity?.id;
  const recentKey = ['ai-reports', accountId, scopeType, entity?.id];

  const statusQuery = useQuery({
    queryKey: ['ai-status', accountId],
    queryFn: () => aiSettingsApi.status(accountId),
    enabled,
  });
  const recentQuery = useQuery({
    queryKey: recentKey,
    queryFn: () => aiReportsApi.list(accountId, scopeType, entity.id),
    enabled,
  });
  const reportQuery = useQuery({
    queryKey: ['ai-report', reportId],
    queryFn: () => aiReportsApi.get(reportId),
    enabled: open && !!reportId,
    refetchInterval: (query) => (isActive(query.state.data) ? POLL_MS : false),
  });
  const report = reportId ? reportQuery.data : null;

  const create = useMutation({
    mutationFn: ({ type, regenerate = false }) =>
      aiReportsApi.create(accountId, { scope_type: scopeType, scope_id: entity.id, report_type: type, since, regenerate }),
    onSuccess: (created) => {
      queryClient.setQueryData(['ai-report', created.id], created);
      setReportId(created.id);
      queryClient.invalidateQueries({ queryKey: recentKey });
    },
    onError: (error) => {
      toastError(error?.message || 'The report could not be started.');
      queryClient.invalidateQueries({ queryKey: ['ai-status', accountId] });
    },
  });

  const remove = useMutation({
    mutationFn: (id) => aiReportsApi.remove(id),
    onSuccess: (_result, id) => {
      if (id === reportId) setReportId(null);
      queryClient.invalidateQueries({ queryKey: recentKey });
    },
    onError: (error) => toastError(error?.message || 'The report could not be deleted.'),
  });

  const exportAs = async (kind) => {
    if (!report?.content) return;
    setExporting(kind);
    try {
      if (kind === 'pdf') await downloadPdf(previewRef.current, reportFileName(report, 'pdf'));
      else await downloadPpt(report.content, reportFileName(report, 'pptx'));
    } catch (error) {
      toastError(error?.message || 'The file could not be created.');
    } finally {
      setExporting(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.content);
      toast({ title: 'Report copied as Markdown.' });
    } catch {
      toastError('Copying isn’t allowed in this browser.');
    }
  };

  const status = statusQuery.data;
  const unavailable = status && !status.available;
  const recent = recentQuery.data || [];

  if (!aiEnabled) return null;
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="h-9 gap-1.5" disabled={!entity?.id}>
        <FileText className="w-3.5 h-3.5" /> Reports
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn('max-h-[90vh] flex flex-col', report ? 'max-w-4xl' : 'max-w-2xl')}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {report ? (
                <button type="button" onClick={() => setReportId(null)} className="text-slate-500 hover:text-slate-800" aria-label="Back to report types">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : <FileText className="w-5 h-5 text-indigo-500" />}
              {report ? report.title : `Reports for ${entity?.name || ''}`}
            </DialogTitle>
          </DialogHeader>

          {!report && (
            <div className="overflow-y-auto -mx-1 px-1">
              {unavailable ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 mb-4"><AssistantUnavailable status={status} /></div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
                    <label htmlFor="report-since">Changes since</label>
                    <Input id="report-since" type="date" value={since} min={daysAgo(90)} max={isoDay(new Date())}
                      onChange={(event) => setSince(event.target.value || daysAgo(7))} className="h-8 w-40" />
                    <span className="text-xs text-slate-400">Reports are written by AI from what you can see.</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {types.map((type) => {
                      const starting = create.isPending && create.variables?.type === type.id;
                      return (
                        <button key={type.id} type="button" onClick={() => create.mutate({ type: type.id })} disabled={create.isPending || !status}
                          className={cn('text-left p-4 rounded-xl border-2 hover:shadow-md transition-all disabled:opacity-60', type.color, !create.isPending && 'hover:scale-[1.02]')}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">{type.title}</span>
                            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 opacity-50" />}
                          </div>
                          <p className="text-xs opacity-75 leading-relaxed">{type.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {recent.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your recent reports</p>
                  <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {recent.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <button type="button" onClick={() => setReportId(item.id)} className="flex-1 text-left min-w-0">
                          <span className="font-medium text-slate-800">{TYPE_TITLES[item.report_type] || item.title}</span>
                          <span className="text-xs text-slate-500 ml-2">
                            since {item.since} · {new Date(item.created_at).toLocaleString()}
                            {item.status === 'FAILED' && <span className="text-red-600"> · failed</span>}
                            {isActive(item) && <span className="text-indigo-600"> · writing…</span>}
                          </span>
                        </button>
                        <button type="button" onClick={() => remove.mutate(item.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete report">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {report && isActive(report) && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              {report.progress || 'Waiting to start…'}
              <span className="text-xs text-slate-400">Longer reports can take up to a minute.</span>
            </div>
          )}

          {report?.status === 'FAILED' && (
            <div className="flex flex-col items-center gap-3 py-12 text-sm">
              <p className="text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{report.error}</p>
              <Button size="sm" variant="outline" onClick={() => create.mutate({ type: report.report_type, regenerate: true })} disabled={create.isPending}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try again
              </Button>
            </div>
          )}

          {report?.status === 'DONE' && report.content && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => exportAs('pdf')} disabled={!!exporting} className="bg-[#002046] hover:bg-[#003070]">
                  {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />} PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportAs('ppt')} disabled={!!exporting}>
                  {exporting === 'ppt' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5 mr-1.5" />} PowerPoint
                </Button>
                <Button size="sm" variant="outline" onClick={copy}><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy</Button>
                <Button size="sm" variant="ghost" onClick={() => create.mutate({ type: report.report_type, regenerate: true })} disabled={create.isPending}>
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', create.isPending && 'animate-spin')} /> Write again
                </Button>
                <span className="ml-auto text-xs text-slate-400">
                  AI-written · since {report.since} · {new Date(report.finished_at || report.created_at).toLocaleString()}
                </span>
              </div>
              <div className="overflow-y-auto border border-slate-200 rounded-lg">
                <div ref={previewRef} className="bg-white p-6">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents(() => setOpen(false))}>{report.content}</ReactMarkdown>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
