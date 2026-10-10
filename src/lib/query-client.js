import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			// Reuse fetched data for a minute instead of refetching on every page visit. Saves still
			// invalidate the queries they change, so your own edits show up immediately.
			staleTime: 60_000,
			retry: 1,
		},
	},
});