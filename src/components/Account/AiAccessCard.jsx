import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast, toastError } from '@/components/ui/use-toast';
import { aiSettingsApi } from '@/api/ai';
import { useAuth } from '@/lib/AuthContext';
import { useAiStatus } from '@/hooks/useAiStatus';
import { Card } from './ConnectedApps';

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/**
 * Connected apps: the AI assistant. It's turned on per account by Project Hub (a platform admin); until then owners
 * can request it here, and everyone else is told who can.
 */
export default function AiAccessCard() {
  const { selectedAccountId } = useAuth();
  const { status, aiEnabled, isLoading } = useAiStatus();
  const queryClient = useQueryClient();
  const request = useMutation({
    mutationFn: () => aiSettingsApi.requestAccess(selectedAccountId),
    onSuccess: (next) => {
      queryClient.setQueryData(['ai-status', selectedAccountId], next);
      toast({ title: 'AI requested', description: 'We’ll let you know when the AI assistant is turned on for your account.' });
    },
    onError: (error) => toastError(error?.message || 'The request could not be sent.'),
  });
  if (isLoading || !status) return null;

  return (
    <Card title="AI assistant" icon={Sparkles}>
      {aiEnabled ? (
        <div className="text-sm text-slate-700 space-y-1">
          <p>AI is turned on for this account: Ask Compass in the sidebar and Reports on projects, programs and portfolios.</p>
          {status.can_manage && (
            <Link to="/Account?tab=ai" className="text-sm font-medium text-[#002046] hover:underline">Set it up in Account &gt; AI assistant</Link>
          )}
        </div>
      ) : status.can_manage ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Ask Compass answers questions about your projects, risks and resources, and writes status reports. Project Hub turns it on for your account when you ask.
          </p>
          {status.requested_at ? (
            <p className="text-sm text-slate-500">Requested on {formatDate(status.requested_at)}. The AI assistant tab appears here once it’s turned on.</p>
          ) : (
            <Button size="sm" onClick={() => request.mutate()} disabled={request.isPending} className="bg-[#c87b14] hover:bg-[#a86610] text-white">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Request AI
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">AI isn’t turned on for this account. An account owner can request it here.</p>
      )}
    </Card>
  );
}
