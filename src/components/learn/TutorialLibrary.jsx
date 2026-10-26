import React from 'react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { LIBRARY } from '@/tutorials/content';

const NAVY = '#002046';

export function TutorialCard({ tutorial, onOpen, kicker = undefined }) {
  return (
    <button type="button" onClick={() => onOpen(tutorial.id)}
      className="group text-left bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all flex flex-col">
      {kicker && <p className="text-[11px] font-bold uppercase tracking-wider text-[#c87b14] mb-1">{kicker}</p>}
      <h3 className="text-sm font-semibold" style={{ color: NAVY }}>{tutorial.title}</h3>
      <p className="text-xs text-slate-500 mt-0.5 flex-1">{tutorial.summary}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>{tutorial.minutes} min · {tutorial.steps.length} {tutorial.steps.length === 1 ? 'step' : 'steps'}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

/** Every feature tutorial, grouped by area of the app. */
export default function TutorialLibrary({ onOpen, onBack }) {
  return (
    <div className="max-w-5xl mx-auto">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="w-4 h-4" /> Learn & Support
      </button>
      <h1 className="mt-3 text-2xl font-bold" style={{ color: NAVY }}>Tutorial Library</h1>
      <p className="text-sm text-slate-500 mt-1">Step-by-step guides with screenshots for every part of Row.</p>
      <div className="mt-6 space-y-8">
        {LIBRARY.map(group => (
          <section key={group.id}>
            <h2 className="text-base font-bold" style={{ color: NAVY }}>{group.title}</h2>
            <p className="text-xs text-slate-500 mb-3">{group.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.tutorials.map(t => <TutorialCard key={t.id} tutorial={t} onOpen={onOpen} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
