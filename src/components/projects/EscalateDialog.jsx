import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Search, User, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast, toastError } from '@/components/ui/use-toast';
import { raidApi } from '@/api/raid';
import { cn } from '@/lib/utils';

const ORANGE = '#c87b14';
const NAVY = '#002046';

const sectionLabel = 'text-xs font-semibold text-slate-500 mb-1.5';

/**
 * "Escalate RL-102": pick one person or a team (the resources' departments), add a note, and they're notified and
 * emailed. People without a Project Hub login can't be emailed, so they're shown but can't be picked.
 * entityType: RISK, ISSUE, ASSUMPTION or DEPENDENCY. onEscalated runs after the API accepted it.
 */
export default function EscalateDialog({ open, onOpenChange, entityType, item, code, resources = [], onEscalated = undefined }) {
  const [mode, setMode] = useState('person');
  const [query, setQuery] = useState('');
  const [personId, setPersonId] = useState('');
  const [team, setTeam] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('person'); setQuery(''); setPersonId(''); setTeam(''); setNote('');
  }, [open]);

  const people = useMemo(() => resources
    .filter(r => r.is_active !== false && r.full_name)
    .sort((a, b) => a.full_name.localeCompare(b.full_name)), [resources]);
  const q = query.trim().toLowerCase();
  const shownPeople = q
    ? people.filter(r => r.full_name.toLowerCase().includes(q) || (r.role || '').toLowerCase().includes(q))
    : people;
  // Departments, de-duplicated without regard to case or stray spaces (the API matches them the same way).
  const teams = useMemo(() => {
    const byKey = new Map();
    people.forEach(r => {
      const name = (r.department || '').trim();
      if (name && !byKey.has(name.toLowerCase())) byKey.set(name.toLowerCase(), name);
    });
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }, [people]);

  const ready = mode === 'person' ? !!personId : !!team;

  const submit = async () => {
    if (!ready || sending) return;
    setSending(true);
    try {
      const result = /** @type {any} */ (await raidApi.escalate(entityType.toLowerCase(), item.id, {
        ...(mode === 'person' ? { resource_id: personId } : { team }),
        ...(note.trim() ? { note: note.trim() } : {}),
      }));
      const emailed = result.notified.filter(n => n.emailed).length;
      const skipped = result.skipped.map(s => `${s.name} (${s.reason.replace(/\.$/, '').toLowerCase()})`);
      toast({
        title: `Escalated to ${result.escalated_to}`,
        description: [
          emailed
            ? `Emailed ${emailed === result.notified.length ? '' : `${emailed} of `}${result.notified.length} ${result.notified.length === 1 ? 'person' : 'people'}.`
            : 'They were notified in Project Hub. Email isn\'t set up for this account yet.',
          skipped.length ? `Not notified: ${skipped.join(', ')}.` : '',
        ].filter(Boolean).join(' '),
      });
      onEscalated?.(result);
      onOpenChange(false);
    } catch (error) {
      toastError(error?.message || 'The escalation could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const modeButton = (value, Icon, label) => (
    <button type="button" onClick={() => setMode(value)}
      className={cn('flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-colors',
        mode === value ? 'border-[#c87b14] bg-orange-50 text-[#002046]' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold" style={{ color: NAVY }}>
            <Bell className="w-5 h-5" style={{ color: ORANGE }} /> Escalate {code || ''}
          </DialogTitle>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <p className={sectionLabel}>Escalate to</p>
            <div className="grid grid-cols-2 gap-3">
              {modeButton('person', User, 'A person')}
              {modeButton('team', Users, 'A team')}
            </div>
          </div>

          {mode === 'person' ? (
            <div>
              <p className={sectionLabel}>Person</p>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or role..." className="h-9 pl-9 text-sm" />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
                {shownPeople.length === 0 && <p className="px-3 py-4 text-sm text-center text-slate-400">No people match.</p>}
                {shownPeople.map(r => {
                  const reachable = !!r.user_id;
                  return (
                    <button key={r.id} type="button" disabled={!reachable} onClick={() => setPersonId(r.id)}
                      title={reachable ? undefined : 'No Project Hub login, so they can\'t be emailed.'}
                      className={cn('w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm',
                        personId === r.id ? 'bg-orange-50' : reachable ? 'hover:bg-slate-50' : 'opacity-50 cursor-not-allowed')}>
                      <span className={cn('truncate', personId === r.id ? 'font-semibold text-[#002046]' : 'text-slate-800')}>{r.full_name}</span>
                      <span className="text-xs text-slate-400 truncate">{reachable ? r.role : 'No login'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className={sectionLabel}>Team</p>
              {teams.length === 0 ? (
                <p className="text-sm text-slate-400">No teams yet. Teams are the departments set on people in Resources.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {teams.map(name => (
                    <button key={name} type="button" onClick={() => setTeam(name)}
                      className={cn('h-9 rounded-lg border text-sm transition-colors truncate px-2',
                        team === name ? 'border-[#c87b14] bg-orange-50 font-semibold text-[#002046]' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}>
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <p className={sectionLabel}>Note (optional)</p>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Why is this being escalated?" className="text-sm min-h-[72px]" maxLength={2000} />
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={!ready || sending} onClick={submit} className="text-white border-0 hover:opacity-90" style={{ backgroundColor: ORANGE }}>
            {sending ? 'Sending...' : 'Escalate & notify'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
