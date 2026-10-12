import React from 'react';

// "TASK_BOARD_MOVED" -> "Task board moved"
const humanize = (value) => {
  const text = String(value || '').replace(/_/g, ' ').toLowerCase().trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

function ChangeRow({ change }) {
  const { label, old: before, new: after } = change;
  return (
    <li className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm">
      <span className="font-medium text-slate-700">{label}:</span>
      {before !== null && after !== null ? (
        <>
          <span className="text-slate-400 line-through break-words">{before}</span>
          <span className="text-slate-400" aria-label="changed to">→</span>
          <span className="text-slate-800 break-words">{after}</span>
        </>
      ) : after !== null ? (
        <>
          {/* Set where it was empty before (or a new record). */}
          <span className="text-slate-800 break-words">{after}</span>
        </>
      ) : (
        <>
          <span className="text-slate-400 line-through break-words">{before}</span>
          <span className="text-xs text-slate-400">(cleared)</span>
        </>
      )}
    </li>
  );
}

/** Project audit timeline: who did what to which item, with each change in plain words. */
export default function AuditView({ auditEntries = [] }) {
  return (
    <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl">
      <div className="divide-y divide-slate-100">
        {auditEntries.map(entry => {
          const actor = entry.actor_name || entry.user_name;
          const entityName = entry.entity_name || entry.entity_title;
          const message = entry.message || entry.details;
          const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;
          const hasValidTimestamp = timestamp && !Number.isNaN(timestamp.getTime());
          const changes = Array.isArray(entry.changes) ? entry.changes : null;
          // Older API responses had no readable changes; fall back to the raw values.
          const showRaw = !changes && (entry.before !== undefined || entry.after !== undefined);

          return (
            <div key={entry.id} className="p-4 hover:bg-slate-50/70 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.action && <span className="text-sm font-semibold text-slate-800">{humanize(entry.action)}</span>}
                    {actor && <span className="text-xs text-slate-500">by {actor}</span>}
                    {hasValidTimestamp && <span className="text-xs text-slate-400">{timestamp.toLocaleString()}</span>}
                  </div>
                  {(entry.entity_type || entityName) && (
                    <div className="mt-1 text-xs text-slate-500">
                      {entry.entity_type && <span className="font-medium text-slate-600">{humanize(entry.entity_type)}</span>}
                      {entityName && <span>{entry.entity_type ? ': ' : ''}{entityName}</span>}
                    </div>
                  )}
                  {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
                  {changes && changes.length > 0 && (
                    <ul className="mt-2 space-y-1 bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
                      {changes.map((change, i) => <ChangeRow key={`${change.field}-${i}`} change={change} />)}
                    </ul>
                  )}
                  {showRaw && (
                    <div className="mt-2 grid gap-2 md:grid-cols-2 text-xs">
                      {entry.before !== undefined && (
                        <pre className="bg-slate-50 border border-slate-100 rounded-md p-2 overflow-auto text-slate-500">{JSON.stringify(entry.before, null, 2)}</pre>
                      )}
                      {entry.after !== undefined && (
                        <pre className="bg-slate-50 border border-slate-100 rounded-md p-2 overflow-auto text-slate-500">{JSON.stringify(entry.after, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
