import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LifeBuoy, Ticket, ChevronLeft, Plus, Inbox, RotateCcw, Search, X } from 'lucide-react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import TicketForm from '@/components/support/TicketForm';
import TicketConversation from '@/components/support/TicketConversation';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import { supportTicketsApi } from '@/api/collaboration';
import { useAuth } from '@/lib/AuthContext';
import { tourStore } from '@/lib/tours';
import { toast, toastError } from '@/components/ui/use-toast';
import LearnHome from '@/components/learn/LearnHome';
import TutorialLibrary, { TutorialCard } from '@/components/learn/TutorialLibrary';
import TutorialView from '@/components/learn/TutorialView';
import { ALL_TUTORIALS, findTutorial } from '@/tutorials/content';

const STATUS_STYLES = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  awaiting_response: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function LearnSupport() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('home'); // home | new | requests | conversation
  const [activeTicket, setActiveTicket] = useState(null);

  const { projects, programs, portfolios } = useAccountHierarchy();
  const { selectedAccountId, refreshUser } = useAuth();
  const [resettingTours, setResettingTours] = useState(false);
  const replayTours = async () => {
    setResettingTours(true);
    try {
      await tourStore.reset(refreshUser);
      toast({ title: 'Tours are back on', description: 'Each page shows its short tour again the next time you open it.' });
    } catch (error) {
      toastError(error?.message || 'The tours could not be reset.');
    } finally {
      setResettingTours(false);
    }
  };
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support_tickets', selectedAccountId],
    queryFn: () => supportTicketsApi.list(selectedAccountId),
    enabled: !!selectedAccountId,
  });

  const openTicket = (t) => { setActiveTicket(t); setView('conversation'); };

  const [searchParams, setSearchParams] = useSearchParams();
  const linkedTicketId = searchParams.get('ticket');

  // Lessons and tutorials live in the URL (?learn=<id>, ?learn=library) so they can be linked to and the back button works.
  const learn = searchParams.get('learn');
  const tutorial = learn ? findTutorial(learn) : null;
  const showLibrary = learn === 'library';
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const openLearn = (id) => {
    setView('home');
    setSearch('');
    const next = new URLSearchParams(searchParams);
    if (id) next.set('learn', id); else next.delete('learn');
    setSearchParams(next);
  };
  const query = search.trim().toLowerCase();
  const searchResults = query
    ? ALL_TUTORIALS.filter(t => [t.title, t.summary, ...t.steps.map(step => `${step.title} ${step.body}`)].join(' ').toLowerCase().includes(query))
    : [];
  const contactSupport = () => { openLearn(null); setView(tickets.length ? 'requests' : 'new'); };

  // Each lesson starts at the top.
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [learn, view]);
  useEffect(() => {
    if (!linkedTicketId) return;
    let cancelled = false;
    supportTicketsApi.get(linkedTicketId)
      .then((ticket) => { if (!cancelled) openTicket(ticket); })
      .catch(() => {})
      .finally(() => {
        const next = new URLSearchParams(searchParams);
        next.delete('ticket');
        setSearchParams(next, { replace: true });
      });
    return () => { cancelled = true; };
  }, [linkedTicketId]);

  const handleSubmitted = (created) => {
    queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
    setActiveTicket(created);
    setView('conversation');
  };

  return (
    <div className="flex h-screen bg-slate-50" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <ProjectSidebar
        projects={projects} programs={programs} portfolios={portfolios}
        selectedItem={null} selectedType={null}
        onSelectItem={() => {}} onNewProject={() => {}} onNewProgram={() => {}} onNewPortfolio={() => {}}
        onRenameItem={() => {}} onShowVacationCalendar={() => {}}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-[#002046]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#002046]">Learn & Support</h1>
            <p className="text-xs text-slate-500">Everything you need to get started and grow with Row</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {searchOpen ? (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input autoFocus value={search} onChange={e => { setSearch(e.target.value); setView('home'); }}
                  placeholder="Search tutorials..." className="h-9 w-64 rounded-lg border border-slate-200 pl-8 pr-8 text-sm outline-none focus:border-slate-400" />
                <button type="button" onClick={() => { setSearch(''); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Close search">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} title="Search tutorials" aria-label="Search tutorials">
                <Search className="w-4 h-4 text-slate-600" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={replayTours} disabled={resettingTours}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Show tours again
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto p-6">
          {query && view === 'home' ? (
            <div className="max-w-5xl mx-auto">
              <h2 className="text-base font-bold text-[#002046] mb-3">
                {searchResults.length ? `Tutorials matching "${search.trim()}"` : `No tutorials match "${search.trim()}"`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map(t => <TutorialCard key={t.id} tutorial={t} onOpen={openLearn} kicker={t.kind === 'lesson' ? 'Getting Started' : t.group} />)}
              </div>
            </div>
          ) : view === 'home' && tutorial ? (
            <TutorialView tutorial={tutorial} onOpen={openLearn} onLibrary={() => openLearn('library')}
              onBack={() => openLearn(tutorial.kind === 'lesson' ? null : 'library')} />
          ) : view === 'home' && showLibrary ? (
            <TutorialLibrary onOpen={openLearn} onBack={() => openLearn(null)} />
          ) : view === 'conversation' && activeTicket ? (
            <div className="h-full max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
              <TicketConversation ticket={activeTicket} onBack={() => { setView('requests'); setActiveTicket(null); }} />
            </div>
          ) : view === 'new' ? (
            <TicketForm onSubmitted={handleSubmitted} onCancel={() => setView('home')} />
          ) : view === 'requests' ? (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => setView('home')} className="text-slate-500"><ChevronLeft className="w-4 h-4" /> Back</Button>
                <Button size="sm" onClick={() => setView('new')} className="bg-[#002046] hover:bg-[#001634] text-white"><Plus className="w-4 h-4 mr-1.5" /> New Request</Button>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-700">My Requests</h2>
                  <span className="text-xs text-slate-400 ml-1">({tickets.length})</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Ticket #</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Subject</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-xs">Loading…</td></tr>}
                    {!isLoading && tickets.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-16 text-slate-400 text-xs">
                        <Ticket className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No requests yet. Click "New Request" to submit a ticket.
                      </td></tr>
                    )}
                    {tickets.map(t => (
                      <tr key={t.id} onClick={() => openTicket(t)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-800">{t.ticket_number || '—'}</td>
                        <td className="px-5 py-3 text-slate-600">
                          <div className="flex flex-col">
                            <span className="text-sm">{t.subject || t.description?.slice(0, 60) + '…' || '—'}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{t.category?.replace('_', ' ')} · {t.priority} priority</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_STYLES[t.status] || STATUS_STYLES.open}`}>
                            {t.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {t.updated_date ? new Date(t.updated_date).toLocaleDateString() + ' ' + new Date(t.updated_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <LearnHome onOpen={openLearn} onLibrary={() => openLearn('library')} onContact={contactSupport}>
              {tickets.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700">Recent Requests</h3>
                    <button onClick={() => setView('requests')} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all →</button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {tickets.slice(0, 3).map(t => (
                      <button key={t.id} onClick={() => openTicket(t)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left">
                        <div>
                          <span className="text-sm font-medium text-slate-800">{t.ticket_number || '—'}</span>
                          <span className="text-sm text-slate-500 ml-3">{t.subject || t.description?.slice(0, 50) + '…'}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_STYLES[t.status] || STATUS_STYLES.open}`}>{t.status?.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </LearnHome>
          )}
        </div>
      </div>
    </div>
  );
}