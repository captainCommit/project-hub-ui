import React from 'react';

/** Project audit timeline: one row per audit entry, with before/after payloads when the API sends them. */
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

          return (
            <div key={entry.id} className="p-4 hover:bg-slate-50/70 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.action && <span className="text-sm font-semibold text-slate-800">{entry.action}</span>}
                    {actor && <span className="text-xs text-slate-500">by {actor}</span>}
                    {hasValidTimestamp && <span className="text-xs text-slate-400">{timestamp.toLocaleString()}</span>}
                  </div>
                  {(entry.entity_type || entityName || entry.entity_id) && (
                    <div className="mt-1 text-xs text-slate-500">
                      {entry.entity_type && <span className="font-medium text-slate-600">{entry.entity_type}</span>}
                      {entityName && <span>{entry.entity_type ? ': ' : ''}{entityName}</span>}
                      {entry.entity_id && <span className="text-slate-400"> ({entry.entity_id})</span>}
                    </div>
                  )}
                  {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
                  {(entry.before !== undefined || entry.after !== undefined) && (
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
