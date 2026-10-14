import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PlayCircle, BookOpen, LifeBuoy, Ticket, ChevronLeft, Plus, Inbox } from 'lucide-react';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import TicketForm from '@/components/support/TicketForm';
import TicketConversation from '@/components/support/TicketConversation';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';
import { supportTicketsApi } from '@/api/collaboration';
import { useAuth } from '@/lib/AuthContext';

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
  const { selectedAccountId } = useAuth();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support_tickets', selectedAccountId],
    queryFn: () => supportTicketsApi.list(selectedAccountId),
    enabled: !!selectedAccountId,
  });

  const openTicket = (t) => { setActiveTicket(t); setView('conversation'); };

  const [searchParams, setSearchParams] = useSearchParams();
  const linkedTicketId = searchParams.get('ticket');
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
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Learn & Support</h1>
            <p className="text-xs text-slate-400">Get help and make the most of Row</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {view === 'conversation' && activeTicket ? (
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
            /* Home view */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Welcome banner */}
              <div className="bg-gradient-to-br from-[#002046] to-[#003a7a] rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
                <div className="absolute -right-16 -bottom-16 w-52 h-52 bg-[#c87b14]/20 rounded-full" />
                <div className="relative">
                  <h2 className="text-2xl font-bold mb-1">Welcome to Row Support</h2>
                  <p className="text-sm text-white/80">Learn how to get the most from Row. We're here to help you succeed.</p>
                </div>
              </div>

              {/* Action cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => setView('requests')} className="text-left bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all group">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Ticket className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Contact Support</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Submit a ticket and track your requests with our support team.</p>
                </button>

                <a href="#" className="text-left bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all group">
                  <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <PlayCircle className="w-5 h-5 text-rose-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Watch Getting Started</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Quick walkthrough videos to get you up and running in minutes.</p>
                </a>

                <a href="#" className="text-left bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all group">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Browse Tutorials</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">In-depth guides covering every feature and common workflows.</p>
                </a>
              </div>

              {/* Recent requests preview */}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}