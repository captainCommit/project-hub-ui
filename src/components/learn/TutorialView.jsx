import React from 'react';
import { ArrowRight, ChevronLeft, Clock, Lightbulb } from 'lucide-react';
import { LESSONS, LIBRARY, imageUrl } from '@/tutorials/content';
import { lessonLabel } from './LearnHome';

const NAVY = '#002046';
const ORANGE = '#c87b14';

/** What to read next: the next lesson, then the library; in the library, the next tutorial in the same area. */
function nextFor(tutorial) {
  if (tutorial.kind === 'lesson') {
    const next = LESSONS.find(l => l.number === tutorial.number + 1);
    return next ? { id: next.id, label: `${lessonLabel(next.number)}: ${next.title}` } : null;
  }
  const group = LIBRARY.find(g => g.tutorials.some(t => t.id === tutorial.id));
  const index = group ? group.tutorials.findIndex(t => t.id === tutorial.id) : -1;
  const next = group?.tutorials[index + 1];
  return next ? { id: next.id, label: next.title } : null;
}

/** One lesson or library tutorial: numbered steps, each with its screenshot. */
export default function TutorialView({ tutorial, onOpen, onBack, onLibrary }) {
  const next = nextFor(tutorial);
  const kicker = tutorial.kind === 'lesson' ? `Getting Started · ${lessonLabel(tutorial.number)}` : `Tutorial Library · ${tutorial.group}`;
  return (
    <article className="max-w-4xl mx-auto pb-10">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="w-4 h-4" /> {tutorial.kind === 'lesson' ? 'Learn & Support' : 'Tutorial Library'}
      </button>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: ORANGE }}>{kicker}</p>
      <h1 className="mt-1 text-2xl font-bold" style={{ color: NAVY }}>{tutorial.title}</h1>
      <p className="mt-1 text-sm text-slate-500">{tutorial.summary}</p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
        <Clock className="w-3.5 h-3.5" /> {tutorial.minutes} min · {tutorial.steps.length} {tutorial.steps.length === 1 ? 'step' : 'steps'}
      </p>

      <ol className="mt-6 space-y-6">
        {tutorial.steps.map((step, i) => (
          <li key={`${step.image}-${i}`} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ORANGE }}>{i + 1}</span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold" style={{ color: NAVY }}>{step.title}</h2>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{step.body}</p>
                {step.tip && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                    <Lightbulb className="w-3.5 h-3.5 mt-px flex-shrink-0" /> {step.tip}
                  </p>
                )}
              </div>
            </div>
            <a href={imageUrl(step.image)} target="_blank" rel="noreferrer" title="Open full size" className="block mt-4">
              <img src={imageUrl(step.image)} alt={step.title} width={1440} height={900} loading="lazy"
                className="w-full h-auto rounded-lg border border-slate-200 shadow-sm" />
            </a>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">
          <ChevronLeft className="w-4 h-4 inline -mt-0.5" /> Back
        </button>
        {next ? (
          <button type="button" onClick={() => onOpen(next.id)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: NAVY }}>
            Next: {next.label} <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={onLibrary}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: NAVY }}>
            Explore the Tutorial Library <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </article>
  );
}
