import { forwardRef, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, BookOpen, Calendar, CalendarCheck, CalendarClock, Check,
  CheckCircle2, CircleDot, ClipboardCheck, ClipboardList, Diamond, Flag, Gavel, Layers, Link2, Package, RefreshCw, Scale, TrendingUp,
} from 'lucide-react';
import GanttChart from '@/components/projects/GanttChart';
import { MUTED, NAVY, Pill, PriorityPill, TONES } from '@/components/projects/DirectoryKit';
import { executiveSummary, formatDay, reportTitle } from '@/lib/reporting';

const CARD = 'bg-white rounded-xl border border-[#E6ECF4]';
const SHORT_LIST = 5;

const STATUS_TONES = {
  approved: 'green', complete: 'green', completed: 'green', implemented: 'green', validated: 'green', resolved: 'green',
  on_track: 'green', in_review: 'blue', open: 'blue', mitigating: 'blue', escalated: 'orange', blocked: 'amber', deferred: 'amber', at_risk: 'amber', pending: 'amber',
  cancelled: 'grey', draft: 'grey', closed: 'grey',
};
const statusKey = (value) => String(value || '').toLowerCase().replace(/[^a-z]+/g, '_');
const statusText = (value) => { const text = String(value || '—').replace(/_/g, ' '); return text.charAt(0).toUpperCase() + text.slice(1); };
function StatusPill({ value }) {
  return <Pill tone={STATUS_TONES[statusKey(value)] || 'grey'} className="!py-0.5 text-xs">{statusText(value)}</Pill>;
}

// One colour per status, whichever statuses are showing.
const SEGMENT_COLORS = { in_review: '#2C80F4', approved: '#1E9E62', implemented: '#8B5CF6', deferred: '#c87b14', cancelled: '#D9486E' };
const segmentColor = (key) => SEGMENT_COLORS[key] || '#CBD5E1';

function Tile({ icon: Icon, tone, value, label }) {
  const colors = TONES[tone];
  return (
    <div className="rounded-xl px-4 py-3.5 flex items-center gap-3 min-w-0" style={{ backgroundColor: colors.bg }}>
      <Icon className="w-6 h-6 flex-shrink-0" style={{ color: colors.fg }} />
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight truncate" style={{ color: NAVY }}>{value}</p>
        <p className="text-[13px] truncate" style={{ color: NAVY }}>{label}</p>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, right = null, children, className = '' }) {
  return (
    <section className={`${CARD} p-4 min-w-0 ${className}`}>
      <div className="flex items-center gap-2.5 mb-3">
        {Icon && <Icon className="w-5 h-5 flex-shrink-0" style={{ color: NAVY }} />}
        <h3 className="text-base font-bold flex-1 min-w-0" style={{ color: NAVY }}>{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function FooterLink({ to = undefined, onClick = undefined, children }) {
  const className = 'inline-flex items-center gap-1 text-[13px] font-medium mt-3 hover:underline';
  const body = <>{children} <ArrowRight className="w-3.5 h-3.5" /></>;
  if (to) return <Link to={to} className={className} style={{ color: NAVY }}>{body}</Link>;
  return <button type="button" onClick={onClick} className={className} style={{ color: NAVY }}>{body}</button>;
}

/** A plain table. columns: [{ key, label, render?, className? }]. The scope's Project / Program column goes first. */
function ReportTable({ columns, rows, groupLabel = '', empty, navy = false, rowClassName = undefined }) {
  const all = groupLabel ? [{ key: 'group', label: groupLabel }, ...columns] : columns;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={navy ? { backgroundColor: NAVY } : { backgroundColor: '#F1F5F9' }}>
            {all.map(c => <th key={c.key} className={`text-left font-semibold px-2.5 py-2 whitespace-nowrap ${navy ? 'text-white' : ''}`} style={navy ? undefined : { color: NAVY }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={all.length} className="px-2.5 py-6 text-center" style={{ color: MUTED }}>{empty}</td></tr>}
          {rows.map(row => (
            <tr key={row.id} className={`border-b border-slate-100 last:border-b-0 ${rowClassName ? rowClassName(row) : ''}`}>
              {all.map(c => <td key={c.key} className={`px-2.5 py-2 align-middle ${c.className || ''}`} style={{ color: NAVY }}>{c.render ? c.render(row) : (row[c.key] || '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NewBadge = () => <Pill tone="sand" className="!py-0 text-[11px] ml-1.5">New</Pill>;

function Ring({ pct, size = 44, stroke = 6, children = null }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, pct || 0));
  return (
    <span className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E6EBF2" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1E9E62" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(value / 100) * circumference} ${circumference}`} />
      </svg>
      {children && <span className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</span>}
    </span>
  );
}

/** Share of items by status. The legend beside it always lists every count. */
function StatusDonut({ title, total, noun, segments }) {
  const [hovered, setHovered] = useState('');
  const size = 148;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = segments.filter(s => s.count > 0);
  const gap = shown.length > 1 ? 2 : 0;
  let offset = 0;
  const active = shown.find(s => s.key === hovered);
  return (
    <SectionCard title={<>{title} <span className="font-normal">(Total: {total})</span></>}>
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${title}: ${segments.map(s => `${s.label} ${s.count}`).join(', ')}`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E6EBF2" strokeWidth={stroke} />
            {shown.map(s => {
              const length = (s.count / total) * circumference;
              const dash = Math.max(length - gap, 0.5);
              const element = (
                <circle key={s.key} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={segmentColor(s.key)} strokeWidth={hovered === s.key ? stroke + 3 : stroke}
                  strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset}
                  onMouseEnter={() => setHovered(s.key)} onMouseLeave={() => setHovered('')} className="cursor-default" />
              );
              offset += length;
              return element;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
            <span className="text-3xl font-bold leading-none" style={{ color: NAVY }}>{active ? active.count : total}</span>
            <span className="text-xs mt-1" style={{ color: NAVY }}>{active ? active.label : noun}</span>
          </div>
        </div>
        <ul className="flex-1 min-w-[180px] space-y-1.5">
          {segments.map(s => (
            <li key={s.key} className="flex items-center gap-2 text-[13px]" style={{ color: NAVY }} onMouseEnter={() => setHovered(s.key)} onMouseLeave={() => setHovered('')}>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: segmentColor(s.key) }} />
              <span className="flex-1">{s.label}</span>
              <span className="tabular-nums"><strong>{s.count}</strong> ({s.pct}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}

function ExpandableTaskCard({ icon, title, rows, dateLabel, groupLabel, noun }) {
  const [all, setAll] = useState(false);
  const columns = [
    { key: 'title', label: 'Task' },
    { key: 'owner', label: 'Owner', className: 'whitespace-nowrap' },
    { key: 'date', label: dateLabel, className: 'whitespace-nowrap', render: r => formatDay(r.date) },
  ];
  return (
    <SectionCard icon={icon} title={`${title} (${rows.length})`}>
      <ReportTable columns={columns} rows={all ? rows : rows.slice(0, SHORT_LIST)} groupLabel={groupLabel} empty="Nothing for this period." />
      {rows.length > SHORT_LIST && <FooterLink onClick={() => setAll(v => !v)}>{all ? 'Show fewer' : `View all ${rows.length} ${noun}`}</FooterLink>}
    </SectionCard>
  );
}

export function StatusView({ report }) {
  const { status, scope } = report;
  const group = scope.groupLabel;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile icon={CheckCircle2} tone="green" value={status.completed.length} label="Tasks completed" />
        <Tile icon={Calendar} tone="blue" value={status.upcoming.length} label="Tasks next period" />
        <Tile icon={AlertTriangle} tone="red" value={status.raid.length} label="Open RAID items" />
        <Tile icon={Scale} tone="purple" value={status.governance.length} label="Open governance" />
        <Tile icon={Flag} tone="amber" value={status.milestones.length} label="Key deliverables" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ExpandableTaskCard icon={CheckCircle2} title="Tasks Completed This Period" rows={status.completed} dateLabel="Completed" groupLabel={group} noun="completed tasks" />
        <ExpandableTaskCard icon={Calendar} title="Tasks Coming Up Next Period" rows={status.upcoming} dateLabel="Due" groupLabel={group} noun="upcoming tasks" />
        <SectionCard icon={AlertTriangle} title={`RAID Summary (${status.raid.length} Open)`}>
          <ReportTable groupLabel={group} empty="No open RAID items." rows={status.raid.slice(0, SHORT_LIST)} columns={[
            { key: 'number', label: 'ID', className: 'whitespace-nowrap' },
            { key: 'type', label: 'Type' },
            { key: 'title', label: 'Title' },
            { key: 'priority', label: 'Priority', render: r => (r.priority ? <PriorityPill priority={r.priority} className="!py-0.5 text-xs" /> : '—') },
            { key: 'owner', label: 'Owner', className: 'whitespace-nowrap' },
            { key: 'status', label: 'Status', render: r => <StatusPill value={r.status} /> },
          ]} />
          <FooterLink to="/RiskLog">View RAID register</FooterLink>
        </SectionCard>
        <SectionCard icon={Scale} title={`Governance Summary (${status.governance.length} Open)`}>
          <ReportTable groupLabel={group} empty="No open decisions or changes." rows={status.governance.slice(0, SHORT_LIST)} columns={[
            { key: 'number', label: 'ID', className: 'whitespace-nowrap' },
            { key: 'type', label: 'Type' },
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status', render: r => <StatusPill value={r.status} /> },
            { key: 'owner', label: 'Owner', className: 'whitespace-nowrap' },
          ]} />
          <FooterLink to="/ChangeRegisterHub">View governance register</FooterLink>
        </SectionCard>
      </div>
      <SectionCard icon={Flag} title={`Milestones Summary (${status.milestones.length})`}>
        <ReportTable groupLabel={group} empty="No milestones or deliverables." rows={status.milestones} columns={[
          { key: 'title', label: 'Milestone' },
          { key: 'baseline', label: 'Baseline Date', className: 'whitespace-nowrap', render: r => formatDay(r.baseline) },
          { key: 'forecast', label: 'Forecast Date', className: 'whitespace-nowrap', render: r => formatDay(r.forecast) },
          { key: 'actual', label: 'Actual Date', className: 'whitespace-nowrap', render: r => formatDay(r.actual) },
          { key: 'status', label: 'Status', render: r => <StatusPill value={r.status} /> },
        ]} />
      </SectionCard>
    </div>
  );
}

const GANTT_LEGEND = [
  { icon: Flag, label: 'Phase', className: 'text-cyan-600' },
  { icon: Layers, label: 'Work Package', className: 'text-[#c87b14]' },
  { icon: CircleDot, label: 'Activity', className: 'text-blue-600' },
  { icon: Diamond, label: 'Milestone', className: 'text-purple-600' },
  { icon: Package, label: 'Deliverable', className: 'text-green-600' },
];

export function GanttView({ report }) {
  const { gantt } = report;
  const parents = useMemo(() => [...new Set(gantt.tasks.map(t => t.parent_task_id).filter(Boolean))], [gantt.tasks]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const expanded = parents.filter(id => !collapsed.has(id));
  const toggle = (id) => setCollapsed(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const variance = gantt.varianceDays;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile icon={CalendarCheck} tone="green" value={formatDay(gantt.plannedFinish)} label="Planned Finish" />
        <Tile icon={CalendarClock} tone="blue" value={formatDay(gantt.forecastFinish)} label="Forecast Finish" />
        <Tile icon={AlertTriangle} tone={variance > 0 ? 'red' : 'grey'} value={variance === null ? '—' : `${variance > 0 ? '+' : ''}${variance} days`} label="Schedule Variance" />
        <Tile icon={TrendingUp} tone="purple" value={`${gantt.progress}%`} label="Overall Progress" />
        <Tile icon={Diamond} tone="grey" value={gantt.milestones} label="Milestones" />
      </div>
      <section className={`${CARD} p-3`}>
        <div className="flex flex-col h-[560px]">
          <GanttChart tasks={gantt.tasks} project={{ name: report.scope.label }} expandedTasks={expanded} onToggleExpand={toggle} />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 px-1 text-xs" style={{ color: NAVY }}>
          {GANTT_LEGEND.map(({ icon: Icon, label, className }) => <span key={label} className="flex items-center gap-1.5"><Icon className={`w-3.5 h-3.5 ${className}`} /> {label}</span>)}
        </div>
      </section>
    </div>
  );
}

function SummaryNumbers({ cells }) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="grid text-[13px] font-semibold text-white" style={{ backgroundColor: NAVY, gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
        {cells.map(c => <div key={c.label} className="px-2 py-2.5 text-center">{c.label}</div>)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
        {cells.map(c => (
          <div key={c.label} className="px-2 py-4 flex items-center justify-center gap-2 border-r border-slate-100 last:border-r-0">
            {c.ring !== undefined && <Ring pct={c.ring} size={36} stroke={5} />}
            <span className="text-2xl font-bold" style={{ color: NAVY }}>{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RAID_ICONS = { Risk: [AlertTriangle, '#DC2626'], Issue: [AlertCircle, '#c87b14'], Dependency: [Link2, '#2C80F4'], Assumption: [Flag, '#002046'] };
function RaidTypeIcon({ type }) {
  const [Icon, color] = RAID_ICONS[type] || RAID_ICONS.Risk;
  return <Icon className="w-4 h-4" style={{ color }} aria-label={type} />;
}

export function DeliveryView({ report }) {
  const { requirements: req, tests, agile, linkedRaid, currentSprint: sprint, upcomingSprints } = report.delivery;
  const group = report.scope.groupLabel;
  const agileRows = [
    ['Completed sprints', agile.completed],
    ['Current sprint', agile.current],
    ['Upcoming sprints', agile.upcoming],
    ['User stories completed', `${agile.storiesDone} / ${agile.storiesTotal}`],
    ['Story points completed', `${agile.pointsDone} / ${agile.pointsTotal}`],
  ];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: NAVY }}>Delivery Summary</h2>
        <p className="text-[13px]" style={{ color: MUTED }}>Overview of requirements, testing, and agile delivery progress.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard icon={ClipboardList} title="Requirements">
          <SummaryNumbers cells={[{ label: 'Total', value: req.total }, { label: 'Validated', value: req.validated }, { label: 'In Review', value: req.inReview }, { label: '% Complete', value: `${req.pct}%`, ring: req.pct }]} />
        </SectionCard>
        <SectionCard icon={ClipboardCheck} title="Test Cases">
          <SummaryNumbers cells={[{ label: 'Total', value: tests.total }, { label: 'Passed', value: tests.passed }, { label: 'Failed', value: tests.failed }, { label: 'Not Executed', value: tests.notExecuted }, { label: '% Complete', value: `${tests.pct}%`, ring: tests.pct }]} />
        </SectionCard>
        <SectionCard icon={RefreshCw} title="Agile Delivery">
          <div className="flex flex-wrap items-center gap-6">
            <Ring pct={agile.pct} size={132} stroke={14}>
              <span className="text-2xl font-bold" style={{ color: NAVY }}>{agile.pct}%</span>
              <span className="text-xs" style={{ color: NAVY }}>Sprints<br />Complete</span>
            </Ring>
            <ul className="flex-1 min-w-[200px] divide-y divide-slate-100">
              {agileRows.map(([label, value]) => <li key={label} className="flex justify-between gap-3 py-1.5 text-[13px]" style={{ color: NAVY }}><span>{label}</span><strong>{value}</strong></li>)}
            </ul>
          </div>
        </SectionCard>
        <SectionCard icon={AlertTriangle} title="RAID Items">
          <ReportTable navy groupLabel={group} empty="No RAID items are linked to user stories." rows={linkedRaid} columns={[
            { key: 'type', label: 'Type', render: r => <RaidTypeIcon type={r.type} /> },
            { key: 'number', label: 'RAID ID', className: 'whitespace-nowrap' },
            { key: 'title', label: 'Title' },
            { key: 'story', label: 'User Story', className: 'whitespace-nowrap' },
            { key: 'status', label: 'Status', render: r => <StatusPill value={r.status} /> },
            { key: 'priority', label: 'Priority', render: r => (r.priority ? <PriorityPill priority={r.priority} className="!py-0.5 text-xs" /> : '—') },
          ]} />
        </SectionCard>
        <SectionCard icon={Calendar} title={sprint ? `Current Sprint – ${sprint.name}` : 'Current Sprint'} right={sprint ? <Pill tone="sand" className="!py-0.5 text-xs">In Progress</Pill> : null}>
          {!sprint ? <p className="text-[13px] py-6 text-center" style={{ color: MUTED }}>No sprint is running.</p> : (
            <>
              <p className="text-[13px]" style={{ color: MUTED }}>{sprint.group ? `${sprint.group} · ` : ''}{formatDay(sprint.start)} – {formatDay(sprint.end)}{sprint.daysLeft !== null ? ` (${sprint.daysLeft} day${sprint.daysLeft === 1 ? '' : 's'} left)` : ''}</p>
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#E6EBF2' }}><div className="h-full rounded-full" style={{ width: `${sprint.pct}%`, backgroundColor: '#1E9E62' }} /></div>
                <span className="text-xl font-bold" style={{ color: NAVY }}>{sprint.pct}%</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Tile icon={Layers} tone="blue" value={sprint.stories} label="User Stories" />
                <Tile icon={Check} tone="green" value={sprint.done} label="Completed" />
                <Tile icon={CircleDot} tone="blue" value={sprint.inProgress} label="In Progress" />
                <Tile icon={AlertCircle} tone="amber" value={sprint.notStarted} label="Not Started" />
              </div>
              <div className="flex justify-between text-[13px] mt-3" style={{ color: NAVY }}>
                <span>Story Points: <strong>{sprint.pointsDone} / {sprint.points}</strong></span>
                <span>Remaining: <strong>{sprint.points - sprint.pointsDone}</strong></span>
              </div>
            </>
          )}
        </SectionCard>
        <SectionCard icon={Calendar} title="Upcoming Sprints (Next 3)">
          <ReportTable groupLabel={group} empty="No upcoming sprints." rows={upcomingSprints} columns={[
            { key: 'name', label: 'Sprint', className: 'font-semibold whitespace-nowrap' },
            { key: 'duration', label: 'Duration', className: 'whitespace-nowrap', render: r => `${formatDay(r.start)} – ${formatDay(r.end)}` },
            { key: 'stories', label: 'Planned Stories', render: r => r.stories },
            { key: 'points', label: 'Planned Points', render: r => r.points },
          ]} />
        </SectionCard>
      </div>
    </div>
  );
}

const RAID_TILE_LOOK = { risks: ['red', AlertTriangle], assumptions: ['blue', BookOpen], issues: ['amber', AlertCircle], dependencies: ['purple', Link2] };

export function RaidView({ report }) {
  const { tiles, rows } = report.raid;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: NAVY }}>RAID Status</h2>
        <p className="text-[13px]" style={{ color: MUTED }}>Open Risks, Assumptions, Issues, and Dependencies, with new items this period and the change from the previous period.</p>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {tiles.map(tile => {
          const [tone, Icon] = RAID_TILE_LOOK[tile.key];
          const Arrow = tile.trend > 0 ? ArrowUpRight : ArrowDownRight;
          return (
            <div key={tile.key} className="rounded-xl p-4" style={{ backgroundColor: TONES[tone].bg }}>
              <div className="flex items-start gap-3">
                <Icon className="w-6 h-6 flex-shrink-0" style={{ color: TONES[tone].fg }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: NAVY }}>{tile.title}</p>
                  <p className="text-2xl font-bold" style={{ color: NAVY }}>{tile.open}</p>
                </div>
                <div className="text-right">
                  <Pill tone="sand" className="!py-0 text-[11px]">+{tile.fresh} New</Pill>
                  <p className="flex items-center justify-end gap-0.5 mt-2 text-sm font-bold" style={{ color: NAVY }} title="New items compared with the previous period">
                    {tile.trend !== 0 && <Arrow className="w-4 h-4" />}{tile.trend > 0 ? '+' : ''}{tile.trend}
                  </p>
                </div>
              </div>
              <p className="text-xs mt-2 truncate" style={{ color: NAVY }}>{tile.byStatus.map(s => `${s.label} ${s.count}`).join(' · ') || 'None open'}</p>
            </div>
          );
        })}
      </div>
      <section className={`${CARD} p-3`}>
        <ReportTable groupLabel={report.scope.groupLabel} empty="No open RAID items." rows={rows} columns={[
          { key: 'number', label: 'ID', className: 'whitespace-nowrap' },
          { key: 'type', label: 'Type', className: 'whitespace-nowrap', render: r => <span className="inline-flex items-center gap-1.5"><RaidTypeIcon type={r.type} /> {r.type}</span> },
          { key: 'title', label: 'Title', render: r => <Link to={`/RiskLog?tab=${r.tab}&id=${r.id}`} className="hover:underline">{r.title}</Link> },
          { key: 'priority', label: 'Priority', render: r => (r.priority ? <PriorityPill priority={r.priority} className="!py-0.5 text-xs" /> : '—') },
          { key: 'status', label: 'Status', render: r => <StatusPill value={r.status} /> },
          { key: 'owner', label: 'Owner', className: 'whitespace-nowrap' },
          { key: 'target', label: 'Target Date', className: 'whitespace-nowrap', render: r => (
            <>{r.overdue ? <span className="font-semibold text-red-600">{formatDay(r.target)} (Overdue)</span> : formatDay(r.target)}{r.isNew && <NewBadge />}</>
          ) },
        ]} />
      </section>
    </div>
  );
}

function GovernanceCounts({ icon, title, data }) {
  return (
    <SectionCard icon={icon} title={title}>
      <div className="grid grid-cols-2 text-center divide-x divide-slate-200">
        <div><p className="text-[13px]" style={{ color: NAVY }}>Total Approved</p><p className="text-3xl font-bold mt-1" style={{ color: NAVY }}>{data.approved}</p></div>
        <div><p className="text-[13px]" style={{ color: NAVY }}>Total Pending (In Review)</p><p className="text-3xl font-bold mt-1" style={{ color: NAVY }}>{data.pending}</p></div>
      </div>
    </SectionCard>
  );
}

export function GovernanceView({ report }) {
  const { decisions, changes } = report.governance;
  const group = report.scope.groupLabel;
  const statusAndNew = (r) => <span className="whitespace-nowrap"><StatusPill value={r.status} />{r.isNew && <NewBadge />}</span>;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: NAVY }}>Governance Status</h2>
        <p className="text-[13px]" style={{ color: MUTED }}>Overview of decisions and changes, and their progress through the governance lifecycle.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <GovernanceCounts icon={Gavel} title="Decisions" data={decisions} />
        <GovernanceCounts icon={ArrowLeftRight} title="Changes" data={changes} />
        <StatusDonut title="Decisions by Status" total={decisions.rows.length} noun="Decisions" segments={decisions.byStatus} />
        <StatusDonut title="Changes by Status" total={changes.rows.length} noun="Changes" segments={changes.byStatus} />
        <SectionCard icon={Gavel} title={`Decisions (${decisions.rows.length})`}>
          <ReportTable navy groupLabel={group} empty="No decisions." rows={decisions.rows} columns={[
            { key: 'number', label: 'ID', className: 'whitespace-nowrap' },
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status', render: statusAndNew },
            { key: 'decisionDate', label: 'Decision Date', className: 'whitespace-nowrap', render: r => formatDay(r.decisionDate) },
            { key: 'linked', label: 'Linked Change', className: 'whitespace-nowrap' },
          ]} />
        </SectionCard>
        <SectionCard icon={ArrowLeftRight} title={`Changes (${changes.rows.length})`}>
          <ReportTable navy groupLabel={group} empty="No changes." rows={changes.rows} columns={[
            { key: 'number', label: 'ID', className: 'whitespace-nowrap' },
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status', render: statusAndNew },
            { key: 'implementation', label: 'Impl. Status', className: 'whitespace-nowrap' },
            { key: 'linked', label: 'Linked Decision', className: 'whitespace-nowrap' },
            { key: 'target', label: 'Target Date', className: 'whitespace-nowrap', render: r => formatDay(r.target) },
          ]} />
        </SectionCard>
      </div>
    </div>
  );
}

/** The generated report as a page: rendered off screen and captured for the PDF. */
export const ReportDocument = forwardRef(function ReportDocument({ report, include, sections }, ref) {
  return (
    <div ref={ref} style={{ fontFamily: 'Segoe UI, sans-serif', color: NAVY, backgroundColor: '#ffffff' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>{reportTitle(report)}</h1>
      <p style={{ fontSize: 13, marginTop: 4 }}>Reporting Period: {report.period.label}</p>
      <p style={{ fontSize: 13 }}>{report.scope.managerLabel}: {report.scope.manager}</p>
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Overall Status: {report.overall.label}</p>
      {include.executive && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, borderBottom: '2px solid #c87b14', paddingBottom: 3, marginBottom: 6 }}>Executive Summary</h2>
          <ul style={{ fontSize: 13, paddingLeft: 18, listStyle: 'disc' }}>{executiveSummary(report).map(line => <li key={line}>{line}</li>)}</ul>
        </div>
      )}
      {sections.map(section => (
        <div key={section.key} style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, borderBottom: '2px solid #c87b14', paddingBottom: 3, marginBottom: 6 }}>{section.title}</h2>
          {section.rows.length === 0 ? <p style={{ fontSize: 13 }}>Nothing to report for this period.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr>{section.headers.map(h => <th key={h} style={{ backgroundColor: NAVY, color: '#ffffff', textAlign: 'left', padding: '5px 6px' }}>{h}</th>)}</tr></thead>
              <tbody>{section.rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} style={{ borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>{c}</td>)}</tr>)}</tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
});
