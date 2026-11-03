import React, { useMemo, useRef, useState } from 'react';
import { MessageCircle, X, AtSign, Paperclip, Send, CornerDownRight } from 'lucide-react';
import { formatDistanceToNow, isValid } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '@/api/accounts';
import { attachmentsApi } from '@/api/attachments';
import { buildCommentThreads, commentsApi } from '@/api/comments';
import { useAuth } from '@/lib/AuthContext';
import { Avatar } from '@/components/resources/ResourceKit';
import { toastError } from '@/components/ui/use-toast';

const NAVY = '#002046';

const ago = (value) => {
  const date = value ? new Date(value) : null;
  return date && isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : '';
};

/** Comment text with @mentions picked out. */
function CommentText({ text }) {
  if (!text) return null;
  return text.split(/(@[\w.@-]+(?:\s[A-Z][\w.-]*)*)/g).map((part, i) => part.startsWith('@')
    ? <span key={i} className="font-semibold" style={{ color: '#1A73F0' }}>{part}</span>
    : <span key={i}>{part}</span>);
}

/**
 * The sheet's comment sidebar for one task: the conversation, replies, and a box that tags people with @.
 * Mentions of account members ("@Full Name") notify them; the API works them out from the text.
 * rowNumber: the task's row on the sheet. onChanged: called after a comment is added (so counts refresh).
 */
export default function TaskCommentsPanel({ task, rowNumber = undefined, onClose, onChanged = undefined }) {
  const { selectedAccountId } = useAuth();
  const queryClient = useQueryClient();
  const threadKey = ['entity-comments', 'TASK', task.id];
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const fileRef = useRef(null);
  const inputRef = useRef(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: threadKey,
    queryFn: async () => buildCommentThreads(await commentsApi.listThread('TASK', task.id)),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['account-users', selectedAccountId],
    queryFn: async () => {
      const response = await accountsApi.listUsers(selectedAccountId);
      const rows = Array.isArray(response) ? response : response?.items || [];
      return rows.map(row => row.user || row);
    },
    enabled: !!selectedAccountId,
  });
  const people = useMemo(() => users.map(u => u.full_name || u.email).filter(Boolean), [users]);
  const suggestions = mentionQuery === null ? [] : people.filter(n => n.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6);
  const total = comments.reduce((s, c) => s + 1 + (c.replies?.length || 0), 0);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: threadKey });
    onChanged?.();
  };

  // An "@" followed by letters (no space yet) opens the people list.
  const handleChange = (value) => {
    setText(value);
    const match = /(^|\s)@([\w.-]*)$/.exec(value);
    setMentionQuery(match ? match[2] : null);
  };
  const insertMention = (name) => {
    setText(prev => prev.replace(/@([\w.-]*)$/, `@${name} `));
    setMentionQuery(null);
    inputRef.current?.focus();
  };
  const startMention = () => {
    setText(prev => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@`);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  const send = async () => {
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    try {
      const comment = await commentsApi.addToThread('TASK', task.id, text.trim() || files.map(f => f.name).join(', '));
      await Promise.all(files.map(f => attachmentsApi.upload('COMMENT', comment.id, f)));
      setText(''); setFiles([]); setMentionQuery(null);
      refresh();
    } catch (error) {
      toastError(error.message);
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (parent) => {
    if (!replyText.trim()) return;
    try {
      await commentsApi.addToThread('TASK', task.id, replyText.trim(), parent.id);
      setReplyText(''); setReplyTo(null);
      refresh();
    } catch (error) {
      toastError(error.message);
    }
  };

  const openAttachment = async (id) => {
    try {
      window.open(await attachmentsApi.downloadUrl(id), '_blank', 'noopener,noreferrer');
    } catch (error) {
      toastError(error.message);
    }
  };

  return (
    <aside className="w-[340px] flex-shrink-0 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" style={{ color: NAVY }} />
          <h3 className="text-base font-bold" style={{ color: NAVY }}>Comments</h3>
          <span className="text-xs font-semibold px-1.5 rounded" style={{ backgroundColor: '#E1EDFE', color: '#1A73F0' }}>{total}</span>
          <button type="button" onClick={onClose} className="ml-auto p-1 rounded hover:bg-slate-100 text-slate-400" aria-label="Close comments">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm font-semibold mt-2 truncate" style={{ color: NAVY }} title={task.title}>{task.title}</p>
        <p className="text-xs text-slate-500">
          {rowNumber ? `Row ${rowNumber}` : 'Task'}{task.updated_at ? ` · Updated ${ago(task.updated_at)}` : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {isLoading && <p className="text-xs text-slate-400">Loading comments…</p>}
        {!isLoading && comments.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">No comments yet. Start the conversation below — type @ to tag someone.</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="space-y-1.5">
            <div className="flex gap-2.5">
              <Avatar name={c.author || 'User'} size={30} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold" style={{ color: NAVY }}>{c.author || 'User'}</span>
                  <span className="text-[11px] text-slate-400">{ago(c.date)}</span>
                </div>
                <p className="text-[13px] text-slate-600 leading-relaxed break-words"><CommentText text={c.text} /></p>
                {c.attachments?.map((att, j) => (
                  <button key={att.id || j} type="button" onClick={() => openAttachment(att.id)}
                    className="flex items-center gap-1.5 mt-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-100 max-w-full">
                    <Paperclip className="w-3 h-3 flex-shrink-0 text-slate-400" /><span className="truncate">{att.name}</span>
                  </button>
                ))}
                <button type="button" onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(''); }}
                  className="text-[11px] text-slate-400 hover:text-[#002046] mt-0.5">Reply</button>
              </div>
            </div>
            {c.replies?.length > 0 && (
              <div className="ml-10 pl-3 border-l-2 border-slate-100 space-y-2">
                {c.replies.map((r, j) => (
                  <div key={r.id || j} className="flex gap-2">
                    <Avatar name={r.author || 'User'} size={22} />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold" style={{ color: NAVY }}>{r.author || 'User'}</span>
                        <span className="text-[10px] text-slate-400">{ago(r.date)}</span>
                      </div>
                      <p className="text-xs text-slate-600 break-words"><CommentText text={r.text} /></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {replyTo === c.id && (
              <div className="ml-10 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <CornerDownRight className="w-3 h-3 text-slate-400" />
                <input value={replyText} onChange={e => setReplyText(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') sendReply(c); if (e.key === 'Escape') setReplyTo(null); }}
                  placeholder="Write a reply…" className="flex-1 text-xs bg-transparent outline-none" />
                <button type="button" onClick={() => sendReply(c)} disabled={!replyText.trim()} className="p-1 rounded text-white disabled:opacity-40" style={{ backgroundColor: NAVY }}>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 px-3 py-3 relative">
        {suggestions.length > 0 && (
          <div className="absolute left-3 right-3 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10">
            <p className="text-[10px] uppercase font-semibold text-slate-400 px-3 pt-2">Tag someone</p>
            {suggestions.map(name => (
              <button key={name} type="button" onMouseDown={e => { e.preventDefault(); insertMention(name); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50" style={{ color: NAVY }}>
                <Avatar name={name} size={20} /> {name}
              </button>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {files.map((f, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[11px] text-slate-600">
                <Paperclip className="w-3 h-3" /><span className="max-w-[120px] truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="border border-slate-200 rounded-lg px-3 py-2">
          <textarea ref={inputRef} value={text} rows={2} placeholder="Add a comment..."
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (suggestions.length) insertMention(suggestions[0]); else send();
              }
              if (e.key === 'Escape') setMentionQuery(null);
            }}
            className="w-full text-sm resize-none outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
          <div className="flex items-center gap-1">
            <button type="button" onClick={startMention} title="Tag someone" className="p-1 rounded hover:bg-slate-100 text-slate-500"><AtSign className="w-4 h-4" /></button>
            <button type="button" onClick={() => fileRef.current?.click()} title="Attach a file" className="p-1 rounded hover:bg-slate-100 text-slate-500"><Paperclip className="w-4 h-4" /></button>
            <button type="button" onClick={send} disabled={sending || (!text.trim() && files.length === 0)} title="Send"
              className="ml-auto p-1 rounded hover:bg-slate-100 disabled:opacity-40" style={{ color: NAVY }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
          <input ref={fileRef} type="file" multiple className="hidden"
            onChange={e => { setFiles(p => [...p, ...Array.from(e.target.files || [])]); e.target.value = ''; }} />
        </div>
      </div>
    </aside>
  );
}
