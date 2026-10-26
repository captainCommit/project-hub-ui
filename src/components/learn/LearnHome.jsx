import React from 'react';
import {
  ArrowRight, BookOpen, CalendarCheck, Clock, Compass, FolderPlus, LifeBuoy, Network, PlayCircle, ShieldAlert, Sparkles,
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
      <div className="flex items-start justify-between">
        <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon className="w-[18px] h-[18px]" style={{ color: NAVY }} />
        </span>
        <span className="text-xs text-slate-400">{lesson.minutes} min</span>
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: ORANGE }}>{lessonLabel(lesson.number)}</p>
      <h3 className="mt-1 text-[15px] font-semibold" style={{ color: NAVY }}>{lesson.title}</h3>
      <p className="text-sm text-slate-500 mt-0.5">{lesson.summary}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all" style={{ color: NAVY }}>
        Start lesson <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
}

function ExploreCard({ icon: Icon, title, sub, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-5 py-4 hover:shadow-md hover:border-slate-300 transition-all text-left">
      <span className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-[18px] h-[18px]" style={{ color: ORANGE }} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold" style={{ color: NAVY }}>{title}</span>
        <span className="block text-xs text-slate-500">{sub}</span>
      </span>
      <ArrowRight className="w-4 h-4 text-slate-400 ml-auto flex-shrink-0" />
    </button>
  );
}

/** The Help Center front page: the Getting Started lessons, then the Tutorial Library and support. */
export default function LearnHome({ onOpen, onLibrary, onContact, children = null }) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <section className="relative overflow-hidden rounded-2xl px-8 py-7 text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #00356F 100%)` }}>
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/5" />
        <span className="absolute right-6 top-6 text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-white/90">Beginner friendly</span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Your learning journey</p>
        <h2 className="mt-2 text-2xl font-bold">New to Row? Start here.</h2>
        <p className="mt-1 text-sm text-white/75 max-w-xl">
          Learn the essentials in {LESSONS.length} short lessons. Practice as you go and get ready to manage your first project.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => onOpen(LESSONS[0].id)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold hover:bg-white/90" style={{ color: NAVY }}>
            <PlayCircle className="w-4 h-4" /> Start learning
          </button>
          <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
            <Clock className="w-4 h-4" /> ~{totalMinutes} minutes · {LESSONS.length} lessons
          </span>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: NAVY }}>Getting Started with Row</h2>
          <span className="text-xs text-slate-400">Learn at your own pace</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LESSONS.map(lesson => <LessonCard key={lesson.id} lesson={lesson} onOpen={onOpen} />)}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3" style={{ color: NAVY }}>Explore more</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExploreCard icon={BookOpen} title="Tutorial Library" sub="Explore every Row feature" onClick={onLibrary} />
          <ExploreCard icon={LifeBuoy} title="Contact Support" sub="We're here to help" onClick={onContact} />
        </div>
      </section>

      {children}
    </div>
  );
}
