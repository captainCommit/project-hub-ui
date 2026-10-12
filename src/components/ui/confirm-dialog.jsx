import React, { useEffect, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';

// Promise-based replacement for window.confirm, rendered by the single <ConfirmDialogHost /> in App.
let pending = null;
const listeners = new Set();
const emit = () => listeners.forEach(listener => listener(pending));

export function confirmAction({ title, description, confirmLabel = 'Delete', cancelLabel = 'Cancel', destructive = true }) {
  // A second request supersedes an unanswered one, which resolves as cancelled.
  pending?.resolve(false);
  return new Promise(resolve => {
    pending = { title, description, confirmLabel, cancelLabel, destructive, resolve };
    emit();
  });
}

const settle = (result) => {
  if (!pending) return;
  pending.resolve(result);
  pending = null;
  emit();
};

export function ConfirmDialogHost() {
  const [request, setRequest] = useState(pending);

  useEffect(() => {
    listeners.add(setRequest);
    return () => { listeners.delete(setRequest); };
  }, []);

  return (
    <AlertDialog open={Boolean(request)} onOpenChange={(open) => { if (!open) settle(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description && <AlertDialogDescription>{request.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>{request?.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={request?.destructive ? buttonVariants({ variant: 'destructive' }) : undefined}
            onClick={() => settle(true)}
          >
            {request?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
