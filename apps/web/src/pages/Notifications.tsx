import { useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState.js";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

interface Notification {
	id: string;
	type: "payout" | "gym" | "urgency" | "info" | "earnings";
	title: string;
	body: string;
	time: string;
}

const borderColorClass: Record<string, string> = {
	payout: "border-secondary-container",
	gym: "border-primary",
	urgency: "border-error",
	info: "border-outline",
	earnings: "border-secondary-container",
};

const iconBgClass: Record<string, string> = {
	payout: "bg-secondary-container/15",
	gym: "bg-primary/15",
	urgency: "bg-error/15",
	info: "bg-outline/15",
	earnings: "bg-secondary-container/15",
};

const iconTextClass: Record<string, string> = {
	payout: "text-secondary-container",
	gym: "text-primary",
	urgency: "text-error",
	info: "text-outline",
	earnings: "text-secondary-container",
};

const iconName: Record<string, string> = {
	payout: "payments",
	gym: "fitness_center",
	urgency: "alarm",
	info: "info",
	earnings: "currency_exchange",
};

const iconFilled: Record<string, boolean> = {
	payout: true,
	gym: false,
	urgency: false,
	info: false,
	earnings: true,
};

const bgIconName: Record<string, string> = {
	payout: "payments",
	gym: "fitness_center",
	urgency: "alarm",
	info: "info",
	earnings: "currency_exchange",
};

export function Notifications() {
	const [tab, setTab] = useState<"all" | "earnings">("all");
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api<Notification[]>("/api/notifications")
			.then((res) => setNotifications(res.data ?? []))
			.catch(() => setNotifications([]))
			.finally(() => setLoading(false));
	}, []);

	const filtered =
		tab === "earnings"
			? notifications.filter((n) => n.type === "earnings" || n.type === "payout")
			: notifications;

	if (loading) return <Loading />;

	return (
		<div className="px-4 pt-5 pb-24">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<h1 className="font-headline font-bold text-xl uppercase tracking-tighter text-[#00c853]">
					Notifications
				</h1>
				<span className="material-symbols-outlined text-on-surface-variant text-2xl cursor-pointer">
					settings
				</span>
			</div>

			{/* Tabs */}
			<div className="flex items-center gap-8 mb-8 px-2">
				<button
					type="button"
					onClick={() => setTab("all")}
					className="relative pb-2 transition-colors"
				>
					<span
						className={
							tab === "all"
								? "text-secondary-container font-label text-sm font-bold uppercase tracking-widest"
								: "text-on-surface-variant opacity-60 font-label text-sm font-bold uppercase tracking-widest"
						}
					>
						All
					</span>
					{tab === "all" && (
						<span className="absolute bottom-0 left-0 right-0 h-[3px] bg-secondary-container rounded-full" />
					)}
				</button>
				<button
					type="button"
					onClick={() => setTab("earnings")}
					className="relative pb-2 transition-colors"
				>
					<span
						className={
							tab === "earnings"
								? "text-secondary-container font-label text-sm font-bold uppercase tracking-widest"
								: "text-on-surface-variant opacity-60 font-label text-sm font-bold uppercase tracking-widest"
						}
					>
						Earnings
					</span>
					{tab === "earnings" && (
						<span className="absolute bottom-0 left-0 right-0 h-[3px] bg-secondary-container rounded-full" />
					)}
				</button>
			</div>

			{/* Notification Cards */}
			{filtered.length === 0 ? (
				<EmptyState
					icon="notifications_none"
					title="No notifications yet"
					subtitle="You'll see updates about your Equbs, gym passes, and challenges here"
				/>
			) : (
				<div className="space-y-3">
					{filtered.map((n) => (
						<div
							key={n.id}
							className={`relative overflow-hidden bg-surface-container-low p-5 rounded-lg border-l-4 shadow-lg ${borderColorClass[n.type] ?? "border-outline"}`}
						>
							<div className="flex items-start gap-3">
								{/* Icon */}
								<div
									className={`p-2 rounded-full shrink-0 ${iconBgClass[n.type] ?? "bg-outline/15"}`}
								>
									<span
										className={`material-symbols-outlined text-xl ${iconTextClass[n.type] ?? "text-outline"} ${iconFilled[n.type] ? "font-filled" : ""}`}
										style={iconFilled[n.type] ? { fontVariationSettings: "'FILL' 1" } : undefined}
									>
										{iconName[n.type] ?? "info"}
									</span>
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-2">
										<p className="font-headline font-bold text-base text-on-surface leading-snug">
											{n.title}
										</p>
										{n.type === "urgency" && (
											<div className="w-2.5 h-2.5 rounded-full bg-error shrink-0 mt-1 animate-pulse" />
										)}
									</div>
									<p className="font-label text-[10px] text-on-surface-variant opacity-60 mt-1">
										{n.time}
									</p>
								</div>
							</div>

							{/* Body text */}
							<p className="font-body text-sm text-on-surface-variant leading-relaxed pl-12 mt-1">
								{n.body}
							</p>

							{/* Background decorative icon */}
							<span
								className={`material-symbols-outlined absolute -right-4 -bottom-4 opacity-5 rotate-12 text-8xl ${iconTextClass[n.type] ?? "text-outline"} pointer-events-none select-none`}
								style={iconFilled[n.type] ? { fontVariationSettings: "'FILL' 1" } : undefined}
							>
								{bgIconName[n.type] ?? "info"}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
