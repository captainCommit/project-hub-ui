import React from 'react';

/**
 * Full-page card for sign-in and startup problems.
 * actions: [{ label, onClick, primary? }]
 */
export default function AuthStatusScreen({ title, message, actions = [] }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-slate-50">
      <div role="alert" className="max-w-md w-full rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
        {actions.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {actions.map(({ label, onClick, primary }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className={primary
                  ? 'rounded-md bg-[#c87b14] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a86610]'
                  : 'rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
