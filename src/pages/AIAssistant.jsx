import React, { useState, useEffect, useRef } from 'react';
import { Compass, Send, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import { useAuth } from '@/lib/AuthContext';
import { useAssistantChat } from '@/hooks/useAssistantChat';
import { AnswerSteps, AssistantMarkdown, AssistantUnavailable, isAnswerActive } from '@/components/assistant/AssistantParts';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isThinking = isAnswerActive(message) && !message.progress && !message.steps?.length;

  return (
    <div className={cn('flex gap-3 mb-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-[#002046] text-white text-xs font-bold' : 'bg-violet-100')}>
        {isUser ? 'You' : <Compass className="w-4 h-4 text-violet-600" />}
      </div>
      <div className={cn('max-w-[75%] rounded-2xl px-4 py-3 text-sm',
        isUser ? 'bg-[#002046] text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm')}>
        {isThinking ? (
          <div className="flex gap-1 items-center py-1">
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <>
            {!isUser && <AnswerSteps message={message} />}
            {message.content && (
              isUser ? <p className="whitespace-pre-wrap">{message.content}</p>
              : <AssistantMarkdown className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">{message.content}</AssistantMarkdown>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'What are the top open risks across all projects?',
  'Show me a summary of all active projects',
  'Which projects are behind schedule?',
  'What issues are currently blocked?',
  'What is overdue on my plate?',
];

export default function AIAssistant() {
  const { selectedAccountId } = useAuth();
  const chat = useAssistantChat(selectedAccountId);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const { projects, programs, portfolios } = useAccountHierarchy();
  const unavailable = !chat.statusLoading && chat.status && !chat.status.available;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages.length, chat.messages.at(-1)?.progress, chat.messages.at(-1)?.status]);

  const handleSend = () => {
    if (!input.trim() || chat.busy || unavailable) return;
    chat.send(input.trim());
    setInput('');
  };

  return (
    <div className="h-screen flex bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />

      {/* Conversation list */}
      <div className="w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-slate-200">
          <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700 text-white h-8 text-xs gap-1.5" onClick={chat.newChat}>
            <Plus className="w-3.5 h-3.5" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {chat.conversations.length === 0 && (
            <p className="text-xs text-slate-400 px-3 py-4 text-center">No conversations yet</p>
          )}
          {chat.conversations.map(conv => (
            <div key={conv.id}
              className={cn('group w-full px-3 py-2 text-xs transition-colors flex items-center gap-2 rounded-md mx-1',
                conv.id === chat.activeId ? 'bg-violet-50 text-violet-700 font-medium' : 'text-slate-600 hover:bg-slate-50')}>
              <button onClick={() => chat.select(conv.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                <span className="truncate flex-1">{conv.title || 'New chat'}</span>
              </button>
              <button onClick={() => chat.remove(conv.id)} title="Delete conversation"
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 flex-shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <Compass className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-800">Ask Compass</h1>
            <p className="text-xs text-slate-400">
              Ask anything about your projects, risks, resources, and more
              {chat.status?.available && chat.status.model ? ` · ${chat.status.provider_label} ${chat.status.model}` : ''}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!chat.activeId && chat.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Compass className="w-7 h-7 text-violet-600" />
                </div>
                <h2 className="text-base font-semibold text-slate-700 mb-1">Ask Compass</h2>
                <p className="text-xs text-slate-400 max-w-xs">Ask me anything about your projects, risks, issues, resources, or team status.</p>
              </div>
              {!unavailable && (
                <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => { setInput(s); }} className="text-left px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {chat.messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
          <div ref={bottomRef} />
        </div>

        {/* Disclaimer */}
        <div className="px-4 pt-2 text-center text-[11px] text-slate-400 flex-shrink-0">
          Ask Compass can make mistakes. Please verify important information.
        </div>
        {/* Input */}
        {unavailable ? (
          <div className="border-t border-slate-200 bg-white flex-shrink-0"><AssistantUnavailable status={chat.status} /></div>
        ) : (
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex gap-2 items-center flex-shrink-0">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about project status, risks, resources…"
              className="flex-1 text-sm h-9"
              maxLength={4000}
              disabled={chat.busy}
            />
            <Button size="sm" className="h-9 bg-violet-600 hover:bg-violet-700 text-white px-3" onClick={handleSend} disabled={!input.trim() || chat.busy}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
