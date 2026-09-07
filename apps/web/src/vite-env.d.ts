/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL: string;
	readonly VITE_SUPABASE_URL: string;
	readonly VITE_SUPABASE_ANON_KEY: string;
	readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

interface TelegramWebApp {
	initData: string;
	initDataUnsafe: Record<string, unknown>;
	ready: () => void;
	expand: () => void;
	close: () => void;
	openTelegramLink: (url: string) => void;
	openLink: (url: string) => void;
}

interface Window {
	Telegram?: {
		WebApp?: TelegramWebApp;
	};
}
