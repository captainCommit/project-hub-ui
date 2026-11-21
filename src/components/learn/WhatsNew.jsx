import React from 'react';
import { ChevronLeft, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAVY = '#002046';

// Release notes, newest first. Add an entry when something people will notice ships.
const RELEASES = [
  {
    date: 'November 2026',
    items: [
      { area: 'Project schedule', text: 'Comment on any task from the sheet: a sidebar opens with the conversation, and typing @ tags a teammate, who is notified.' },
      { area: 'Project schedule', text: 'Assigned To shows the hours estimated for each person, and asks for them when you assign someone.' },
      { area: 'Project schedule', text: 'Related Record links a task to risks, issues, assumptions, dependencies, decisions and change requests.' },
      { area: 'Project schedule', text: 'Gantt critical path now follows task dependencies and flags critical RAID items linked to each task.' },
      { area: 'Project schedule', text: 'Board columns can be renamed, recoloured, added and removed (account owners), and tasks added straight into a column.' },
      { area: 'Project schedule', text: 'Audit shows which tasks are overdue or coming due, with a Nudge button that reminds the assignees. Change history is one click away.' },
      { area: 'Resources', text: 'New Overview with allocation health and key insights, a Capacity directory with a Health column, and an Availability view by person or by department that flags clashing time off.' },
      { area: 'Portfolios & programs', text: 'Redesigned dashboards with performance tables, critical and high RAID items, a timeline with key milestones, budget and resourcing.' },
      { area: 'Templates', text: 'Templates now carry starter tasks that are copied into new projects. Save a project as a template, duplicate one, preview it, or set your default.' },
      { area: 'RAID', text: 'Assumptions have a priority, like the other RAID logs.' },
      { area: 'Help Center', text: 'Tell us you are open to a phone call when you submit a ticket.' },
    ],
  },
];

export default function WhatsNew({ onBack }) {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500"><ChevronLeft className="w-4 h-4" /> Help Center</Button>
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-lg bg-orange-50 flex items-center justify-center"><Megaphone className="w-6 h-6 text-[#c87b14]" /></span>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>What's New</h1>
          <p className="text-sm text-slate-500">Recent updates and new features in Row.</p>
        </div>
      </div>
      {RELEASES.map(release => (
        <section key={release.date} className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold mb-3" style={{ color: NAVY }}>{release.date}</h2>
          <ul className="space-y-3">
            {release.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-40 font-semibold" style={{ color: NAVY }}>{item.area}</span>
                <span className="text-slate-600">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
