import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle, Calendar, Copy, Folder, History, MessageSquare, Plus, Send, Sparkles, ThumbsDown, ThumbsUp, Trash2, UserRound, Users,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import { useAccountOptions } from '@/hooks/useStatusOptions';
import { useAuth } from '@/lib/AuthContext';
import { useAssistantChat } from '@/hooks/useAssistantChat';
import { AnswerSteps, AssistantMarkdown, AssistantUnavailable, isAnswerActive } from '@/components/assistant/AssistantParts';
import DraftCard from '@/components/assistant/DraftCard';

const NAVY = '#002046';
const MUTED = '#6B7C99';
const ORANGE = '#E8711A';

const SUGGESTIONS = [
  { icon: Folder, text: 'What is the status of my projects?' },
  { icon: AlertTriangle, text: 'Which projects are at risk?' },
  { icon: Users, text: 'Which resources are overallocated?' },
  { icon: Calendar, text: 'What tasks are overdue?' },
];

export function PoweredByAi({ className = undefined }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', className)}
      style={{ backgroundColor: '#FDEBD9', color: '#B45309' }}>
      Powered by AI
    </span>
  );
}

/** The question box: a sparkle, the text and an orange send button. */
function AskBox({ value, onChange, onSend, disabled, placeholder, large = false }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-1 focus-within:ring-slate-300', large ? 'px-4 py-3' : 'px-3 py-2')}>
      <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: ORANGE }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder={placeholder}
        maxLength={4000}
        disabled={disabled}
        className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
        aria-label="Ask Compass"
      />
      <button type="button" onClick={onSend} disabled={disabled || !value.trim()} aria-label="Send"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40" style={{ backgroundColor: ORANGE }}>
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0, 150, 300].map(delay => <span key={delay} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: ORANGE, animationDelay: `${delay}ms` }} />)}
    </div>
  );
}

function UserMessage({ message }) {
  return (
    <div className="flex justify-end items-start gap-2.5 mb-5">
      <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap" style={{ backgroundColor: '#E8F0FC', color: NAVY }}>{message.content}</div>
      <span className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center flex-shrink-0">
        <UserRound className="w-4 h-4" style={{ color: NAVY }} />
      </span>
    </div>
  );
}

function AnswerMessage({ message, isLast, chat, projects, options, onAsk }) {
  const thinking = isAnswerActive(message) && !message.progress && !message.steps?.length;
  const done = message.status === 'DONE';
  const copy = () => {
    navigator.clipboard?.writeText(message.content).then(() => toast({ title: 'Copied' })).catch(() => {});
  };
  const vote = (value) => chat.setFeedback(message.id, message.feedback === value ? null : value);
  return (
    <div className="mb-5">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 mt-3 flex-shrink-0" style={{ color: ORANGE }} />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
            {thinking ? <Thinking /> : (
              <>
                <AnswerSteps message={message} />
                {message.content && <AssistantMarkdown>{message.content}</AssistantMarkdown>}
              </>
            )}
          </div>
          {(message.actions || []).map(action => (
            <DraftCard key={action.id} action={action} projects={projects} options={options}
              onCreate={(changes) => chat.createFromDraft(action.id, changes)} />
          ))}
          {done && message.content && (
            <div className="flex justify-end gap-1 -mt-1">
              <button type="button" onClick={() => vote('up')} aria-label="Helpful" aria-pressed={message.feedback === 'up'}
                className={cn('p-1.5 rounded hover:bg-slate-100', message.feedback === 'up' ? 'text-emerald-600' : 'text-slate-400')}><ThumbsUp className="w-4 h-4" /></button>
              <button type="button" onClick={() => vote('down')} aria-label="Not helpful" aria-pressed={message.feedback === 'down'}
                className={cn('p-1.5 rounded hover:bg-slate-100', message.feedback === 'down' ? 'text-red-600' : 'text-slate-400')}><ThumbsDown className="w-4 h-4" /></button>
              <button type="button" onClick={copy} aria-label="Copy answer" className="p-1.5 rounded hover:bg-slate-100 text-slate-400"><Copy className="w-4 h-4" /></button>
            </div>
          )}
          {isLast && done && message.follow_ups?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {message.follow_ups.map(q => (
                <button key={q} type="button" onClick={() => onAsk(q)} disabled={chat.busy}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50" style={{ color: NAVY }}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The clock button: earlier conversations, to reopen or delete. */
function HistoryMenu({ chat }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Conversation history" title="History"
          className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50">
          <History className="w-4 h-4" style={{ color: NAVY }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1">
        <p className="px-2 py-1.5 text-xs font-semibold" style={{ color: MUTED }}>Recent conversations</p>
        <div className="max-h-80 overflow-y-auto">
          {chat.conversations.length === 0 && <p className="px-2 py-4 text-xs text-center text-slate-400">No conversations yet</p>}
          {chat.conversations.map(conv => (
            <div key={conv.id} className={cn('group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs', conv.id === chat.activeId ? 'bg-orange-50' : 'hover:bg-slate-50')}>
              <button type="button" onClick={() => { chat.select(conv.id); setOpen(false); }} className="flex items-center gap-2 flex-1 min-w-0 text-left" style={{ color: NAVY }}>
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                <span className="truncate">{conv.title || 'New chat'}</span>
              </button>
              <button type="button" onClick={() => chat.remove(conv.id)} aria-label={`Delete ${conv.title || 'conversation'}`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AIAssistant() {
  const { selectedAccountId } = useAuth();
  const chat = useAssistantChat(selectedAccountId);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const { projects, programs, portfolios } = useAccountHierarchy();
  const { data: options } = useAccountOptions();
  const unavailable = !chat.statusLoading && chat.status && !chat.status.available;
  const inConversation = Boolean(chat.activeId) || chat.messages.length > 0;
  // What the review card offers as projects, with their program for display.
  const projectChoices = useMemo(() => projects.map(p => ({
    id: p.id, name: p.name, program_name: programs.find(g => g.id === p.program_id)?.name,
  })), [projects, programs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages.length, chat.messages.at(-1)?.progress, chat.messages.at(-1)?.status]);

  const ask = (text) => {
    if (!text.trim() || chat.busy || unavailable) return;
    chat.send(text.trim());
    setInput('');
  };
  const lastAnswerId = [...chat.messages].reverse().find(m => m.role === 'assistant')?.id;

  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3 flex-shrink-0 border-b border-slate-100">
          <Sparkles className="w-6 h-6" style={{ color: ORANGE }} />
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Compass</h1>
          <PoweredByAi />
          <div className="ml-auto flex items-center gap-2">
            <HistoryMenu chat={chat} />
            {inConversation && (
              <button type="button" onClick={chat.newChat} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium flex items-center gap-1.5 hover:bg-slate-50" style={{ color: NAVY }}>
                <Plus className="w-4 h-4" /> New chat
              </button>
            )}
          </div>
        </div>

        {!inConversation ? (
          /* Landing */
          <div className="flex-1 overflow-y-auto relative" style={{ background: 'linear-gradient(180deg, #FFFFFF 55%, #FFF6EE 100%)' }}>
            <div className="max-w-2xl mx-auto px-6 pt-[12vh] pb-10">
              <h2 className="text-3xl font-bold text-center" style={{ color: NAVY }}>Ask anything about your projects.</h2>
              <p className="text-center mt-2 text-slate-500">Get instant answers on project status, risks, allocation, and more.</p>
              <div className="mt-8">
                {unavailable
                  ? <div className="rounded-xl border border-slate-200 bg-white"><AssistantUnavailable status={chat.status} /></div>
                  : <AskBox large value={input} onChange={setInput} onSend={() => ask(input)} disabled={chat.busy} placeholder="Ask Compass a question..." />}
              </div>
              {!unavailable && (
                <>
                  <p className="mt-10 mb-3 text-sm font-medium" style={{ color: NAVY }}>Try asking:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SUGGESTIONS.map(({ icon: Icon, text }) => (
                      <button key={text} type="button" onClick={() => ask(text)}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm hover:border-orange-200 hover:bg-orange-50/40" style={{ color: NAVY }}>
                        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: NAVY }} /> {text}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Conversation */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                {chat.messages.map(msg => (msg.role === 'user'
                  ? <UserMessage key={msg.id} message={msg} />
                  : <AnswerMessage key={msg.id} message={msg} isLast={msg.id === lastAnswerId} chat={chat}
                      projects={projectChoices} options={options} onAsk={ask} />))}
                <div ref={bottomRef} />
              </div>
            </div>
            <div className="flex-shrink-0 border-t border-slate-100 bg-white">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-2">
                {unavailable
                  ? <AssistantUnavailable status={chat.status} />
                  : <AskBox value={input} onChange={setInput} onSend={() => ask(input)} disabled={chat.busy} placeholder="Ask a follow-up question..." />}
                <p className="text-center text-[11px] text-slate-400 mt-1.5">Compass can make mistakes. Please verify important information.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
