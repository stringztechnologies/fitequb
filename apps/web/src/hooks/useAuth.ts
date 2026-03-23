import type { User } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { isQaTestMode } from "../lib/testMode.js";

const QA_TEST_USER: User = {
	id: "qa-test-user",
	telegram_id: 999999,
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

export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// In QA test mode, use fake user immediately
		if (isQaTestMode()) {
			setUser(QA_TEST_USER);
			setLoading(false);
			return;
		}

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
