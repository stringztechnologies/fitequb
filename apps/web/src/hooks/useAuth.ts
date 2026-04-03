import type { User } from "@fitequb/shared";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";

function isQaTestMode(): boolean {
	return new URLSearchParams(window.location.search).get("test") === "true";
}

const QA_TEST_USER: User = {
	id: "qa-test-user",
	telegram_id: 999999,
	supabase_uid: null,
	email: null,
	full_name: "Test User",
	username: "qa_test_user",
	phone: null,
	total_points: 15400,
	level: 12,
	badges: ["Early Bird", "100k Steps", "Marathoner", "Team Player"],
	referral_code: "FITEQUB-TEST",
	referred_by_trainer: null,
	created_at: new Date().toISOString(),
};

export type AuthMethod = "telegram" | "supabase" | null;

/** Module-level session so api.ts can access it */
let currentSession: Session | null = null;

export function getSupabaseSession(): Session | null {
	return currentSession;
}

export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
	const [session, setSession] = useState<Session | null>(null);

	useEffect(() => {
		if (isQaTestMode()) {
			setUser(QA_TEST_USER);
			setAuthMethod("telegram");
			setLoading(false);
			return;
		}

		// Priority 1: Telegram initData
		if (window.Telegram?.WebApp?.initData) {
			const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
			const urlParams = new URLSearchParams(window.location.search);
			const trainerCode = startParam ?? urlParams.get("trainer_code") ?? undefined;

			api<User>("/api/auth/login", {
				method: "POST",
				body: JSON.stringify({ trainer_code: trainerCode }),
			})
				.then((res) => {
					if (res.data) {
						setUser(res.data);
						setAuthMethod("telegram");
					}
				})
				.finally(() => setLoading(false));
			return;
		}

		// Priority 2: Existing Supabase session (only if client is available)
		if (!supabase) {
			// No Supabase client — go straight to guest mode
			setLoading(false);
			return;
		}

		supabase.auth.getSession().then(({ data: { session: s } }) => {
			if (s) {
				currentSession = s;
				setSession(s);
				setAuthMethod("supabase");
				fetchMe(s.access_token).then((u) => {
					if (u) setUser(u);
					setLoading(false);
				});
			} else {
				setLoading(false);
			}
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, s) => {
			currentSession = s;
			setSession(s);
			if (s) {
				setAuthMethod("supabase");
				fetchMe(s.access_token).then((u) => {
					if (u) setUser(u);
				});
			} else {
				setUser(null);
				setAuthMethod(null);
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	async function signOut() {
		await supabase?.auth.signOut();
		currentSession = null;
		setSession(null);
		setUser(null);
		setAuthMethod(null);
	}

	const isGuest = !user && !window.Telegram?.WebApp?.initData && !session;

	return { user, loading, isGuest, authMethod, session, signOut };
}

async function fetchMe(accessToken: string): Promise<User | null> {
	const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
	try {
		const res = await fetch(`${API_URL}/web-auth/me`, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
		});
		if (!res.ok) return null;
		const json = (await res.json()) as { data: User | null };
		return json.data;
	} catch {
		return null;
	}
}
