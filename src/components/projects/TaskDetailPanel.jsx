import React, { useState, useEffect, useRef } from 'react';
import { X, Send, AtSign, Paperclip, Tag, ChevronDown } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '@/api/accounts';
import { attachmentsApi } from '@/api/attachments';
import { tasksApi } from '@/api/tasks';
import { buildCommentThreads, commentsApi } from '@/api/comments';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toastError } from '@/components/ui/use-toast';

const formatDay = (value) => {
  const date = value ? parseISO(value) : null;
  return date && isValid(date) ? format(date, 'MMM d, yyyy') : null;
};

const formatMoment = (value) => {
  const date = value ? parseISO(value) : null;
  return date && isValid(date) ? format(date, 'MMM d, yyyy, h:mm a') : null;
};

const formatHours = (hours) => (hours ? ` · ${Number(hours)}h` : '');

const EMPTY = <span className="text-slate-400">—</span>;

// Option colours come from account settings; only plain hex values are used for the tinted badge.
function OptionBadge({ option }) {
  if (!option) return EMPTY;
  const hex = /^#[0-9a-f]{6}$/i.test(option.color || '') ? option.color : null;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium max-w-full"
      style={hex ? { backgroundColor: `${hex}1f`, color: hex } : { backgroundColor: '#f1f5f9', color: '#475569' }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: hex || '#94a3b8' }} />
      <span className="truncate">{option.label}</span>
    </span>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <div className="text-xs text-slate-700">{children}</div>
    </div>
  );
}

function TaskOverviewSection({ overview, isLoading, isError, onRetry, userName }) {
  const [open, setOpen] = useState(true);
  if (isLoading) return <div className="text-xs text-slate-400 py-3">Loading task details…</div>;
  if (isError || !overview) {
    return (
      <div className="text-xs text-slate-500 py-3">
        Task details could not load. <button onClick={onRetry} className="text-[#c87b14] font-medium hover:underline">Try again</button>
      </div>
    );
  }

  const assignees = [
    ...overview.assignees.map(a => `${(a.userId && userName(a.userId)) || a.name || 'Unknown person'}${formatHours(a.hours)}`),
    ...overview.allocations.map(a => `${a.resourceName}${formatHours(a.hours)}`),
  ];
  const createdBy = overview.createdById ? userName(overview.createdById) || 'Former member' : null;
  const progress = Math.max(0, Math.min(100, Math.round(overview.percentComplete)));

  return (
    <div className="rounded-lg border border-slate-200">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 text-left">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Details</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-3 space-y-3 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Status"><OptionBadge option={overview.status} /></Field>
            <Field label="Priority"><OptionBadge option={overview.priority} /></Field>
            <Field label="Type">{overview.taskType?.label || EMPTY}</Field>
            <Field label="Sprint">{overview.sprintName || EMPTY}</Field>
            <Field label="Assigned to" wide>
              {assignees.length ? (
                <div className="flex flex-wrap gap-1">
                  {assignees.map((name, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">{name}</span>
                  ))}
                </div>
              ) : <span className="text-slate-400">Unassigned</span>}
            </Field>
            <Field label="Start">{formatDay(overview.startDate) || EMPTY}</Field>
            <Field label="Due">{formatDay(overview.finishDate) || EMPTY}</Field>
            <Field label="Duration">
              {overview.durationDays !== null ? `${overview.durationDays} day${overview.durationDays === 1 ? '' : 's'}` : EMPTY}
            </Field>
            <Field label="Story points">{overview.storyPoints ?? EMPTY}</Field>
            <Field label="Progress" wide>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#16a34a' : '#c87b14' }} />
                </div>
                <span className="text-[11px] text-slate-500 w-9 text-right">{progress}%</span>
              </div>
            </Field>
            <Field label="Created by">{createdBy || EMPTY}</Field>
            <Field label="Created">{formatMoment(overview.createdAt) || EMPTY}</Field>
            <Field label="Last updated" wide>{formatMoment(overview.updatedAt) || EMPTY}</Field>
          </div>
          <Field label="Description" wide>
            {overview.description
              ? <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-600">{overview.description}</p>
              : <span className="text-slate-400">No description.</span>}
          </Field>
        </div>
      )}
    </div>
  );
}

export default function TaskDetailPanel({ task, resources = [], onClose, onUpdate }) {
  const [title, setTitle] = useState(task?.title || '');
  const [text, setText] = useState('');
  const [tagOpen, setTagOpen] = useState(false);
  const [tagged, setTagged] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const fileRef = useRef(null);
  const tagRef = useRef(null);
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAuth();
  const threadKey = ['entity-comments', 'TASK', task?.id];

  const { data: comments = [] } = useQuery({
    queryKey: threadKey,
    queryFn: async () => buildCommentThreads(await commentsApi.listThread('TASK', task.id)),
    enabled: !!task?.id,
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
  // Board cards and sheet rows carry only part of a task, so load the full record for the overview.
  const overviewQuery = useQuery({
    queryKey: ['task-overview', task?.id],
    queryFn: () => tasksApi.getOverview(task.id),
    enabled: !!task?.id,
  });
  const userName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name || user.email : null;
  };

  useEffect(() => {
    const h = (e) => { if (tagRef.current && !tagRef.current.contains(e.target)) setTagOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const commitTitle = () => {
    if (title.trim() && title !== task?.title) onUpdate(task.id, { title: title.trim() });
  };

  const people = [...new Set(resources.map(r => r.full_name).filter(Boolean))];

  // Files are attached to the comment once it exists, so keep them local until send.
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setAttachments(p => [...p, ...files.map(file => ({ name: file.name, type: file.type, file }))]);
    e.target.value = '';
  };

  // Tagging @mentions a person; the API turns mentions of account users into in-app notifications.
  const mentionFor = (name) => {
    const resource = resources.find(r => r.full_name === name);
    const user = users.find(u => (resource?.user_id && u.id === resource.user_id) || u.full_name === name);
    return `@${user?.full_name || user?.email || name}`;
  };

  const handleSend = async () => {
    if (!text.trim() && attachments.length === 0) return;
    const body = [text.trim(), ...tagged.map(mentionFor)].filter(Boolean).join(' ') || attachments.map(a => a.name).join(', ');
    setUploading(true);
    try {
      const comment = await commentsApi.addToThread('TASK', task.id, body);
      await Promise.all(attachments.map(a => attachmentsApi.upload('COMMENT', comment.id, a.file)));
      setText(''); setAttachments([]); setTagged([]); setTagOpen(false);
    } catch (error) {
      toastError(error.message);
    } finally {
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: threadKey });
    }
  };

  const handleReply = async (i) => {
    if (!replyText.trim()) return;
    await commentsApi.addToThread('TASK', task.id, replyText.trim(), comments[i].id);
    queryClient.invalidateQueries({ queryKey: threadKey });
    setReplyText(''); setReplyTo(null);
  };

  const openAttachment = async (attachmentId) => {
    try {
      window.open(await attachmentsApi.downloadUrl(attachmentId), '_blank', 'noopener,noreferrer');
    } catch (error) {
      toastError(error.message);
    }
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

        {/* Overview + messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          <TaskOverviewSection
            overview={overviewQuery.data}
            isLoading={overviewQuery.isLoading}
            isError={overviewQuery.isError}
            onRetry={() => overviewQuery.refetch()}
            userName={userName}
          />
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Updates</p>
          {comments.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-8">No updates yet. Share an update below.</div>
          )}
          {comments.map((c, i) => (
            <div key={c.id || i} className="flex gap-2.5">
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
                  <a key={att.id || j} href="#" onClick={e => { e.preventDefault(); openAttachment(att.id); }}
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
              <button onClick={handleSend} disabled={uploading || (!text.trim() && attachments.length === 0)}
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