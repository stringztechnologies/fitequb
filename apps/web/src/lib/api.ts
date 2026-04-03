import type { ApiResponse } from "@fitequb/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function getInitData(): string {
	return window.Telegram?.WebApp?.initData ?? "";
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
	try {
		const res = await fetch(`${API_URL}${path}`, {
			...options,
			headers: {
				"Content-Type": "application/json",
				Authorization: `tma ${getInitData()}`,
				...options.headers,
			},
		});

		return res.json() as Promise<ApiResponse<T>>;
	} catch {
		return { data: null as T, error: "Network error" } as ApiResponse<T>;
	}
}

/** Public API — no auth header, used for guest browsing */
export async function publicApi<T>(
	path: string,
	options: RequestInit = {},
): Promise<ApiResponse<T>> {
	try {
		const res = await fetch(`${API_URL}${path}`, {
			...options,
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		return res.json() as Promise<ApiResponse<T>>;
	} catch {
		return { data: null as T, error: "Network error" } as ApiResponse<T>;
	}
}
