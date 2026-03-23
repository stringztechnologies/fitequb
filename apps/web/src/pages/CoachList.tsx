import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.js";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

interface CoachSession {
	id: string;
	title: string;
	description: string | null;
	session_type: "in_person" | "virtual";
	duration_minutes: number;
	price: number;
	trainer_name: string;
	trainer_username: string | null;
	gym_name: string | null;
	trainer_id: string;
}

export function CoachList() {
	const navigate = useNavigate();
	const [sessions, setSessions] = useState<CoachSession[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<"all" | "in_person" | "virtual">("all");
	const [purchasing, setPurchasing] = useState<string | null>(null);

	useEffect(() => {
		api<CoachSession[]>("/api/coach-passes/browse")
			.then((res) => setSessions(res.data ?? []))
			.catch(() => setSessions([]))
			.finally(() => setLoading(false));
	}, []);

	const filtered = filter === "all" ? sessions : sessions.filter((s) => s.session_type === filter);

	const purchase = async (session: CoachSession) => {
		setPurchasing(session.id);
		const res = await api<{ pass: unknown; checkout_url: string }>("/api/coach-passes/purchase", {
			method: "POST",
			body: JSON.stringify({ session_id: session.id }),
		});
		setPurchasing(null);

		if (res.data?.checkout_url) {
			window.location.href = res.data.checkout_url;
		}
	};

	if (loading) return <Loading />;

	return (
		<div className="bg-background text-on-surface font-body min-h-screen pb-32">
			{/* Header */}
			<header className="fixed top-0 w-full max-w-[430px] z-50 bg-[#131313]/70 backdrop-blur-xl flex items-center gap-3 px-5 h-16">
				<button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-all" aria-label="Go back">
					<span className="material-symbols-outlined text-on-surface-variant text-xl">arrow_back</span>
				</button>
				<div>
					<h1 className="font-headline font-bold text-lg text-on-surface">Coach Day Pass</h1>
					<p className="font-label text-2xs text-on-surface-variant">Book a session with a trainer</p>
				</div>
			</header>
			<div className="h-16" />

			<div className="px-5 pt-4 space-y-5">
				{/* Filter tabs */}
				<div className="flex gap-2">
					{(["all", "in_person", "virtual"] as const).map((f) => (
						<button
							key={f}
							type="button"
							onClick={() => setFilter(f)}
							className={`px-4 py-2 rounded-full font-label text-xs font-bold uppercase tracking-wider transition-all ${
								filter === f
									? "bg-primary text-on-primary"
									: "bg-surface-container text-on-surface-variant"
							}`}
						>
							{f === "all" ? "All" : f === "in_person" ? "In-Person" : "Virtual"}
						</button>
					))}
				</div>

				{/* Sessions */}
				{filtered.length === 0 ? (
					<EmptyState
						icon="sports_martial_arts"
						title="No coaches available yet"
						subtitle="Trainers can register and list their sessions in the app"
					/>
				) : (
					<div className="space-y-4">
						{filtered.map((session) => (
							<div key={session.id} className="glass-card rounded-2xl p-5 space-y-3">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
											<span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
												{session.session_type === "virtual" ? "videocam" : "sports_martial_arts"}
											</span>
										</div>
										<div>
											<p className="font-headline text-base font-bold text-on-surface">{session.title}</p>
											<p className="font-label text-xs text-on-surface-variant">
												{session.trainer_name}
												{session.gym_name ? ` · ${session.gym_name}` : ""}
											</p>
										</div>
									</div>
									<span className={`px-2.5 py-1 rounded-full font-label text-2xs font-bold uppercase tracking-wider ${
										session.session_type === "virtual"
											? "bg-secondary-container/15 text-secondary-container"
											: "bg-primary/15 text-primary"
									}`}>
										{session.session_type === "virtual" ? "Virtual" : "In-Person"}
									</span>
								</div>

								{session.description && (
									<p className="text-sm text-on-surface-variant leading-relaxed">{session.description}</p>
								)}

								<div className="flex items-center gap-4 text-on-surface-variant">
									<div className="flex items-center gap-1">
										<span className="material-symbols-outlined text-sm">schedule</span>
										<span className="font-label text-xs">{session.duration_minutes} min</span>
									</div>
								</div>

								<div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
									<div>
										<span className="font-headline text-xl font-bold text-primary">{session.price.toLocaleString()}</span>
										<span className="font-label text-xs text-on-surface-variant ml-1">ETB</span>
									</div>
									<button
										type="button"
										onClick={() => purchase(session)}
										disabled={purchasing === session.id}
										className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-headline text-sm font-bold active:scale-95 transition-transform disabled:opacity-40"
									>
										{purchasing === session.id ? "..." : "Book Session"}
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
