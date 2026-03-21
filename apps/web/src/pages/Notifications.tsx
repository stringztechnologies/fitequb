import { useEffect, useState } from "react";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

interface Notification {
	id: string;
	type: "payout" | "gym" | "urgency" | "info" | "earnings";
	title: string;
	body: string;
	time: string;
}

const borderColors: Record<string, string> = {
	payout: "#FFD700",
	gym: "#00C853",
	urgency: "#FF3B30",
	info: "transparent",
	earnings: "#FFD700",
};

const iconColors: Record<string, string> = {
	payout: "#FFD700",
	gym: "#00C853",
	urgency: "#FF3B30",
	info: "#00BCD4",
	earnings: "#FFD700",
};

export function Notifications() {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<"all" | "earnings">("all");

	useEffect(() => {
		api<Notification[]>("/api/notifications")
			.then((res) => {
				if (res.data) setNotifications(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	const filtered =
		tab === "earnings"
			? notifications.filter((n) => n.type === "earnings" || n.type === "payout")
			: notifications;

	return (
		<div className="px-4 pt-5 pb-24">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-[20px] font-bold text-white">Notification Center</h1>
			</div>

			{/* Tab Bar */}
			<div className="flex gap-6 mb-5 border-b border-[rgba(255,255,255,0.08)]">
				<button
					type="button"
					onClick={() => setTab("all")}
					className={`pb-2.5 text-[14px] font-medium transition-colors ${
						tab === "all" ? "text-white border-b-2 border-[#FFD700]" : "text-[#8E8E93]"
					}`}
				>
					All
				</button>
				<button
					type="button"
					onClick={() => setTab("earnings")}
					className={`pb-2.5 text-[14px] font-medium transition-colors ${
						tab === "earnings" ? "text-white border-b-2 border-[#FFD700]" : "text-[#8E8E93]"
					}`}
				>
					Earnings
				</button>
			</div>

			{/* Notification Cards */}
			{filtered.length > 0 ? (
				<div className="space-y-3">
					{filtered.map((n) => (
						<div
							key={n.id}
							className="rounded-[16px] bg-[#1c1c1e] p-4 border border-[rgba(255,255,255,0.08)]"
							style={{ borderLeftWidth: "3px", borderLeftColor: borderColors[n.type] }}
						>
							<div className="flex items-start gap-3">
								{/* Icon */}
								<div
									className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
									style={{ backgroundColor: `${iconColors[n.type]}15` }}
								>
									<svg
										viewBox="0 0 24 24"
										className="w-5 h-5"
										fill="none"
										stroke={iconColors[n.type]}
										strokeWidth={2}
									>
										{n.type === "payout" || n.type === "earnings" ? (
											<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
										) : n.type === "gym" ? (
											<path d="M6.5 6.5h11M4 12h16M6.5 17.5h11" />
										) : n.type === "urgency" ? (
											<path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
										) : (
											<circle cx="12" cy="12" r="10" />
										)}
									</svg>
								</div>

								<div className="flex-1 min-w-0">
									<p className="text-[14px] font-semibold text-white leading-snug">{n.title}</p>
									<p className="text-[12px] text-[#8E8E93] mt-1 leading-relaxed">{n.body}</p>
									<p className="text-[11px] text-[#636366] mt-1.5">{n.time}</p>
								</div>

								{n.type === "urgency" && (
									<div className="w-2.5 h-2.5 rounded-full bg-[#FF3B30] shrink-0 mt-1 animate-pulse" />
								)}
							</div>
						</div>
					))}
				</div>
			) : (
				<div
					style={{
						textAlign: "center",
						padding: "48px 24px",
						backgroundColor: "#1c1c1e",
						borderRadius: "16px",
						border: "1px solid rgba(255,255,255,0.08)",
					}}
				>
					<svg
						viewBox="0 0 24 24"
						style={{ width: "48px", height: "48px", margin: "0 auto 16px" }}
						fill="none"
						stroke="#3a3a3c"
						strokeWidth={1.5}
					>
						<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
						<path d="M13.73 21a2 2 0 0 1-3.46 0" />
					</svg>
					<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FFF", margin: "0 0 8px" }}>
						No Notifications Yet
					</h3>
					<p style={{ fontSize: "14px", color: "#8E8E93", margin: 0, lineHeight: 1.5 }}>
						You'll see updates about your Equbs, payouts, and challenges here.
					</p>
				</div>
			)}
		</div>
	);
}
