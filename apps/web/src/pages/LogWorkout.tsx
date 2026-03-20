import type { Workout, WorkoutType } from "@fitequb/shared";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";

const workoutTypes: { value: WorkoutType; label: string; description: string }[] = [
	{ value: "qr_checkin", label: "Gym QR Check-in", description: "Scan QR code at partner gym" },
	{ value: "step_count", label: "Step Count", description: "Enter today's step count" },
	{ value: "photo_proof", label: "Photo Proof", description: "Upload a workout selfie" },
];

export function LogWorkout() {
	const { id: roomId } = useParams<{ id: string }>();
	const [type, setType] = useState<WorkoutType | null>(null);
	const [stepCount, setStepCount] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<"success" | "error" | null>(null);
	const [errorMsg, setErrorMsg] = useState("");

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
			<div className="p-4 text-center mt-12">
				<p className="text-4xl mb-4">🎉</p>
				<h2 className="text-xl font-bold text-tg-text">Workout Logged!</h2>
				<p className="text-sm text-tg-hint mt-2">Keep it up. See you tomorrow.</p>
				<a
					href={`/equbs/${roomId}`}
					className="inline-block mt-6 bg-tg-button text-tg-button-text px-6 py-2.5 rounded-xl text-sm font-medium"
				>
					Back to Room
				</a>
			</div>
		);
	}

	return (
		<div className="p-4 pb-20">
			<h1 className="text-xl font-bold text-tg-text mb-4">Log Workout</h1>

			<div className="space-y-3">
				{workoutTypes.map((wt) => (
					<button
						key={wt.value}
						type="button"
						onClick={() => setType(wt.value)}
						className={`w-full text-left rounded-xl p-4 transition-colors ${
							type === wt.value
								? "bg-tg-button/10 border-2 border-tg-button"
								: "bg-tg-secondary-bg border-2 border-transparent"
						}`}
					>
						<p className="font-semibold text-tg-text text-sm">{wt.label}</p>
						<p className="text-xs text-tg-hint mt-0.5">{wt.description}</p>
					</button>
				))}
			</div>

			{type === "step_count" && (
				<div className="mt-4">
					<label htmlFor="steps" className="block text-sm text-tg-text mb-1">
						Step Count
					</label>
					<input
						id="steps"
						type="number"
						value={stepCount}
						onChange={(e) => setStepCount(e.target.value)}
						placeholder="e.g. 8000"
						className="w-full bg-tg-secondary-bg text-tg-text rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tg-button"
					/>
				</div>
			)}

			{result === "error" && <p className="text-red-500 text-sm mt-3">{errorMsg}</p>}

			<button
				type="button"
				onClick={handleSubmit}
				disabled={!type || submitting}
				className="w-full mt-6 bg-tg-button text-tg-button-text py-3 rounded-xl font-semibold disabled:opacity-50"
			>
				{submitting ? "Logging..." : "Log Workout"}
			</button>
		</div>
	);
}
