import Constants from 'expo-constants';

const resolveExpoHost = () => {
	const hostUri =
		Constants.expoConfig?.hostUri ||
		Constants.manifest2?.extra?.expoClient?.hostUri ||
		Constants.manifest?.debuggerHost ||
		'';

	if (!hostUri) return null;
	return hostUri.split(':')[0];
};

const normalizeBaseUrl = (value) => value?.replace(/\/$/, '');

const toBoolean = (value) => String(value || '').toLowerCase() === 'true';

// Local API override is opt-in only to avoid accidental 403/404 from stale local backends.
const shouldUseLocalApi =
	toBoolean(process.env.EXPO_PUBLIC_USE_LOCAL_API) ||
	toBoolean(Constants.expoConfig?.extra?.useLocalApi);

export const API_URL = (() => {
	const explicitUrl =
		process.env.EXPO_PUBLIC_API_URL ||
		process.env.REACT_APP_API_BASE_URL ||
		process.env.API_BASE_URL;

	if (explicitUrl) {
		console.log('🌐 API_URL from explicit env:', explicitUrl);
		return normalizeBaseUrl(explicitUrl);
	}

	const expoHost = resolveExpoHost();
	if (expoHost) {
		const localUrl = `http://${expoHost}:3000`;
		console.log('🌐 API_URL from expoHost:', localUrl);
		return localUrl;
	}

	console.log('🌐 API_URL fallback to production');
	return 'https://goon-user.onrender.com';
})();

export const AGORA_APP_ID =
	process.env.EXPO_PUBLIC_AGORA_APP_ID ||
	Constants.expoConfig?.extra?.agoraAppId ||
	'';