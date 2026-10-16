import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle, AlertTriangle, BookOpen, Briefcase, CheckSquare, FolderKanban, Layers, Loader2, Scale, Search,
  Timer, User, Wrench,
} from 'lucide-react';
import { searchApi } from '@/api/search';
import { cn } from '@/lib/utils';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

const TYPES = {
  PORTFOLIO: { label: 'Portfolio', icon: Briefcase },
  PROGRAM: { label: 'Program', icon: Layers },
  PROJECT: { label: 'Project', icon: FolderKanban },
  TASK: { label: 'Task', icon: CheckSquare },
  RISK: { label: 'Risk', icon: AlertTriangle },
  ISSUE: { label: 'Issue', icon: AlertCircle },
  ASSUMPTION: { label: 'Assumption', icon: BookOpen },
  DECISION: { label: 'Decision', icon: Scale },
  SPRINT: { label: 'Sprint', icon: Timer },
  RESOURCE: { label: 'Resource', icon: User },
  SKILL: { label: 'Skill', icon: Wrench },
};

// Where each kind of result opens.
function resultPath(result) {
  const { entity_type: type, id, project_id: projectId } = result;
  switch (type) {
    case 'PORTFOLIO': return `/portfolios/${id}`;
    case 'PROGRAM': return `/programs/${id}`;
    case 'PROJECT': return `/projects/${id}/sheet`;
    case 'TASK': return `/projects/${projectId}/sheet?task=${id}`;
    case 'RISK': return `/RiskLog?tab=risks&id=${id}`;
    case 'ISSUE': return `/RiskLog?tab=issues&id=${id}`;
    case 'ASSUMPTION': return '/RiskLog?tab=assumptions';
    case 'DECISION': return `/ChangeRegisterHub?tab=decisions&id=${id}`;
    case 'SPRINT': return `/SprintManagement?focusSprint=${id}`;
    default: return '/ResourceManagementHub';
  }
}

/** Search box that looks across the whole app as you type. */
export default function GlobalSearch({ className }) {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    const close = (event) => { if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const enabled = term.length >= MIN_CHARS;
  const { data: results = [], isFetching, isError } = useQuery({
    queryKey: ['global-search', term],
    queryFn: () => searchApi.search(term),
    enabled,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  useEffect(() => { setActive(0); }, [results]);

  const choose = (result) => {
    setOpen(false);
    setText('');
    navigate(resultPath(result));
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (!results.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(i => (i + 1) % results.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => (i - 1 + results.length) % results.length); }
    else if (event.key === 'Enter' && open && results[active]) { event.preventDefault(); choose(results[active]); }
  };

  const showPanel = open && text.trim().length >= MIN_CHARS;
  const waiting = text.trim() !== term || (isFetching && !results.length);

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#64748B' }} />
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search projects, risks, issues..."
        aria-label="Search everything"
        role="combobox"
        aria-expanded={showPanel}
        className="w-full h-9 pl-9 pr-8 rounded-full border border-slate-200 bg-white text-sm focus:outline-none focus:border-slate-400"
        style={{ color: '#1E293B' }}
      />
      {isFetching && enabled && (
        <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
      )}

      {showPanel && (
        <div className="absolute right-0 mt-2 w-[min(28rem,calc(100vw-2rem))] max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg z-50" role="listbox">
          {isError ? (
            <p className="px-4 py-6 text-sm text-center text-slate-500">Search isn't available right now.</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-slate-500">{waiting ? 'Searching...' : `No results for "${text.trim()}".`}</p>
          ) : (
            results.map((result, index) => {
              const type = TYPES[result.entity_type] || { label: result.entity_type, icon: Search };
              const Icon = type.icon;
              return (
                <button
                  key={`${result.entity_type}-${result.id}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(result)}
                  className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left', index === active ? 'bg-slate-100' : 'hover:bg-slate-50')}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate" style={{ color: '#1E293B' }}>{result.title}</span>
                    {result.subtitle && <span className="block text-xs text-slate-500 truncate">{result.subtitle}</span>}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex-shrink-0">{type.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
