import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Loader2, Paperclip, Headphones } from 'lucide-react';
import { attachmentsApi } from '@/api/attachments';
import { supportTicketsApi } from '@/api/collaboration';

const STATUS_STYLES = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  awaiting_response: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

const PRIORITY_STYLES = {
  low: 'bg-slate-50 text-slate-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
};

export default function TicketConversation({ ticket, onBack }) {
  const [messages, setMessages] = useState(ticket.messages || []);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const uploaded = await Promise.all(attachments.map(a => attachmentsApi.upload('SUPPORT_TICKET', ticket.id, a.file)));
      const updated = await supportTicketsApi.addMessage(
        ticket.id,
        reply.trim(),
        uploaded.map(u => ({ attachment_id: u.attachment_id, name: u.name })),
      );
      setMessages(updated.messages);
      setReply('');
      setAttachments([]);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Uploaded when the reply is sent.
    setAttachments(a => [...a, ...files.map(file => ({ name: file.name, file }))]);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 text-slate-500"><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{ticket.ticket_number || 'Ticket'}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_STYLES[ticket.status] || STATUS_STYLES.open}`}>
              {ticket.status?.replace('_', ' ')}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.medium}`}>{ticket.priority}</span>
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5">{ticket.subject || ticket.description?.slice(0, 80)}</p>
        </div>
      </div>

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isUser ? 'bg-[#002046]' : 'bg-emerald-500'}`}>
                {isUser ? (m.author?.[0] || 'U') : <Headphones className="w-4 h-4" />}
              </div>
              <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-600">{isUser ? m.author : (m.author || 'Project Hub Support')}</span>
                  <span className="text-[10px] text-slate-400">{new Date(m.date).toLocaleString()}</span>
                </div>
                <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${isUser ? 'bg-[#002046] text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Reply box */}
      <div className="border-t border-slate-200 p-4 bg-white">
        <div className="flex items-end gap-2">
          <label className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer text-slate-400">
            <Paperclip className="w-4 h-4" />
            <input type="file" multiple className="hidden" onChange={handleFile} />
          </label>
          <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…" rows={2} className="flex-1 text-sm resize-none" onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(); }} />
          <Button onClick={sendReply} disabled={sending || !reply.trim()} className="bg-[#002046] hover:bg-[#001634] text-white h-9">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {attachments.map((a, i) => <span key={i} className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{a.name}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}