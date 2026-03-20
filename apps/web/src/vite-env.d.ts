/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL: string;
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
}

interface Window {
	Telegram?: {
		WebApp?: TelegramWebApp;
	};
}
