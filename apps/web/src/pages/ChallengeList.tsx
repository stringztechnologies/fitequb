import type { Challenge } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

export function ChallengeList() {
	const [challenges, setChallenges] = useState<Challenge[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api<Challenge[]>("/api/challenges")
			.then((res) => {
				if (res.data) setChallenges(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	return (
		<div className="p-4 pb-20">
			<h1 className="text-xl font-bold text-tg-text mb-4">Step Challenges</h1>

			{challenges.length === 0 ? (
				<p className="text-[#8E8E93] text-sm text-center mt-8">No active challenges right now.</p>
			) : (
				<div className="space-y-3">
					{challenges.map((ch) => (
						<a
							key={ch.id}
							href={`/challenges/${ch.id}`}
							className="block rounded-xl bg-tg-secondary-bg p-4 active:opacity-70"
						>
							<h3 className="font-semibold text-tg-text">{ch.name}</h3>
							{ch.description && <p className="text-xs text-[#8E8E93] mt-1">{ch.description}</p>}
							{ch.reward_description && (
								<p className="text-xs text-tg-link mt-1">Prize: {ch.reward_description}</p>
							)}
						</a>
					))}
				</div>
			)}
		</div>
	);
}
