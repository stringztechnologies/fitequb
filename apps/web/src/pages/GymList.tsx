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
		<div className="px-5 pt-6 pb-24">
			<h1 className="text-xl font-bold text-white">Gym Day Passes</h1>
			<p className="text-xs text-tg-hint mt-1 mb-5">
				{gyms.length} partner gym{gyms.length !== 1 ? "s" : ""} in Addis Ababa
			</p>

			{gyms.length === 0 ? (
				<div className="text-center mt-16">
					<div className="w-16 h-16 mx-auto rounded-2xl bg-brand-gold/10 flex items-center justify-center mb-4">
						<svg
							viewBox="0 0 24 24"
							className="w-8 h-8 text-brand-gold"
							fill="none"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<line x1="3" y1="9" x2="21" y2="9" />
						</svg>
					</div>
					<p className="text-white font-semibold">No partner gyms yet</p>
					<p className="text-tg-hint text-sm mt-1">Check back soon!</p>
				</div>
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

	const discount =
		gym.day_pass_cost > gym.app_day_pass
			? Math.round(((gym.day_pass_cost - gym.app_day_pass) / gym.day_pass_cost) * 100)
			: 0;

	return (
		<div className="rounded-2xl bg-brand-card border border-brand-border p-4">
			<div className="flex justify-between items-start">
				<div className="flex-1">
					<h3 className="font-semibold text-white text-sm">{gym.name}</h3>
					<p className="text-xs text-tg-hint mt-0.5 flex items-center gap-1">
						<svg
							viewBox="0 0 24 24"
							className="w-3 h-3 inline"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
							<circle cx="12" cy="10" r="3" />
						</svg>
						{gym.location}
					</p>
				</div>
				<div className="text-right">
					<p className="text-lg font-bold text-brand-gold">{gym.app_day_pass}</p>
					<p className="text-[10px] text-tg-hint">ETB</p>
				</div>
			</div>

			<div className="flex items-center justify-between mt-3">
				{discount > 0 && (
					<div className="flex items-center gap-2">
						<span className="text-xs text-tg-hint line-through">{gym.day_pass_cost} ETB</span>
						<span className="px-1.5 py-0.5 rounded bg-brand-green/15 text-brand-green text-[10px] font-bold">
							-{discount}%
						</span>
					</div>
				)}
				<button
					type="button"
					onClick={handleBuy}
					disabled={buying}
					className="ml-auto bg-gradient-green text-black px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50 active:scale-95 transition-transform shadow-glow"
				>
					{buying ? "..." : "Get Pass"}
				</button>
			</div>
		</div>
	);
}
