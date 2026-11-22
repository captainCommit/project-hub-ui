import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast, toastError } from '@/components/ui/use-toast';
import { recentlyDeletedApi, RECENTLY_DELETED_QUERY_KEY } from '@/api/recentlyDeleted';
import { invalidateHierarchy } from '@/hooks/useAccountLookups';

const UNDO_SECONDS = 10;
const LABELS = { portfolio: 'Portfolio', program: 'Program', project: 'Project' };

/**
 * "Portfolio deleted · X was moved to Recently Deleted. [Undo]" for 10 seconds after a delete.
 * deleted: the API's record of the deletion (id, name). Undo restores it like Recently Deleted's Restore does.
 */
export function showDeletedToast({ type, deleted, queryClient }) {
  const label = LABELS[type] || 'Item';
  let handle = null;
  const undo = () => {
    handle?.dismiss();
    recentlyDeletedApi.restore(deleted.id)
      .then(() => {
        invalidateHierarchy(queryClient);
        queryClient.invalidateQueries({ queryKey: [RECENTLY_DELETED_QUERY_KEY] });
        toast({ title: `${label} restored`, description: `${deleted.name} is back where it was.` });
      })
      .catch(error => toastError(error.message || `The ${label.toLowerCase()} could not be restored.`));
  };
  handle = toast({
    duration: UNDO_SECONDS * 1000,
    title: (
      <span className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-white rounded-full" style={{ fill: '#16A34A' }} />
        {label} deleted
      </span>
    ),
    description: <span className="block pl-7">{deleted.name} was moved to Recently Deleted.</span>,
    action: (
      <button type="button" onClick={undo}
        className="mr-5 h-8 shrink-0 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-[#002046] hover:bg-slate-50">
        Undo
      </button>
    ),
  });
}
