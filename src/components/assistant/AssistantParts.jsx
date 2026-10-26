import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Answers link records with app paths (/projects/…); open those in the app instead of reloading the page.
// Lists, paragraphs and headings are styled here: the app has no Tailwind typography plugin, so prose classes do nothing.
const MARKDOWN_COMPONENTS = {
  a: ({ href = '', children }) => (href.startsWith('/')
    ? <Link to={href} className="text-violet-700 underline underline-offset-2">{children}</Link>
    : <a href={href} target="_blank" rel="noreferrer noopener" className="text-violet-700 underline underline-offset-2">{children}</a>),
  p: ({ children }) => <p className="my-1.5">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-1">{children}</ol>,
  h1: ({ children }) => <p className="font-semibold mt-2 mb-1">{children}</p>,
  h2: ({ children }) => <p className="font-semibold mt-2 mb-1">{children}</p>,
  h3: ({ children }) => <p className="font-semibold mt-2 mb-1">{children}</p>,
  code: ({ children }) => <code className="px-1 rounded bg-slate-100 text-[0.9em]">{children}</code>,
};

export function AssistantMarkdown({ children, className }) {
  return <div className={className}><ReactMarkdown components={MARKDOWN_COMPONENTS}>{children}</ReactMarkdown></div>;
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
