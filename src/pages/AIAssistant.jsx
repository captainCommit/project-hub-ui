import React, { useState, useEffect, useRef } from 'react';
import { aiAgents } from '@/api/ai';
import { Compass, Send, Plus, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';

const AGENT = 'project_assistant';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isThinking = message.role === 'assistant' && !message.content && (!message.tool_calls || message.tool_calls.length === 0);

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
            {message.tool_calls?.map((tc, i) => {
              const dp = tc.display_projection;
              if (dp?.hide_details && dp?.details_redacted) {
                const label = ['pending','running','in_progress'].includes(tc.status) ? dp.active_label
                  : ['failed','error'].includes(tc.status) ? dp.error_label
                  : dp.label;
                return <p key={i} className="text-xs text-slate-500 italic mb-1">{label}</p>;
              }
              const running = ['pending','running','in_progress'].includes(tc.status);
              return (
                <div key={i} className="text-xs bg-slate-50 rounded-lg px-2 py-1 mb-2 border border-slate-100 text-slate-500">
                  {running ? (
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />Looking up data…</span>
                  ) : (
                    <span>✓ {tc.name?.replace(/_/g, ' ')}</span>
                  )}
                </div>
              );
            })}
            {message.content && (
              isUser ? <p className="whitespace-pre-wrap">{message.content}</p>
              : <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5"><ReactMarkdown>{message.content}</ReactMarkdown></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const { projects, programs, portfolios } = useAccountHierarchy();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    const convs = await aiAgents.listConversations({ agent_name: AGENT });
    setConversations(convs || []);
  };

  const handleNewConversation = async () => {
    const conv = await aiAgents.createConversation({
      agent_name: AGENT,
      metadata: { name: `Chat ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` }
    });
    setActiveConvId(conv.id);
    setMessages([]);
    setConversations(prev => [conv, ...prev]);
  };

  const handleSelectConversation = async (convId) => {
    setActiveConvId(convId);
    const conv = await aiAgents.getConversation(convId);
    setMessages(conv.messages || []);
  };

  useEffect(() => {
    if (!activeConvId) return;
    const unsub = aiAgents.subscribeToConversation(activeConvId, (data) => {
      setMessages(data.messages || []);
      if (data.messages?.at(-1)?.role === 'assistant') setSending(false);
    });
    return () => unsub();
  }, [activeConvId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    let convId = activeConvId;
    if (!convId) {
      const conv = await aiAgents.createConversation({
        agent_name: AGENT,
        metadata: { name: input.trim().slice(0, 40) }
      });
      convId = conv.id;
      setActiveConvId(convId);
      setConversations(prev => [conv, ...prev]);
    }
    const conv = await aiAgents.getConversation(convId);
    const msg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, msg, { role: 'assistant', content: '' }]);
    setInput('');
    setSending(true);
    await aiAgents.addMessage(conv, msg);
  };

  const SUGGESTIONS = [
    'What are the top open risks across all projects?',
    'Show me a summary of all active projects',
    'Which projects are behind schedule?',
    'What issues are currently blocked?',
    'Summarize resource assignments by project',
  ];

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
          <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700 text-white h-8 text-xs gap-1.5" onClick={handleNewConversation}>
            <Plus className="w-3.5 h-3.5" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 && (
            <p className="text-xs text-slate-400 px-3 py-4 text-center">No conversations yet</p>
          )}
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => handleSelectConversation(conv.id)}
              className={cn('w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 rounded-md mx-1',
                conv.id === activeConvId ? 'bg-violet-50 text-violet-700 font-medium' : 'text-slate-600 hover:bg-slate-50')}>
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
              <span className="truncate flex-1">{conv.metadata?.name || 'Chat'}</span>
            </button>
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
            <h1 className="text-sm font-semibold text-slate-800">Compass</h1>
            <p className="text-xs text-slate-400">Ask anything about your projects, risks, resources, and more</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!activeConvId && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Compass className="w-7 h-7 text-violet-600" />
                </div>
                <h2 className="text-base font-semibold text-slate-700 mb-1">Compass</h2>
                <p className="text-xs text-slate-400 max-w-xs">Ask me anything about your projects, risks, issues, resources, or team status.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setInput(s); }} className="text-left px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
          <div ref={bottomRef} />
        </div>

        {/* Disclaimer */}
        <div className="px-4 pt-2 text-center text-[11px] text-slate-400 flex-shrink-0">
          Compass can make mistakes. Please verify important information.
        </div>
        {/* Input */}
        <div className="border-t border-slate-200 bg-white px-4 py-3 flex gap-2 items-center flex-shrink-0">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about project status, risks, resources…"
            className="flex-1 text-sm h-9"
            disabled={sending}
          />
          <Button size="sm" className="h-9 bg-violet-600 hover:bg-violet-700 text-white px-3" onClick={handleSend} disabled={!input.trim() || sending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}