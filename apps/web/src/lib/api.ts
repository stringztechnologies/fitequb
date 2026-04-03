import type { ApiResponse } from "@fitequb/shared";
import { getSupabaseSession } from "../hooks/useAuth.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function getInitData(): string {
	return window.Telegram?.WebApp?.initData ?? "";
}

function getAuthHeader(): string {
	// Priority 1: Telegram initData
	const initData = getInitData();
	if (initData) {
		return `tma ${initData}`;
	}

	// Priority 2: Supabase session token
	const session = getSupabaseSession();
	if (session?.access_token) {
		return `Bearer ${session.access_token}`;
	}

	// No auth
	return "";
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
	try {
		const authHeader = getAuthHeader();
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (authHeader) {
			headers.Authorization = authHeader;
		}

		const res = await fetch(`${API_URL}${path}`, {
			...options,
			headers: {
				...headers,
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
