import React, { useState, useEffect, useRef } from 'react';
import { aiAgents } from '@/api/ai';
import { Bot, Send, X, Plus, MessageSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const AGENT = 'project_assistant';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isThinking = message.role === 'assistant' && !message.content && (!message.tool_calls || message.tool_calls.length === 0);

  return (
    <div className={cn('flex gap-2 mb-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold',
        isUser ? 'bg-[#002046] text-white' : 'bg-violet-100')}>
        {isUser ? 'U' : <Bot className="w-3 h-3 text-violet-600" />}
      </div>
      <div className={cn('max-w-[80%] rounded-xl px-3 py-2 text-xs',
        isUser ? 'bg-[#002046] text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm')}>
        {isThinking ? (
          <div className="flex gap-1 items-center py-0.5">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <>
            {message.tool_calls?.map((tc, i) => {
              const running = ['pending', 'running', 'in_progress'].includes(tc.status);
              const dp = tc.display_projection;
              if (dp?.hide_details && dp?.details_redacted) {
                const label = running ? dp.active_label : ['failed','error'].includes(tc.status) ? dp.error_label : dp.label;
                return <p key={i} className="text-[10px] text-slate-400 italic mb-1">{label}</p>;
              }
              return (
                <div key={i} className="text-[10px] bg-slate-50 rounded px-2 py-0.5 mb-1 border border-slate-100 text-slate-400">
                  {running ? <span className="flex items-center gap-1"><span className="w-1 h-1 bg-violet-400 rounded-full animate-pulse" />Looking up data…</span>
                    : <span>✓ {tc.name?.replace(/_/g, ' ')}</span>}
                </div>
              );
            })}
            {message.content && (
              isUser
                ? <p className="whitespace-pre-wrap">{message.content}</p>
                : <div className="prose prose-xs max-w-none [&_p]:my-0.5 [&_ul]:my-0.5 [&_li]:my-0"><ReactMarkdown>{message.content}</ReactMarkdown></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AIAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showConvList, setShowConvList] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && conversations.length === 0) loadConversations();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeConvId) return;
    const unsub = aiAgents.subscribeToConversation(activeConvId, (data) => {
      setMessages(data.messages || []);
      if (data.messages?.at(-1)?.role === 'assistant') setSending(false);
    });
    return () => unsub();
  }, [activeConvId]);

  const loadConversations = async () => {
    const convs = await aiAgents.listConversations({ agent_name: AGENT });
    setConversations(convs || []);
  };

  const handleNewChat = async () => {
    const conv = await aiAgents.createConversation({
      agent_name: AGENT,
      metadata: { name: `Chat ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` }
    });
    setActiveConvId(conv.id);
    setMessages([]);
    setConversations(prev => [conv, ...prev]);
    setShowConvList(false);
  };

  const handleSelectConv = async (convId) => {
    setActiveConvId(convId);
    const conv = await aiAgents.getConversation(convId);
    setMessages(conv.messages || []);
    setShowConvList(false);
  };

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
    'What are the top open risks?',
    'Show me all active projects',
    'Which projects are behind schedule?',
    'What issues are currently blocked?',
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Chat panel */}
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" style={{ height: '460px' }}>
          {/* Header */}
          <div className="bg-[#002046] px-4 py-3 flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-violet-500 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold">AI Project Assistant</p>
              <p className="text-slate-400 text-[10px] truncate">
                {activeConvId ? conversations.find(c => c.id === activeConvId)?.metadata?.name || 'Chat' : 'Ask me anything'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowConvList(p => !p)} className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white" title="Conversations">
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleNewChat} className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white" title="New chat">
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Conv list dropdown */}
          {showConvList && (
            <div className="border-b border-slate-200 bg-slate-50 max-h-36 overflow-y-auto">
              {conversations.length === 0 && <p className="text-xs text-slate-400 px-3 py-2 text-center">No conversations yet</p>}
              {conversations.map(conv => (
                <button key={conv.id} onClick={() => handleSelectConv(conv.id)}
                  className={cn('w-full text-left px-3 py-1.5 text-xs flex items-center gap-2',
                    conv.id === activeConvId ? 'bg-violet-50 text-violet-700 font-medium' : 'text-slate-600 hover:bg-white')}>
                  <MessageSquare className="w-3 h-3 opacity-50 flex-shrink-0" />
                  <span className="truncate">{conv.metadata?.name || 'Chat'}</span>
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 bg-slate-50">
            {!activeConvId && messages.length === 0 && (
              <div className="flex flex-col gap-2 h-full justify-center">
                <p className="text-xs text-slate-400 text-center mb-2">Suggestions:</p>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-left px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white px-3 py-2.5 flex gap-2 items-center flex-shrink-0">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about your projects…"
              className="flex-1 text-xs h-8"
              disabled={sending}
            />
            <Button size="sm" className="h-8 w-8 p-0 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSend} disabled={!input.trim() || sending}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-12 h-12 bg-[#002046] hover:bg-[#002046]/90 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        {open
          ? <ChevronDown className="w-5 h-5 text-white" />
          : <Bot className="w-5 h-5 text-white" />
        }
      </button>
    </div>
  );
}