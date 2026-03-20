import type { User } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api<User>("/api/auth/login", { method: "POST" })
			.then((res) => {
				if (res.data) setUser(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	return { user, loading };
}
