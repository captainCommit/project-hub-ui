import React, { useState, useEffect, useRef } from 'react';
import { X, Send, AtSign, Paperclip, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function TaskDetailPanel({ task, resources = [], onClose, onUpdate }) {
  const [title, setTitle] = useState(task?.title || '');
  const [text, setText] = useState('');
  const [tagOpen, setTagOpen] = useState(false);
  const [tagged, setTagged] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const fileRef = useRef(null);
  const tagRef = useRef(null);
  const comments = task?.comments || [];

  useEffect(() => {
    base44.entities.User.list().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e) => { if (tagRef.current && !tagRef.current.contains(e.target)) setTagOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const commitTitle = () => {
    if (title.trim() && title !== task?.title) onUpdate(task.id, { title: title.trim() });
  };

  const people = [...new Set(resources.map(r => r.full_name).filter(Boolean))];

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploaded = await Promise.all(files.map(async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return { name: file.name, url: file_url, type: file.type };
    }));
    setAttachments(p => [...p, ...uploaded]);
    setUploading(false);
    e.target.value = '';
  };

  const notify = async (names) => {
    const recipients = users.filter(u => names.includes(u.full_name) && u.email);
    for (const u of recipients) {
      try {
        await base44.integrations.Core.SendEmail({
          to: u.email,
          subject: `Task update: ${task?.title || 'Task'}`,
          body: `${text}\n\nYou were tagged on task "${task?.title}".\n\nOpen the app to view the full conversation.`,
        });
      } catch {}
    }
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;
    const newComment = { text: text.trim(), author: 'You', date: new Date().toISOString(), attachments, tagged };
    onUpdate(task.id, { comments: [...comments, newComment] });
    if (tagged.length) notify(tagged);
    setText(''); setAttachments([]); setTagged([]); setTagOpen(false);
  };

  const handleReply = (i) => {
    if (!replyText.trim()) return;
    const updated = comments.map((c, idx) => idx === i
      ? { ...c, replies: [...(c.replies || []), { text: replyText.trim(), author: 'You', date: new Date().toISOString() }] }
      : c);
    onUpdate(task.id, { comments: updated });
    setReplyText(''); setReplyTo(null);
  };

  const toggleTag = (name) => setTagged(p => p.includes(name) ? p.filter(n => n !== name) : [...p, name]);

  const renderText = (txt) => {
    if (!txt) return null;
    const parts = txt.split(/(@\w[\w\s]*)/g);
    return parts.map((p, i) => p.startsWith('@')
      ? <span key={i} className="text-violet-600 font-medium">{p}</span>
      : <span key={i}>{p}</span>);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Task</p>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
              className="h-8 text-sm font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
              placeholder="Task name"
            />
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded flex-shrink-0 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {comments.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-8">No updates yet. Share an update below.</div>
          )}
          {comments.map((c, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#002046] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {(c.author || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-700">{c.author || 'User'}</span>
                  <span className="text-[10px] text-slate-400">{c.date ? format(new Date(c.date), 'MMM d, h:mm a') : ''}</span>
                </div>
                {c.text && <p className="text-xs text-slate-600 leading-relaxed">{renderText(c.text)}</p>}
                {c.tagged?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.tagged.map(n => <span key={n} className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-full">@{n}</span>)}
                  </div>
                )}
                {c.attachments?.map((att, j) => (
                  <a key={j} href={att.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 mt-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-100 truncate">
                    <Paperclip className="w-3 h-3 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{att.name}</span>
                  </a>
                ))}
                <button onClick={() => setReplyTo(replyTo === i ? null : i)} className="text-[10px] text-slate-400 hover:text-[#002046] mt-1">Reply</button>
                {replyTo === i && (
                  <div className="flex items-end gap-1.5 mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(i); } }}
                      placeholder="Write a reply…" rows={1}
                      className="flex-1 text-xs bg-transparent border-0 outline-none resize-none text-slate-700 placeholder:text-slate-400" />
                    <button onClick={() => handleReply(i)} disabled={!replyText.trim()}
                      className="p-1 rounded bg-[#002046] text-white disabled:opacity-40"><Send className="w-3 h-3" /></button>
                  </div>
                )}
                {c.replies?.length > 0 && (
                  <div className="mt-2 space-y-2 pl-3 border-l-2 border-slate-100">
                    {c.replies.map((r, j) => (
                      <div key={j} className="flex gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-300 text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{(r.author || 'U').charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-[11px] font-semibold text-slate-600">{r.author || 'User'}</span>
                            <span className="text-[10px] text-slate-400">{r.date ? format(new Date(r.date), 'MMM d, h:mm a') : ''}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{renderText(r.text)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 flex flex-wrap gap-1.5 flex-shrink-0">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1 px-2 py-1 bg-violet-50 border border-violet-200 rounded text-xs text-violet-700">
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{att.name}</span>
                <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} className="hover:text-red-500 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tagged preview */}
        {tagged.length > 0 && (
          <div className="px-4 py-1.5 border-t border-slate-100 flex flex-wrap gap-1 flex-shrink-0">
            {tagged.map(n => (
              <span key={n} className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                @{n}
                <button onClick={() => toggleTag(n)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
        )}

        {/* Tag popover */}
        {tagOpen && (
          <div ref={tagRef} className="mx-4 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden flex-shrink-0 max-h-44 overflow-y-auto">
            <p className="text-[10px] text-slate-400 px-3 py-1.5 border-b border-slate-100 font-semibold uppercase flex items-center gap-1"><Tag className="w-3 h-3" /> Tag people to notify</p>
            {people.length === 0 && <p className="text-xs text-slate-400 px-3 py-2">No people available.</p>}
            {people.map(name => (
              <button key={name} onClick={() => toggleTag(name)}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-violet-50 hover:text-violet-700 flex items-center gap-2">
                <span className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0', tagged.includes(name) ? 'bg-[#002046] border-[#002046]' : 'border-slate-300')}>
                  {tagged.includes(name) && <span className="text-white text-[8px]">✓</span>}
                </span>
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center">{name.charAt(0)}</div>
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-2.5 border-t border-slate-200 flex-shrink-0">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Share an update…"
              rows={2}
              className="flex-1 text-xs bg-transparent border-0 outline-none resize-none text-slate-700 placeholder:text-slate-400"
            />
            <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
              <button onClick={() => setTagOpen(p => !p)} title="Tag people to notify"
                className={cn('p-1 rounded hover:bg-slate-200 transition-colors', tagOpen ? 'text-violet-600' : 'text-slate-400')}>
                <AtSign className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => fileRef.current?.click()} title="Attach file" disabled={uploading}
                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleSend} disabled={!text.trim() && attachments.length === 0}
                className="p-1 rounded bg-[#002046] text-white hover:bg-[#002046]/90 disabled:opacity-40 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        </div>
      </div>
    </div>
  );
}