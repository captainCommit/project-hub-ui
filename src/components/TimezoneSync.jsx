import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationPreferencesApi } from '@/api/notifications';

const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

// Once per page load, even though every page mounts its own copy.
let attempted = false;

/**
 * The daily digest and due-soon reminders go out at a local hour, so the server needs the person's
 * timezone. Until they (or this) have set one, save the browser's zone. Renders nothing.
 */
export default function TimezoneSync() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationPreferencesApi.getSilently,
    staleTime: Infinity,
    enabled: !attempted,
  });

  useEffect(() => {
    if (attempted || !data || data.timezone_confirmed) return;
    const zone = browserTimezone();
    if (!zone) return;
    attempted = true;
    notificationPreferencesApi.update({ timezone: zone }, { silent: true })
      .then(updated => queryClient.setQueryData(['notification-preferences'], updated))
      .catch(() => {}); // Not worth bothering anyone; it's tried again on the next visit.
  }, [data, queryClient]);

  return null;
}
