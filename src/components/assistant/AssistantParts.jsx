import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { AlertCircle, BarChart3, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const textOf = (children) => React.Children.toArray(children).map(c => (typeof c === 'string' || typeof c === 'number' ? String(c) : textOf(c?.props?.children))).join('');

// Health words the answers use, drawn as pills in tables.
const HEALTH_PILLS = [
  [/^(at risk|amber|yellow)$/i, 'bg-orange-50 text-orange-700'],
  [/^(off track|red|critical|blocked|overdue)$/i, 'bg-red-50 text-red-700'],
  [/^(on track|green|complete|completed|done)$/i, 'bg-emerald-50 text-emerald-700'],
];

/** A table cell: "65%" becomes a small progress bar, a health word a pill, anything else as written. */
function Cell({ children }) {
  const text = textOf(children).trim();
  const pct = /^(\d{1,3})%$/.exec(text);
  if (pct) {
    const value = Math.min(100, Number(pct[1]));
    const color = value >= 75 ? '#16A34A' : value >= 40 ? '#2563EB' : '#F59E0B';
    return (
      <td className="px-3 py-2 whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          <span className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} /></span>
          <span className="text-xs text-slate-600">{text}</span>
        </span>
      </td>
    );
  }
  const pill = HEALTH_PILLS.find(([re]) => re.test(text));
  return (
    <td className="px-3 py-2 align-top">
      {pill ? <span className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap', pill[1])}>{text}</span> : children}
    </td>
  );
}

// Answers link records with app paths (/projects/…); open those in the app instead of reloading the page.
// Lists, paragraphs and headings are styled here: the app has no Tailwind typography plugin, so prose classes do nothing.
const MARKDOWN_COMPONENTS = {
  a: ({ href = '', children }) => (href.startsWith('/')
    ? <Link to={href} className="text-[#1D4ED8] hover:underline underline-offset-2">{children}</Link>
    : <a href={href} target="_blank" rel="noreferrer noopener" className="text-[#1D4ED8] hover:underline underline-offset-2">{children}</a>),
  p: ({ children }) => (/^key takeaways/i.test(textOf(children).trim())
    ? <p className="mt-3 mb-1 flex items-center gap-1.5 font-semibold text-[#002046]"><BarChart3 className="w-4 h-4" />{children}</p>
    : <p className="my-1.5">{children}</p>),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full text-xs">{children}</table></div>
  ),
  // A two-column "label | value" table often has a blank header row: leave it out.
  thead: ({ children }) => (textOf(children).trim() ? <thead className="bg-[#002046] text-white">{children}</thead> : null),
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{children}</th>,
  tr: ({ children }) => <tr className="border-t border-slate-100 first:border-t-0">{children}</tr>,
  td: Cell,
  ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-1">{children}</ol>,
  h1: ({ children }) => <p className="font-semibold mt-2 mb-1">{children}</p>,
  h2: ({ children }) => <p className="font-semibold mt-2 mb-1">{children}</p>,
  h3: ({ children }) => <p className="font-semibold mt-2 mb-1">{children}</p>,
  code: ({ children }) => <code className="px-1 rounded bg-slate-100 text-[0.9em]">{children}</code>,
};

export function AssistantMarkdown({ children, className }) {
  return <div className={className}><ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>{children}</ReactMarkdown></div>;
}

export const isAnswerActive = (message) => message.role === 'assistant' && ['QUEUED', 'RUNNING'].includes(message.status);

/** The lookups an answer made, what it is doing now, and why it failed. `small` for the floating widget. */
export function AnswerSteps({ message, small = false }) {
  const active = isAnswerActive(message);
  const text = small ? 'text-[10px]' : 'text-xs';
  return (
    <>
      {(message.steps || []).map((step, i) => (
        <p key={i} className={cn(text, 'text-slate-500 flex items-center gap-1 mb-1')}>
          <Check className={small ? 'w-2.5 h-2.5' : 'w-3 h-3'} /> {step}
        </p>
      ))}
      {active && message.progress && (
        <p className={cn(text, 'text-slate-500 flex items-center gap-1.5 mb-1')}>
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />{message.progress}
        </p>
      )}
      {message.status === 'FAILED' && (
        <p className={cn(text, 'text-red-600 flex items-start gap-1.5')}>
          <AlertCircle className={cn(small ? 'w-3 h-3' : 'w-3.5 h-3.5', 'flex-shrink-0 mt-px')} />{message.error}
        </p>
      )}
    </>
  );
}

const UNAVAILABLE = {
  NOT_ENABLED: 'AI isn’t turned on for this account.',
  OFF: 'An account owner has switched the assistant off.',
  NOT_SET_UP: 'The assistant isn’t set up for this account yet.',
  LIMIT_REACHED: 'This account has used its AI allowance for the month.',
};

/** In place of the question box when the assistant can't be used, saying why and who can fix it. */
export function AssistantUnavailable({ status, small = false }) {
  const reason = UNAVAILABLE[status?.reason] || UNAVAILABLE.NOT_SET_UP;
  return (
    <div className={cn('text-center text-slate-500', small ? 'text-[11px] px-3 py-2' : 'text-xs px-4 py-3')}>
      <p>{reason}</p>
      {status?.reason === 'NOT_ENABLED' ? (
        status?.can_manage
          ? <Link to="/Account?tab=connected" className="text-violet-700 font-medium hover:underline">Request it in Account &gt; Connected apps</Link>
          : <p>An account owner can request it in Account &gt; Connected apps.</p>
      ) : status?.can_manage ? (
        <Link to="/Account?tab=ai" className="text-violet-700 font-medium hover:underline">Set it up in Account &gt; AI assistant</Link>
      ) : (
        <p>Ask an account owner to {status?.reason === 'OFF' ? 'turn it on' : 'set it up'}.</p>
      )}
    </div>
  );
}
