import type { Workout, WorkoutType } from "@fitequb/shared";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.js";

const workoutTypes: { value: WorkoutType; label: string; description: string; icon: string }[] = [
	{
		value: "qr_checkin",
		label: "Gym QR Check-in",
		description: "Scan QR code at partner gym",
		icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
	},
	{
		value: "step_count",
		label: "Step Count",
		description: "Enter today's step count",
		icon: "M22 12 18 12 15 21 9 3 6 12 2 12",
	},
	{
		value: "photo_proof",
		label: "Photo Proof",
		description: "Upload a workout selfie",
		icon: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
	},
];

export function LogWorkout() {
	const { id: roomId } = useParams<{ id: string }>();
	const [type, setType] = useState<WorkoutType | null>(null);
	const [stepCount, setStepCount] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<"success" | "error" | null>(null);
	const [errorMsg, setErrorMsg] = useState("");
	const navigate = useNavigate();

	async function handleSubmit() {
		if (!roomId || !type) return;
		setSubmitting(true);
		setResult(null);

		const res = await api<Workout>("/api/workouts", {
			method: "POST",
			body: JSON.stringify({
				room_id: roomId,
				type,
				step_count: type === "step_count" ? Number(stepCount) : undefined,
			}),
		});

		setSubmitting(false);
		if (res.error) {
			setResult("error");
			setErrorMsg(res.error);
		} else {
			setResult("success");
		}
	}

	if (result === "success") {
		return (
			<div className="px-5 pt-20 text-center">
				<div className="w-20 h-20 mx-auto rounded-full bg-[rgba(0,200,83,0.15)] flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(0,200,83,0.2)]">
					<svg
						viewBox="0 0 24 24"
						className="w-10 h-10 text-[#00C853]"
						fill="none"
						stroke="currentColor"
						strokeWidth={2.5}
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</div>
				<h2 className="text-2xl font-bold text-white">Workout Logged!</h2>
				<p className="text-sm text-[#8E8E93] mt-2">+10 XP earned. Keep the streak alive.</p>
				<button
					type="button"
					onClick={() => navigate(`/equbs/${roomId}`)}
					className="mt-8 bg-[#00C853] text-black px-8 py-3 rounded-[16px] text-sm font-bold shadow-[0_0_20px_rgba(0,200,83,0.2)] active:scale-95 transition-transform"
				>
					Back to Room
				</button>
			</div>
		);
	}

	return (
		<div className="px-5 pt-6 pb-24">
			<h1 className="text-xl font-bold text-white mb-1">Log Workout</h1>
			<p className="text-xs text-[#8E8E93] mb-5">Choose your proof method</p>

			<div className="space-y-3">
				{workoutTypes.map((wt) => (
					<button
						key={wt.value}
						type="button"
						onClick={() => setType(wt.value)}
						className={`w-full flex items-center gap-4 text-left rounded-[16px] p-4 transition-all ${
							type === wt.value
								? "bg-[rgba(0,200,83,0.1)] border-2 border-[rgba(0,200,83,0.3)] shadow-[0_0_20px_rgba(0,200,83,0.2)]"
								: "bg-[#1c1c1e] border-2 border-[#2c2c2e]"
						}`}
					>
						<div
							className={`w-10 h-10 rounded-xl flex items-center justify-center ${
								type === wt.value ? "bg-brand-green/20" : "bg-[#0a0a0a]"
							}`}
						>
							<svg
								viewBox="0 0 24 24"
								className={`w-5 h-5 ${type === wt.value ? "text-[#00C853]" : "text-[#8E8E93]"}`}
								fill="none"
								stroke="currentColor"
								strokeWidth={1.8}
							>
								<path d={wt.icon} />
							</svg>
						</div>
						<div>
							<p
								className={`font-semibold text-sm ${type === wt.value ? "text-[#00C853]" : "text-white"}`}
							>
								{wt.label}
							</p>
							<p className="text-xs text-[#8E8E93] mt-0.5">{wt.description}</p>
						</div>
					</button>
				))}
			</div>

			{type === "step_count" && (
				<div className="mt-5">
					<label
						htmlFor="steps"
						className="block text-xs text-[#8E8E93] uppercase tracking-wider font-medium mb-2"
					>
						Step Count
					</label>
					<input
						id="steps"
						type="number"
						value={stepCount}
						onChange={(e) => setStepCount(e.target.value)}
						placeholder="e.g. 8000"
						className="w-full bg-[#1c1c1e] border border-[#2c2c2e] text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[rgba(0,200,83,0.3)] focus:shadow-[0_0_20px_rgba(0,200,83,0.2)] transition-all placeholder:text-[#8E8E93]/50"
					/>
				</div>
			)}

			{result === "error" && (
				<div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
					<p className="text-red-400 text-sm">{errorMsg}</p>
				</div>
			)}

			<button
				type="button"
				onClick={handleSubmit}
				disabled={!type || submitting}
				className="w-full mt-6 py-3.5 rounded-[16px] font-bold text-sm disabled:opacity-30 bg-[#00C853] text-black shadow-[0_0_20px_rgba(0,200,83,0.2)] active:scale-[0.98] transition-transform"
			>
				{submitting ? "Logging..." : "Log Workout"}
			</button>
		</div>
	);
}
