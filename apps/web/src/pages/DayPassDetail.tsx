import type { DayPass } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

interface PassWithGym extends DayPass {
	partner_gyms: { name: string; location: string };
}

export function DayPassDetail() {
	const { id } = useParams<{ id: string }>();
	const [pass, setPass] = useState<PassWithGym | null>(null);
	const [loading, setLoading] = useState(true);
	const [timeLeft, setTimeLeft] = useState("");

	useEffect(() => {
		if (!id) return;
		api<PassWithGym>(`/api/gyms/day-passes/${id}`)
			.then((res) => {
				if (res.data) setPass(res.data);
			})
			.finally(() => setLoading(false));
	}, [id]);

	// Countdown timer
	useEffect(() => {
		if (!pass || pass.status !== "active") return;

		const interval = setInterval(() => {
			const diff = new Date(pass.expires_at).getTime() - Date.now();
			if (diff <= 0) {
				setTimeLeft("Expired");
				clearInterval(interval);
				return;
			}
			const mins = Math.floor(diff / 60000);
			const secs = Math.floor((diff % 60000) / 1000);
			setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
		}, 1000);

		return () => clearInterval(interval);
	}, [pass]);

	if (loading || !pass) return <Loading />;

	return (
		<div className="p-4 pb-20 text-center">
			<h1 className="text-xl font-bold text-tg-text">{pass.partner_gyms.name}</h1>
			<p className="text-sm text-[#8E8E93]">{pass.partner_gyms.location}</p>

			<div className="mt-6">
				{pass.status === "active" ? (
					<>
						<div className="bg-white rounded-[16px] p-6 mx-auto max-w-[200px] shadow-lg">
							<div className="w-full aspect-square bg-tg-secondary-bg rounded-lg flex items-center justify-center">
								<p className="text-xs text-[#8E8E93] font-mono break-all px-2">{pass.qr_token}</p>
							</div>
						</div>
						<p className="mt-4 text-2xl font-bold text-tg-text">{timeLeft}</p>
						<p className="text-xs text-[#8E8E93] mt-1">Show this to gym staff</p>
					</>
				) : pass.status === "redeemed" ? (
					<div className="mt-8">
						<p className="text-4xl">✅</p>
						<p className="text-lg font-semibold text-tg-text mt-2">Pass Redeemed</p>
						<p className="text-sm text-[#8E8E93]">Enjoy your workout!</p>
					</div>
				) : (
					<div className="mt-8">
						<p className="text-4xl">⏰</p>
						<p className="text-lg font-semibold text-tg-text mt-2">Pass Expired</p>
						<p className="text-sm text-[#8E8E93]">Purchase a new one to visit the gym</p>
					</div>
				)}
			</div>
		</div>
	);
}
