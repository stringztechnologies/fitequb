import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

interface DailySummary {
	total_points: number;
	methods_used: string[];
	is_day_complete: boolean;
	threshold: number;
}

export function VerifyWorkout() {
	const navigate = useNavigate();
	const [summary, setSummary] = useState<DailySummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeMethod, setActiveMethod] = useState<string | null>(null);
	const [result, setResult] = useState<string | null>(null);

	// Step input
	const [steps, setSteps] = useState("");
	// Photo
	const fileRef = useRef<HTMLInputElement>(null);
	// GPS loading
	const [gpsLoading, setGpsLoading] = useState(false);

	const fetchSummary = () => {
		api<DailySummary>("/api/verify/daily-summary")
			.then((res) => setSummary(res.data ?? { total_points: 0, methods_used: [], is_day_complete: false, threshold: 50 }))
			.catch(() => setSummary({ total_points: 0, methods_used: [], is_day_complete: false, threshold: 50 }))
			.finally(() => setLoading(false));
	};

	useEffect(() => { fetchSummary(); }, []);

	const showResult = (msg: string) => {
		setResult(msg);
		setTimeout(() => setResult(null), 4000);
	};

	// --- Handlers ---

	const submitSteps = async () => {
		const n = Number.parseInt(steps, 10);
		if (Number.isNaN(n) || n < 0) return;
		setActiveMethod("steps");
		const res = await api<{ points: number; total_today: number; day_complete: boolean }>("/api/verify/steps", {
			method: "POST", body: JSON.stringify({ steps: n }),
		});
		setActiveMethod(null);
		if (res.data) {
			showResult(`+${res.data.points} pts — ${n} steps logged!`);
			setSteps("");
			fetchSummary();
		} else {
			showResult(res.error ?? "Failed");
		}
	};

	const submitPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setActiveMethod("photo");

		const reader = new FileReader();
		reader.onload = async () => {
			const base64 = (reader.result as string).split(",")[1];
			const res = await api<{ points: number; confidence: number; reasoning: string; verified: boolean }>("/api/verify/photo", {
				method: "POST", body: JSON.stringify({ image_base64: base64 }),
			});
			setActiveMethod(null);
			if (res.data) {
				if (res.data.verified) {
					showResult(`+${res.data.points} pts — ${res.data.confidence}% confidence verified!`);
				} else {
					showResult(`Not verified (${res.data.confidence}% confidence). ${res.data.reasoning}`);
				}
				fetchSummary();
			} else {
				showResult(res.error ?? "Failed");
			}
		};
		reader.readAsDataURL(file);
	};

	const submitGps = async () => {
		if (!navigator.geolocation) { showResult("GPS not available"); return; }
		setGpsLoading(true);
		setActiveMethod("gps");

		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				const res = await api<{ points: number; gym_name: string; distance_m: number }>("/api/verify/gps", {
					method: "POST", body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
				});
				setActiveMethod(null);
				setGpsLoading(false);
				if (res.data) {
					showResult(`+${res.data.points} pts — You're at ${res.data.gym_name}!`);
					fetchSummary();
				} else {
					showResult(res.error ?? "Not near a gym");
				}
			},
			(err) => {
				setActiveMethod(null);
				setGpsLoading(false);
				showResult(`Location error: ${err.message}`);
			},
			{ enableHighAccuracy: true, timeout: 10000 },
		);
	};

	if (loading) return <Loading />;

	const pts = summary?.total_points ?? 0;
	const threshold = summary?.threshold ?? 50;
	const pct = Math.min(100, (pts / threshold) * 100);
	const methods = summary?.methods_used ?? [];
	const isComplete = summary?.is_day_complete ?? false;

	const cards = [
		{ key: "steps", icon: "steps", label: "Log Steps", pts: 20, done: methods.includes("steps") },
		{ key: "qr_scan", icon: "qr_code_scanner", label: "Scan Gym QR", pts: 40, done: methods.includes("qr_scan") },
		{ key: "photo", icon: "photo_camera", label: "Photo Proof", pts: 35, done: methods.includes("photo") },
		{ key: "buddy", icon: "group", label: "Buddy Confirm", pts: 25, done: methods.includes("buddy") },
		{ key: "gps", icon: "location_on", label: "GPS Check-in", pts: 30, done: methods.includes("gps") },
	];

	return (
		<div className="bg-background text-on-surface font-body min-h-screen pb-32">
			{/* Header */}
			<header className="fixed top-0 w-full max-w-[430px] z-50 bg-[#131313]/70 backdrop-blur-xl flex items-center gap-3 px-5 h-16">
				<button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-all" aria-label="Go back">
					<span className="material-symbols-outlined text-on-surface-variant text-xl">arrow_back</span>
				</button>
				<h1 className="font-headline font-bold text-lg text-on-surface">Verify Today's Workout</h1>
			</header>
			<div className="h-16" />

			<div className="px-5 pt-4 space-y-5">
				{/* Progress */}
				<div className={`glass-card rounded-2xl p-5 ${isComplete ? "neon-glow" : ""}`}>
					<div className="flex items-center justify-between mb-3">
						<span className="font-headline text-2xl font-bold text-primary">{pts}/{threshold}</span>
						{isComplete && (
							<span className="bg-primary/20 text-primary font-label text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
								Day Complete! 🎉
							</span>
						)}
					</div>
					<div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
						<div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
					</div>
					<p className="font-label text-2xs text-on-surface-variant mt-2 uppercase tracking-widest">
						Points from any combination of methods
					</p>
				</div>

				{/* Result toast */}
				{result && (
					<div className="glass-card rounded-xl p-4 border border-primary/30 neon-glow animate-pulse">
						<p className="text-sm text-primary font-bold text-center">{result}</p>
					</div>
				)}

				{/* Verification Cards */}
				{cards.map((card) => (
					<div key={card.key} className={`glass-card rounded-2xl p-5 ${card.done ? "opacity-60" : ""}`}>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-3">
								<div className={`w-10 h-10 rounded-full flex items-center justify-center ${card.done ? "bg-on-surface-variant/10" : "bg-primary/15"}`}>
									<span className={`material-symbols-outlined text-xl ${card.done ? "text-on-surface-variant" : "text-primary"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
										{card.done ? "check_circle" : card.icon}
									</span>
								</div>
								<div>
									<p className="font-headline text-sm font-bold text-on-surface">{card.label}</p>
									<p className={`font-label text-2xs uppercase tracking-widest ${card.done ? "text-on-surface-variant" : "text-primary"}`}>
										{card.done ? "Done ✓" : `+${card.pts} pts`}
									</p>
								</div>
							</div>
						</div>

						{/* Action area */}
						{!card.done && card.key === "steps" && (
							<div className="flex gap-2 mt-2">
								<input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Enter step count" min="0" max="100000"
									className="flex-1 bg-surface-container border border-outline-variant/20 rounded-full px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none" />
								<button type="button" onClick={submitSteps} disabled={!steps || activeMethod === "steps"}
									className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-headline text-sm font-bold active:scale-95 transition-transform disabled:opacity-30">
									{activeMethod === "steps" ? "..." : "Submit"}
								</button>
							</div>
						)}

						{!card.done && card.key === "qr_scan" && (
							<button type="button" onClick={() => navigate("/qr/scan")}
								className="mt-2 w-full py-3 rounded-full bg-primary/15 text-primary font-headline text-sm font-bold active:scale-95 transition-transform">
								Open Scanner
							</button>
						)}

						{!card.done && card.key === "photo" && (
							<>
								<input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={submitPhoto} />
								<button type="button" onClick={() => fileRef.current?.click()} disabled={activeMethod === "photo"}
									className="mt-2 w-full py-3 rounded-full bg-primary/15 text-primary font-headline text-sm font-bold active:scale-95 transition-transform disabled:opacity-30">
									{activeMethod === "photo" ? "Analyzing..." : "Take Photo"}
								</button>
							</>
						)}

						{!card.done && card.key === "buddy" && (
							<button type="button" onClick={() => navigate("/equbs")}
								className="mt-2 w-full py-3 rounded-full bg-primary/15 text-primary font-headline text-sm font-bold active:scale-95 transition-transform">
								Find a Buddy
							</button>
						)}

						{!card.done && card.key === "gps" && (
							<button type="button" onClick={submitGps} disabled={gpsLoading || activeMethod === "gps"}
								className="mt-2 w-full py-3 rounded-full bg-primary/15 text-primary font-headline text-sm font-bold active:scale-95 transition-transform disabled:opacity-30">
								{gpsLoading ? "Checking location..." : "Check Location"}
							</button>
						)}
					</div>
				))}

				{/* Footer info */}
				<p className="text-center font-label text-2xs text-on-surface-variant uppercase tracking-widest pb-4">
					Your daily target: {threshold} points from any combination
				</p>
			</div>
		</div>
	);
}
