const isNode = typeof window === 'undefined';
const storage = isNode ? null : window.localStorage;

const getStoredValue = (key) => {
	if (!storage) return null;
	return storage.getItem(key);
};

export const appParams = {
	apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
	token: getStoredValue('project_hub_access_token') || getStoredValue('token'),
	fromUrl: isNode ? '' : window.location.href,
};
