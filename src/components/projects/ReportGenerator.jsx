import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';

const REPORT_TYPES = [
  {
    id: 'weekly_status',
    title: 'Weekly Status Report',
    description: 'Concise weekly summary of project progress, highlights, and blockers.',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    accent: '#3b82f6',
  },
  {
    id: 'steering_committee',
    title: 'Steering Committee Update',
    description: 'Executive-level update covering key decisions, risks, and milestones.',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    accent: '#8b5cf6',
  },
  {
    id: 'executive_dashboard',
    title: 'Executive Dashboard Summary',
    description: 'High-level portfolio health overview for C-suite and senior leadership.',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    accent: '#f59e0b',
  },
  {
    id: 'raid',
    title: 'RAID Report',
    description: 'All risks, issues, assumptions, decisions, and change requests for the selected project.',
    color: 'bg-rose-50 border-rose-200 text-rose-700',
    accent: '#e11d48',
  },
];

const PROGRAM_REPORT_TYPE = {
  id: 'program_health',
  title: 'Program Health Summary',
  description: 'Health summary for every project in this program, with all associated risks, issues, assumptions, decisions, and changes.',
  color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  accent: '#10b981',
};

const PORTFOLIO_REPORT_TYPE = {
  id: 'portfolio_health',
  title: 'Portfolio Health Summary',
  description: 'Health summary for every program and project in this portfolio, with all associated risks, issues, assumptions, decisions, and changes.',
  color: 'bg-amber-50 border-amber-200 text-amber-700',
  accent: '#f59e0b',
};

const FORMAT_OPTIONS = [
  { id: 'pdf', label: 'PDF', icon: '📄' },
  { id: 'ppt', label: 'PPT', icon: '📊' },
];

function buildRaidAndSprintContext(project, risks, issues, assumptions, decisions, changeRequests, sprints, stories) {
  const pid = project?.id;
  const projRisks = risks.filter(r => r.project_id === pid);
  const projIssues = issues.filter(i => i.project_id === pid);
  const projAssumptions = (assumptions || []).filter(a => a.project_id === pid);
  const projDecisions = (decisions || []).filter(d => d.project_id === pid);
  const projChangeRequests = (changeRequests || []).filter(c => c.project_id === pid);
  const projSprints = (sprints || []).filter(s => s.project_id === pid);
  const projStories = (stories || []).filter(s => projSprints.some(sp => sp.id === s.sprint_id));

  const riskSummary = projRisks.map(r => `- [${r.priority}] ${r.title}: ${r.description || ''}`).join('\n');
  const issueSummary = projIssues.map(i => `- [${i.priority}] ${i.title}: ${i.description || ''}`).join('\n');
  const assumptionSummary = projAssumptions.map(a => `- [${a.status}] ${a.description}`).join('\n');
  const decisionSummary = projDecisions.map(d => `- [${d.status}] ${d.decision}`).join('\n');
  const changeSummary = projChangeRequests.map(c => `- [${c.status}] ${c.title}`).join('\n');

  const completedSprints = projSprints.filter(s => s.status === 'completed').length;
  const activeSprint = projSprints.find(s => s.status === 'active');
  const activeSprintStories = activeSprint ? projStories.filter(s => s.sprint_id === activeSprint.id) : [];
  const activeSprintDone = activeSprintStories.filter(s => s.status === 'done').length;

  const sprintSummary = projSprints.length > 0
    ? `Total Sprints: ${projSprints.length}. Completed Sprints: ${completedSprints}.${activeSprint ? ` Sprint In Progress: "${activeSprint.name}" (${activeSprintDone}/${activeSprintStories.length} tasks completed).` : ' No sprint currently in progress.'}`
    : 'No sprints associated with this project.';

  return {
    riskSummary, issueSummary, assumptionSummary, decisionSummary, changeSummary, sprintSummary,
    projRisks, projIssues, projAssumptions, projDecisions, projChangeRequests, projSprints,
  };
}

function buildPrompts(project, program, tasks, risks, issues, assumptions, decisions, changeRequests, sprints, stories) {
  const taskSummary = tasks.map(t => `- ${t.title} [${t.status}]${t.due_date ? ` due ${t.due_date}` : ''}${t.assignee ? ` (${t.assignee})` : ''}`).join('\n');
  const ctx = buildRaidAndSprintContext(project, risks, issues, assumptions, decisions, changeRequests, sprints, stories);
  const { riskSummary, issueSummary, assumptionSummary, decisionSummary, changeSummary, sprintSummary, projRisks, projIssues } = ctx;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const projectName = project?.name || 'Project';
  const programName = program?.name || 'N/A';
  const raidBlock = `Risks:\n${riskSummary || 'None.'}\nIssues:\n${issueSummary || 'None.'}\nAssumptions:\n${assumptionSummary || 'None.'}\nDecisions:\n${decisionSummary || 'None.'}\nChange Requests:\n${changeSummary || 'None.'}\nSprint Status: ${sprintSummary}`;

  return {
    weekly_status: `Generate a professional Weekly Status Report in HTML format for project "${projectName}". Program: ${programName}. Progress: ${progress}% (${completedTasks}/${totalTasks} tasks done).\nTasks:\n${taskSummary || 'None.'}\n${raidBlock}\nInclude: Executive Summary, Progress This Week, Key Highlights, Blockers/Risks, Assumptions & Decisions, Sprint Delivery Status, Next Steps. Use professional HTML with inline CSS, Color scheme: navy #002046 headers, orange #c87b14 accents, white #ffffff background. Clean professional tables.`,
    steering_committee: `Generate a professional Steering Committee Update in HTML for project "${projectName}". Program: ${programName}. Progress: ${progress}%.\nTasks:\n${taskSummary || 'None.'}\n${raidBlock}\nInclude: Project Overview, Key Decisions Required, Milestone Status, Risk & Issue Register table, Assumption Log, Change Request Log, Sprint Delivery Status, Financial Status placeholder, Recommendations. Use formal HTML, Color scheme: navy #002046 for header backgrounds and borders, orange #c87b14 for key highlights, white #ffffff background.`,
    executive_dashboard: `Generate an Executive Dashboard Summary in HTML for project "${projectName}". Program: ${programName}. Progress: ${progress}%. Tasks: ${completedTasks} done, ${tasks.filter(t => t.status === 'in_progress').length} in progress, ${tasks.filter(t => t.status === 'todo').length} not started. Critical Risks: ${projRisks.filter(r => r.priority === 'critical').length}. Open Issues: ${projIssues.filter(i => i.status !== 'closed').length}.\n${raidBlock}\nInclude: KPI Summary Cards, Project Health RAG indicator, Top Priorities, RAID Summary (risks, issues, assumptions, decisions, change requests), Sprint Delivery Status, Key Metrics table. Modern HTML with inline CSS, Color scheme: navy #002046 for card headers, orange #c87b14 for KPI accents, white #ffffff background. Use green/amber/red for RAG indicators.`,
    program_health: `Generate a detailed Program Health Summary in HTML for program "${programName}" / project "${projectName}". Progress: ${progress}%. Tasks: ${completedTasks} done, ${tasks.filter(t => t.status === 'in_progress').length} in progress, ${tasks.filter(t => t.status === 'todo').length} todo. Risks: Critical(${projRisks.filter(r => r.priority === 'critical').length}), High(${projRisks.filter(r => r.priority === 'high').length}), Medium(${projRisks.filter(r => r.priority === 'medium').length}).\n${raidBlock}\nInclude: Program Overview, Schedule Health, Risk Register Table, Issue Register Table, Assumption Log, Decision Log, Change Request Log, Sprint Delivery Status, Upcoming Milestones. Use Color scheme: navy #002046 for headers, orange #c87b14 for section dividers, white #ffffff background.`,
    raid: `Generate a comprehensive RAID Report in HTML for project "${projectName}" (Program: ${programName}).\n${raidBlock}\nInclude clean HTML tables for each category: Risks (ID, priority, status, description), Issues (ID, priority, status, description), Assumptions (status, description), Decisions (status, decision), Change Requests (status, title). If a category has no items, state "None." Use professional HTML with inline CSS, Color scheme: navy #002046 headers, orange #c87b14 accents, white #ffffff background.`,
  };
}

function buildPptPrompts(project, program, tasks, risks, issues, assumptions, decisions, changeRequests, sprints, stories) {
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const ctx = buildRaidAndSprintContext(project, risks, issues, assumptions, decisions, changeRequests, sprints, stories);

  const base = `Return ONLY valid JSON (no markdown fences) in this exact format:
{"title":"Report Title","slides":[{"title":"Slide Title","bullets":["bullet 1","bullet 2"]}]}
Generate a PowerPoint presentation for project "${project?.name || 'Project'}" (Program: ${program?.name || 'N/A'}).
Progress: ${progress}% (${completedTasks}/${totalTasks} tasks).
Top risks: ${ctx.projRisks.slice(0, 3).map(r => r.title).join(', ') || 'None'}.
Top issues: ${ctx.projIssues.slice(0, 3).map(i => i.title).join(', ') || 'None'}.
Top assumptions: ${ctx.projAssumptions.slice(0, 3).map(a => a.description).join(', ') || 'None'}.
Top decisions: ${ctx.projDecisions.slice(0, 3).map(d => d.decision).join(', ') || 'None'}.
Change requests: ${ctx.projChangeRequests.slice(0, 3).map(c => c.title).join(', ') || 'None'}.
Sprint status: ${ctx.sprintSummary}`;

  const slideTypes = {
    weekly_status: base + ' Include slides: Title, Executive Summary, Progress Update, Key Highlights, Risks & Blockers, Assumptions & Decisions, Sprint Status, Next Steps (7-8 slides, 4-6 bullets each).',
    steering_committee: base + ' Include slides: Title, Project Overview, Key Decisions Required, Milestone Status, Risk Register, Issue Register, Change Requests, Sprint Status, Recommendations (8-9 slides).',
    executive_dashboard: base + ' Include slides: Title, Executive Summary, KPI Dashboard, Project Health Status, Top Priorities, RAID Summary, Sprint Status, Financial Overview, Next Steps (8 slides).',
    program_health: base + ' Include slides: Title, Program Overview, Schedule Health, Resource Summary, Risk Register, Issue Register, Assumption & Decision Log, Sprint Status, Upcoming Milestones, Health Score (9 slides).',
    raid: base + ' Include slides: Title, Risk Register, Issue Register, Assumption Log, Decision Log, Change Request Log, Summary (6-7 slides, list each item as a bullet with its status/priority).',
  };
  return slideTypes;
}

function buildScopedHealthPrompt(scopeLabel, entityName, childProjects, risks, issues, assumptions, decisions, changeRequests) {
  const sections = childProjects.map(proj => {
    const ctx = buildRaidAndSprintContext(proj, risks, issues, assumptions, decisions, changeRequests, [], []);
    return `Project: "${proj.name}" [${proj.status}]\nRisks:\n${ctx.riskSummary || 'None.'}\nIssues:\n${ctx.issueSummary || 'None.'}\nAssumptions:\n${ctx.assumptionSummary || 'None.'}\nDecisions:\n${ctx.decisionSummary || 'None.'}\nChange Requests:\n${ctx.changeSummary || 'None.'}`;
  }).join('\n\n');
  const completed = childProjects.filter(p => p.status === 'completed').length;
  return `Generate a detailed ${scopeLabel} Health Summary in HTML for ${entityName}. It contains ${childProjects.length} project(s), ${completed} completed.\n\nPer-project details:\n${sections || 'No projects.'}\n\nInclude: Overview, overall health RAG indicator, a summary table listing every project with its status, and for each project a breakdown of its risks, issues, assumptions, decisions, and change requests (or "None." if empty). Use professional HTML with inline CSS, Color scheme: navy #002046 headers, orange #c87b14 accents, white #ffffff background, clean tables.`;
}

async function generatePdf(html, filename) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;background:#fff;';
  container.innerHTML = html;
  document.body.appendChild(container);
  await new Promise(r => setTimeout(r, 300));
  const canvas = await html2canvas(container, { scale: 1.5, useCORS: true, logging: false });
  document.body.removeChild(container);
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  let y = 0;
  while (y < imgH) {
    if (y > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, -y, imgW, imgH);
    y += pageH;
  }
  pdf.save(filename);
}

async function generatePpt(slidesJson, reportType, projectName) {
  const prs = new pptxgen();
  prs.layout = 'LAYOUT_WIDE';
  const accent = '#002046';
  const accentBar = 'c87b14';

  slidesJson.slides.forEach((slideData, idx) => {
    const slide = prs.addSlide();
    // Background
    slide.background = { color: idx === 0 ? accent.replace('#', '') : 'FFFFFF' };
    // Title
    slide.addText(slideData.title, {
      x: 0.5, y: idx === 0 ? 1.5 : 0.3,
      w: '90%', h: idx === 0 ? 1.2 : 0.7,
      fontSize: idx === 0 ? 32 : 22,
      bold: true,
      color: idx === 0 ? 'FFFFFF' : '1e293b',
      fontFace: 'Calibri',
    });
    if (idx === 0 && slidesJson.title) {
      slide.addText(slidesJson.title, {
        x: 0.5, y: 0.5, w: '90%', h: 0.8,
        fontSize: 18, color: 'FFFFFF', fontFace: 'Calibri', italic: true,
      });
    }
    // Bullets
    if (slideData.bullets?.length && idx > 0) {
      const bullets = slideData.bullets.map(b => ({ text: b, options: { bullet: true, fontSize: 16, color: '334155', paraSpaceAfter: 8 } }));
      slide.addText(bullets, { x: 0.5, y: 1.2, w: '90%', h: 4.5, fontFace: 'Calibri', valign: 'top' });
    }
    // Accent bar for non-title slides
    if (idx > 0) {
      slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: accentBar } });
    }
  });

  await prs.writeFile({ fileName: `${reportType}_${projectName?.replace(/\s+/g, '_') || 'report'}_${new Date().toISOString().slice(0, 10)}.pptx` });
}

export default function ReportGenerator({ scope = 'project', project, program, portfolio, projects = [], programs = [], tasks = [], risks = [], issues = [], assumptions = [], decisions = [], changeRequests = [], sprints = [], stories = [] }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [format, setFormat] = useState('pdf');

  const reportTypes = scope === 'program' ? [PROGRAM_REPORT_TYPE] : scope === 'portfolio' ? [PORTFOLIO_REPORT_TYPE] : REPORT_TYPES;

  const generate = async (reportType) => {
    setGenerating(reportType.id);
    const entityName = scope === 'program' ? (program?.name || 'report') : scope === 'portfolio' ? (portfolio?.name || 'report') : (project?.name || 'report');

    try {
      if (reportType.id === 'program_health' || reportType.id === 'portfolio_health') {
        const childProjects = reportType.id === 'program_health'
          ? projects.filter(p => p.program_id === program?.id)
          : projects.filter(p => p.portfolio_id === portfolio?.id || programs.filter(pg => pg.portfolio_id === portfolio?.id).some(pg => pg.id === p.program_id));
        const scopeLabel = reportType.id === 'program_health' ? 'Program' : 'Portfolio';
        const prompt = buildScopedHealthPrompt(scopeLabel, `${scopeLabel.toLowerCase()} "${entityName}"`, childProjects, risks, issues, assumptions, decisions, changeRequests);
        const html = await base44.integrations.Core.InvokeLLM({ prompt });
        const htmlStr = typeof html === 'string' ? html : JSON.stringify(html);
        await generatePdf(htmlStr, `${reportType.id}_${entityName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
      } else if (format === 'ppt') {
        const proj_program = programs.find(p => p.id === project?.program_id);
        const pptPrompts = buildPptPrompts(project, proj_program, tasks, risks, issues, assumptions, decisions, changeRequests, sprints, stories);
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: pptPrompts[reportType.id],
          response_json_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              slides: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } } } } }
            }
          }
        });
        await generatePpt(result, reportType.id, entityName);
      } else {
        const proj_program = programs.find(p => p.id === project?.program_id);
        const prompts = buildPrompts(project, proj_program, tasks, risks, issues, assumptions, decisions, changeRequests, sprints, stories);
        const html = await base44.integrations.Core.InvokeLLM({ prompt: prompts[reportType.id] });
        const htmlStr = typeof html === 'string' ? html : JSON.stringify(html);
        await generatePdf(htmlStr, `${reportType.id}_${entityName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
      }
      setOpen(false);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="h-9 gap-1.5">
        <FileText className="w-3.5 h-3.5" /> Reports
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Generate Report
            </DialogTitle>
          </DialogHeader>

          {/* Format selector */}
          {scope === 'project' && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-slate-500 mr-1">Format:</span>
              {FORMAT_OPTIONS.map(f => (
                <button key={f.id} onClick={() => setFormat(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${format === f.id ? 'bg-[#002046] text-white border-[#002046]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                  <span>{f.icon}</span> {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {reportTypes.map(rt => (
              <button key={rt.id} onClick={() => generate(rt)} disabled={!!generating}
                className={`text-left p-4 rounded-xl border-2 hover:shadow-md transition-all ${rt.color} ${generating === rt.id ? 'opacity-75' : 'hover:scale-[1.02]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{rt.title}</span>
                  {generating === rt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 opacity-50" />}
                </div>
                <p className="text-xs opacity-75 leading-relaxed">{rt.description}</p>
              </button>
            ))}
          </div>

          {generating && (
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              Generating {format.toUpperCase()} report with AI… this may take a moment.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}