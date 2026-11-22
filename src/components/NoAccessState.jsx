import React from 'react';
import { Lock } from 'lucide-react';

/**
 * Shown in place of a page the user's account role can't view (Account > Users & Roles), e.g. when they open
 * its link directly. The API refuses the data either way; this just explains the empty page.
 */
export default function NoAccessState({ area }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-sm text-center space-y-2">
        <span className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
          <Lock className="w-5 h-5 text-slate-500" />
        </span>
        <h2 className="text-lg font-bold text-[#002046]">You don&apos;t have access to {area}</h2>
        <p className="text-sm text-slate-500">Your role doesn&apos;t include {area}. Ask an account owner if you need it.</p>
      </div>
    </div>
  );
}
