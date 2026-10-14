import React, { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Headphones, Inbox, Loader2, Paperclip, Search, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toastError } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { platformApi } from '@/api/platform';
import { attachmentsApi } from '@/api/attachments';

const STATUS_LABELS = {
  OPEN: 'Open',
  AWAITING_RESPONSE: 'Waiting on customer',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};
const STATUS_STYLES = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  AWAITING_RESPONSE: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-500 border-slate-200',
};
const FILTERS = [
  ['ACTIVE', 'Active'],
  ['OPEN', 'Open'],
  ['AWAITING_RESPONSE', 'Waiting on customer'],
  ['IN_PROGRESS', 'In progress'],
  ['RESOLVED', 'Resolved'],
  ['CLOSED', 'Closed'],
  ['ALL', 'All'],
];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const label = (value) => (value ? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ') : '');

function StatusBadge({ status }) {
  return <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap', STATUS_STYLES[status])}>{STATUS_LABELS[status] || status}</span>;
}

async function openAttachment(attachmentId) {
  try {
    window.open(await attachmentsApi.downloadUrl(attachmentId), '_blank', 'noopener');
  } catch (error) {
    toastError(error?.message || 'The file could not be opened.');
  }
}

function TicketDetail({ ticketId }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState(/** @type {File[]} */ ([]));
  const endRef = useRef(null);
  const query = useQuery({ queryKey: ['admin-ticket', ticketId], queryFn: () => platformApi.getTicket(ticketId) });
  const ticket = query.data;

  const refreshLists = (updated) => {
    queryClient.setQueryData(['admin-ticket', ticketId], updated);
    queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['admin-ticket-summary'] });
  };
  const send = useMutation({
    mutationFn: async () => {
      const uploaded = await Promise.all(files.map(file => attachmentsApi.upload('SUPPORT_TICKET', ticketId, file)));
      return platformApi.replyToTicket(ticketId, reply.trim(), uploaded.map(u => ({ attachment_id: u.attachment_id, name: u.name })));
    },
    onSuccess: (updated) => { setReply(''); setFiles([]); refreshLists(updated); },
    onError: (error) => toastError(error?.message || 'The reply could not be sent.'),
  });
  const update = useMutation({
    mutationFn: (changes) => platformApi.updateTicket(ticketId, changes),
    onSuccess: refreshLists,
    onError: (error) => toastError(error?.message || 'The ticket could not be updated.'),
  });

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [ticket?.messages?.length]);

  if (query.isLoading || !ticket) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-5 py-3 border-b border-slate-200 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">{ticket.ticket_number}</span>
          <StatusBadge status={ticket.status} />
          <span className="text-xs text-slate-500">{label(ticket.category)}</span>
        </div>
        <p className="text-sm text-slate-800">{ticket.subject || ticket.description.slice(0, 120)}</p>
        <p className="text-xs text-slate-500">
          {ticket.requester_name} · <a className="hover:underline" href={`mailto:${ticket.requester_email}`}>{ticket.requester_email}</a> · {ticket.account_name} · opened {new Date(ticket.created_at).toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <Select value={ticket.status} onValueChange={(status) => update.mutate({ status })}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(STATUS_LABELS).map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={ticket.priority} onValueChange={(priority) => update.mutate({ priority })}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITIES.map(value => <SelectItem key={value} value={value}>{label(value)} priority</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
        {ticket.messages.map((message, index) => {
          const fromSupport = message.role === 'support';
          return (
            <div key={index} className={cn('flex gap-3', fromSupport && 'flex-row-reverse')}>
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', fromSupport ? 'bg-emerald-500' : 'bg-[#002046]')}>
                {fromSupport ? <Headphones className="w-4 h-4" /> : (message.author?.[0] || '?')}
              </div>
              <div className={cn('max-w-[75%] flex flex-col', fromSupport ? 'items-end' : 'items-start')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-600">{fromSupport ? `${message.author}${message.agent ? ` (${message.agent})` : ''}` : message.author}</span>
                  <span className="text-[10px] text-slate-400">{message.date ? new Date(message.date).toLocaleString() : ''}</span>
                </div>
                <div className={cn('rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap', fromSupport ? 'bg-emerald-50 border border-emerald-200 text-slate-800 rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm')}>
                  {message.content}
                </div>
                {message.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {message.attachments.map(file => (
                      <button key={file.attachment_id} type="button" onClick={() => openAttachment(file.attachment_id)}
                        className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-600 hover:text-[#002046] flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />{file.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-200 p-4 bg-white">
        <div className="flex items-end gap-2">
          <label className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer text-slate-400" title="Attach files">
            <Paperclip className="w-4 h-4" />
            <input type="file" multiple className="hidden" onChange={(e) => { setFiles(current => [...current, ...Array.from(e.target.files || [])]); e.target.value = ''; }} />
          </label>
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} className="flex-1 text-sm resize-none"
            placeholder="Reply as Project Hub Support. The customer is emailed and notified in the app."
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && reply.trim()) send.mutate(); }} />
          <Button onClick={() => send.mutate()} disabled={send.isPending || !reply.trim()} className="bg-[#002046] hover:bg-[#003070] h-9">
            {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">{files.map((file, i) => <span key={i} className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{file.name}</span>)}</div>
        )}
      </div>
    </div>
  );
}

/** Platform admins' support queue: every account's tickets from Help Center > Contact support. */
export default function PlatformSupport() {
  const [status, setStatus] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: ['admin-tickets', status, debounced],
    queryFn: () => platformApi.listTickets(status, debounced),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const tickets = query.data || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 flex overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: 480 }}>
      <div className="w-[360px] shrink-0 border-r border-slate-200 flex flex-col">
        <div className="p-3 space-y-2 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, email, account, number" className="h-8 pl-8 text-sm" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{FILTERS.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {query.isLoading ? (
            <div className="p-5 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400"><Inbox className="w-6 h-6 mx-auto mb-2" />No tickets here.</div>
          ) : tickets.map(ticket => (
            <button key={ticket.id} type="button" onClick={() => setSelected(ticket.id)}
              className={cn('w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50', selected === ticket.id && 'bg-orange-50')}>
              <div className="flex items-center gap-2">
                {ticket.needs_reply && <span className="w-2 h-2 rounded-full bg-[#d97706] shrink-0" title="Waiting for a reply" />}
                <span className="text-xs font-semibold text-slate-700">{ticket.ticket_number}</span>
                <span className="text-xs text-slate-500 truncate flex-1">{ticket.account_name}</span>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="text-sm text-slate-800 truncate mt-1">{ticket.subject || ticket.description}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {ticket.requester_email} · {label(ticket.priority)} · {new Date(ticket.updated_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>
      {selected ? <TicketDetail key={selected} ticketId={selected} /> : (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Choose a ticket to read and reply.</div>
      )}
    </div>
  );
}
