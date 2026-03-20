import type { User } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Extract trainer code from Telegram start_param or URL query
		const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
		const urlParams = new URLSearchParams(window.location.search);
		const trainerCode = startParam ?? urlParams.get("trainer_code") ?? undefined;

		api<User>("/api/auth/login", {
			method: "POST",
			body: JSON.stringify({ trainer_code: trainerCode }),
		})
			.then((res) => {
				if (res.data) setUser(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	return { user, loading };
}
