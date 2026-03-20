import type { PartnerGym } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

export function GymList() {
	const [gyms, setGyms] = useState<PartnerGym[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api<PartnerGym[]>("/api/gyms")
			.then((res) => {
				if (res.data) setGyms(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	return (
		<div className="p-4 pb-20">
			<h1 className="text-xl font-bold text-tg-text mb-4">Gym Day Passes</h1>

			{gyms.length === 0 ? (
				<p className="text-tg-hint text-sm text-center mt-8">No partner gyms available yet.</p>
			) : (
				<div className="space-y-3">
					{gyms.map((gym) => (
						<GymCard key={gym.id} gym={gym} />
					))}
				</div>
			)}
		</div>
	);
}

function GymCard({ gym }: { gym: PartnerGym }) {
	const [buying, setBuying] = useState(false);

	async function handleBuy() {
		setBuying(true);
		const res = await api<{ checkout_url: string }>("/api/gyms/day-passes", {
			method: "POST",
			body: JSON.stringify({ gym_id: gym.id }),
		});
		setBuying(false);

		if (res.data?.checkout_url) {
			window.open(res.data.checkout_url, "_blank");
		}
	}

	return (
		<div className="rounded-xl bg-tg-secondary-bg p-4">
			<div className="flex justify-between items-start">
				<div>
					<h3 className="font-semibold text-tg-text">{gym.name}</h3>
					<p className="text-xs text-tg-hint mt-0.5">{gym.location}</p>
				</div>
				<p className="text-sm font-bold text-tg-text">{gym.app_day_pass} ETB</p>
			</div>
			<button
				type="button"
				onClick={handleBuy}
				disabled={buying}
				className="w-full mt-3 bg-tg-button text-tg-button-text py-2 rounded-lg text-sm font-medium disabled:opacity-50"
			>
				{buying ? "Processing..." : "Get Day Pass"}
			</button>
		</div>
	);
}
