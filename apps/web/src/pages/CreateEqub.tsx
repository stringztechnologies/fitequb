import {
	EQUB_DEFAULT_COMPLETION_PCT,
	EQUB_DEFAULT_DURATION_DAYS,
	EQUB_MAX_MEMBERS,
	EQUB_MAX_STAKE,
	EQUB_MIN_MEMBERS,
	EQUB_MIN_STAKE,
} from "@fitequb/shared";
import type { EqubRoom } from "@fitequb/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export function CreateEqub() {
	const navigate = useNavigate();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);

		const form = new FormData(e.currentTarget);
		const durationDays = Number(form.get("duration_days")) || EQUB_DEFAULT_DURATION_DAYS;
		const startDate = new Date();
		startDate.setDate(startDate.getDate() + 1); // Start tomorrow

		const res = await api<EqubRoom>("/api/equb-rooms", {
			method: "POST",
			body: JSON.stringify({
				name: form.get("name"),
				stake_amount: Number(form.get("stake_amount")),
				duration_days: durationDays,
				workout_target: Number(form.get("workout_target")) || durationDays,
				completion_pct: EQUB_DEFAULT_COMPLETION_PCT,
				min_members: EQUB_MIN_MEMBERS,
				max_members: Number(form.get("max_members")) || EQUB_MAX_MEMBERS,
				start_date: startDate.toISOString(),
				sponsor_prize: 0,
			}),
		});

		setSubmitting(false);

		if (res.error) {
			setError(res.error);
			return;
		}

		if (res.data) {
			navigate(`/equbs/${res.data.id}`);
		}
	}

	return (
		<div className="p-4 pb-20">
			<h1 className="text-xl font-bold text-tg-text mb-4">Create Equb Room</h1>

			<form onSubmit={handleSubmit} className="space-y-4">
				<Field
					label="Room Name"
					name="name"
					type="text"
					placeholder="e.g. Bole Fitness Squad"
					required
				/>
				<Field
					label={`Stake Amount (${EQUB_MIN_STAKE}–${EQUB_MAX_STAKE} ETB)`}
					name="stake_amount"
					type="number"
					placeholder="500"
					required
				/>
				<Field
					label="Duration (days)"
					name="duration_days"
					type="number"
					placeholder="30"
					defaultValue="30"
				/>
				<Field label="Workout Target (days)" name="workout_target" type="number" placeholder="30" />
				<Field
					label={`Max Members (${EQUB_MIN_MEMBERS}–${EQUB_MAX_MEMBERS})`}
					name="max_members"
					type="number"
					placeholder="10"
					defaultValue="10"
				/>

				{error && <p className="text-red-500 text-sm">{error}</p>}

				<button
					type="submit"
					disabled={submitting}
					className="w-full bg-tg-button text-tg-button-text py-3 rounded-xl font-semibold disabled:opacity-50"
				>
					{submitting ? "Creating..." : "Create Room"}
				</button>
			</form>
		</div>
	);
}

function Field({
	label,
	name,
	type,
	placeholder,
	defaultValue,
	required,
}: {
	label: string;
	name: string;
	type: string;
	placeholder?: string;
	defaultValue?: string;
	required?: boolean;
}) {
	return (
		<div>
			<label htmlFor={name} className="block text-sm text-tg-text mb-1">
				{label}
			</label>
			<input
				id={name}
				name={name}
				type={type}
				placeholder={placeholder}
				defaultValue={defaultValue}
				required={required}
				className="w-full bg-tg-secondary-bg text-tg-text rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tg-button"
			/>
		</div>
	);
}
