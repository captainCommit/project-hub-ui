import React from 'react';
import {
  ArrowRight, BookOpen, CalendarCheck, Clock, Compass, FolderPlus, Headphones, Ticket, Network, ShieldAlert, Sparkles, FileText, Megaphone,
} from 'lucide-react';
import { LESSONS } from '@/tutorials/content';

const NAVY = '#002046';
const ORANGE = '#c87b14';
export const LESSON_ICONS = { Compass, Network, FolderPlus, CalendarCheck, ShieldAlert, Sparkles };
const totalMinutes = LESSONS.reduce((sum, lesson) => sum + lesson.minutes, 0);

export const lessonLabel = (number) => `Lesson ${String(number).padStart(2, '0')}`;

function LessonCard({ lesson, onOpen }) {
  const Icon = LESSON_ICONS[lesson.icon] || BookOpen;
  return (
    <button type="button" onClick={() => onOpen(lesson.id)}
      className="group text-left bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all flex flex-col">
      <div className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6" style={{ color: NAVY }} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: ORANGE }}>{lessonLabel(lesson.number)}</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 flex-shrink-0" style={{ color: NAVY }}>
              <Clock className="w-3.5 h-3.5" /> {lesson.minutes} min
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold" style={{ color: NAVY }}>{lesson.title}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{lesson.summary}</p>
        </div>
      </div>
      <span className="mt-3 self-end inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-2.5 transition-all" style={{ color: NAVY }}>
        Start lesson <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
}

function SupportCard({ icon: Icon, tone, title, sub, action, onClick }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col">
      <div className="flex items-start gap-5">
        <span className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tone.bg }}>
          <Icon className="w-8 h-8" style={{ color: tone.fg }} />
        </span>
        <div>
          <h2 className="text-xl font-bold" style={{ color: NAVY }}>{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{sub}</p>
        </div>
      </div>
      <button type="button" onClick={onClick} className="mt-4 self-start inline-flex items-center gap-2 text-base font-bold hover:gap-3 transition-all" style={{ color: NAVY }}>
        {action} <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function ResourceCard({ icon: Icon, title, sub, onClick, tone }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 px-5 py-4 hover:shadow-md hover:border-slate-300 transition-all text-left">
      <span className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tone.bg }}>
        <Icon className="w-6 h-6" style={{ color: tone.fg }} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-bold" style={{ color: NAVY }}>{title}</span>
        <span className="block text-sm text-slate-500">{sub}</span>
      </span>
      <ArrowRight className="w-4 h-4 text-slate-400 ml-auto flex-shrink-0" />
    </button>
  );
}

/**
 * The Help Center front page: support entry points, the Getting Started lessons and further resources.
 * onSubmitTicket / onViewTickets open the support views; onKnowledgeBase / onWhatsNew the reference pages.
 */
export default function LearnHome({ onOpen, onLibrary, onSubmitTicket, onViewTickets, onKnowledgeBase, onWhatsNew, children = null }) {
  return (
    <div className="max-w-6xl mx-auto space-y-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SupportCard icon={Headphones} tone={{ bg: '#EDE9FE', fg: NAVY }} title="Get Support" sub="Report an issue, ask a question or request assistance."
          action="Submit a Ticket" onClick={onSubmitTicket} />
        <SupportCard icon={Ticket} tone={{ bg: '#DDF5E7', fg: '#0E9254' }} title="My Support Tickets" sub="Track requests, review responses and check resolution status."
          action="View My Tickets" onClick={onViewTickets} />
      </div>

      <section className="relative overflow-hidden rounded-2xl px-8 py-7 text-white flex flex-wrap items-center justify-between gap-4" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #00356F 100%)` }}>
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#F5B54A' }}>Your learning journey</p>
          <h2 className="mt-1 text-2xl font-bold">New to Row? Start here.</h2>
          <p className="mt-1 text-sm text-white/80">Learn the essentials in {LESSONS.length} short lessons — approximately {totalMinutes} minutes.</p>
        </div>
        <button type="button" onClick={() => onOpen(LESSONS[0].id)}
          className="relative inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-bold hover:bg-white/90" style={{ color: NAVY }}>
          Start Learning <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-xl font-bold" style={{ color: NAVY }}>Getting Started with Row</h2>
          <span className="text-sm text-slate-500">{LESSONS.length} lessons · ~{totalMinutes} minutes</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {LESSONS.map(lesson => <LessonCard key={lesson.id} lesson={lesson} onOpen={onOpen} />)}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3" style={{ color: NAVY }}>Additional Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResourceCard icon={BookOpen} tone={{ bg: '#FEF1DC', fg: ORANGE }} title="Tutorial Library" sub="Browse all tutorials and in-depth guides by module and topic." onClick={onLibrary} />
          <ResourceCard icon={FileText} tone={{ bg: '#E1EDFE', fg: NAVY }} title="Knowledge Base" sub="Find answers to common questions." onClick={onKnowledgeBase} />
          <ResourceCard icon={Megaphone} tone={{ bg: '#FEF1DC', fg: ORANGE }} title="What's New" sub="See recent updates and new features." onClick={onWhatsNew} />
        </div>
      </section>

      {children}
    </div>
  );
}
