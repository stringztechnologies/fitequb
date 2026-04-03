import type { EqubRoom } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.js";
import { Loading } from "../components/Loading.js";
import { TelegramModal, useTelegramModal } from "../components/TelegramModal.js";
import { useAuth } from "../hooks/useAuth.js";
import { api, publicApi } from "../lib/api.js";

interface RoomDetail {
	room: EqubRoom;
	members: Array<{
		id: string;
		user_id: string;
		completed_days: number;
		qualified: boolean | null;
		users: { full_name: string; username: string | null };
	}>;
}

export function EqubDetail() {
	const { id } = useParams<{ id: string }>();
	const [detail, setDetail] = useState<RoomDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [joining, setJoining] = useState(false);
	const [notFound, setNotFound] = useState(false);
	const navigate = useNavigate();
	const { isGuest } = useAuth();
	const { showModal, modalProps } = useTelegramModal();

	useEffect(() => {
		if (!id) return;
		const fetch = isGuest ? publicApi : api;
		const path = isGuest ? `/public/equb-rooms/${id}` : `/api/equb-rooms/${id}`;
		fetch<RoomDetail>(path)
			.then((res) => {
				if (res.data) {
					setDetail(res.data);
				} else {
					setNotFound(true);
				}
			})
			.catch(() => {
				setNotFound(true);
			})
			.finally(() => setLoading(false));
	}, [id, isGuest]);

	if (loading) return <Loading />;

	if (notFound || !detail) {
		return (
			<div className="min-h-screen bg-surface">
				<header className="fixed top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-xl flex items-center justify-between px-5 h-16">
					<button
						type="button"
						onClick={() => navigate(-1)}
						className="text-on-surface active:scale-95 transition-transform"
						aria-label="Go back"
					>
						<span className="material-symbols-rounded text-2xl">arrow_back</span>
					</button>
					<h1 className="font-headline font-bold text-xl tracking-tight text-primary-container">
						Equb Room
					</h1>
					<div className="w-6" />
				</header>
				<div className="h-16" />
				<EmptyState
					icon="error"
					title="Room not found"
					subtitle="This room may have been removed"
					ctaLabel="Browse Rooms"
					onCta={() => navigate("/equbs")}
				/>
			</div>
		);
	}

	const { room, members } = detail;
	const daysLeft = room.status === "active" ? calculateDaysRemaining(room.end_date) : null;
	const daysElapsed = daysLeft !== null ? room.duration_days - daysLeft : 0;
	const target = room.is_tsom
		? (room.tsom_workout_target ?? room.workout_target)
		: room.workout_target;
	const rawPct = room.is_tsom
		? (room.tsom_completion_pct ?? room.completion_pct)
		: room.completion_pct;
	// Normalize: DB may store as 0.8 or 80 — ensure 0-1 range
	const pct = rawPct > 1 ? rawPct / 100 : rawPct;
	const payout = room.stake_amount * room.max_members;
	const progressPct = Math.min(100, (daysElapsed / room.duration_days) * 100);

	async function handleJoin() {
		if (!id) return;
		setJoining(true);
		const res = await api<{ checkout_url: string | null }>(`/api/equb-rooms/${id}/join`, {
			method: "POST",
		});
		setJoining(false);
		if (res.data?.checkout_url) {
			window.open(res.data.checkout_url, "_blank");
		} else if (res.data) {
			window.location.reload();
		}
	}

	return (
		<div className="min-h-screen bg-surface pb-24">
			{/* Fixed Header */}
			<header className="fixed top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-xl flex items-center justify-between px-5 h-16">
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="text-on-surface active:scale-95 transition-transform"
					aria-label="Go back"
				>
					<span className="material-symbols-rounded text-2xl">arrow_back</span>
				</button>
				<h1 className="font-headline font-bold text-xl tracking-tight text-primary-container">
					Equb Room
				</h1>
				<button
					type="button"
					className="text-on-surface-variant active:scale-95 transition-transform"
					aria-label="Room info"
				>
					<span className="material-symbols-rounded text-2xl">info</span>
				</button>
			</header>

			{/* Spacer for fixed header */}
			<div className="h-16" />

			{/* Hero Section */}
			<section className="bg-surface-container-low p-6 mx-4 mt-4 rounded-lg text-center">
				{/* Status Badge */}
				<div className="flex items-center justify-center gap-2 mb-4">
					<span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
						<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
						<span className="font-label text-2xs tracking-widest uppercase text-primary font-bold">
							{room.status === "active"
								? "Active"
								: room.status === "pending"
									? "Pending"
									: room.status}
						</span>
					</span>
				</div>

				{/* Room Name */}
				<h2 className="font-headline text-3xl font-black text-on-surface mb-2">{room.name}</h2>

				{/* Prize Pool */}
				<p className="font-headline text-5xl font-extrabold text-secondary-container drop-shadow-[0_0_15px_rgba(255,219,60,0.3)] mb-1">
					{payout.toLocaleString()}
				</p>
				<p className="font-label text-xs text-on-surface-variant tracking-wider uppercase">
					ETB Prize Pool
				</p>

				{/* Progress Bar */}
				{room.status === "active" && (
					<div className="mt-6">
						<div className="flex justify-between mb-2">
							<span className="font-label text-2xs text-on-surface-variant">
								Day {daysElapsed} of {room.duration_days}
							</span>
							<span className="font-label text-2xs text-primary">{daysLeft} days left</span>
						</div>
						<div className="h-[2px] w-full bg-outline-variant/20 rounded-full overflow-hidden">
							<div
								className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500"
								style={{ width: `${progressPct}%` }}
							/>
						</div>
					</div>
				)}
			</section>

			{/* Rules Grid */}
			<section className="px-4 mt-6">
				<h3 className="font-headline text-lg font-bold text-on-surface mb-3">Rules</h3>
				<div className="grid grid-cols-2 gap-4">
					<div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
						<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
							<span className="material-symbols-rounded text-primary text-2xl">footprint</span>
						</div>
						<p className="font-headline text-sm font-bold text-on-surface mb-1">
							{room.workout_target} Workouts
						</p>
						<p className="text-xs text-on-surface-variant">
							Complete {Math.ceil(target * pct)} of {target} in {room.duration_days} days (
							{Math.round(pct * 100)}%)
						</p>
					</div>
					<div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
						<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
							<span className="material-symbols-rounded text-primary text-2xl">fitness_center</span>
						</div>
						<p className="font-headline text-sm font-bold text-on-surface mb-1">Gym Check-ins</p>
						<p className="text-xs text-on-surface-variant">
							Check-ins at partner gyms count toward your target
						</p>
					</div>
				</div>
			</section>

			{/* My Progress Card */}
			<section className="px-4 mt-6">
				<div className="bg-surface-container rounded-lg p-6 border border-primary/10">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-headline text-lg font-bold text-on-surface">My Progress</h3>
						<span className="font-label text-xs text-secondary-container font-bold">
							{members.length} participants
						</span>
					</div>

					{/* CTA Button */}
					{(room.status === "pending" || room.status === "active") && (
						<button
							type="button"
							onClick={isGuest ? () => showModal("join this Equb") : handleJoin}
							disabled={joining}
							className="mt-6 w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-4 rounded-full font-headline font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-50 shadow-glow-strong"
						>
							{isGuest
								? "Join This Equb"
								: joining
									? "Processing..."
									: room.stake_amount > 0
										? `Join This Equb \u2014 ${room.stake_amount} ETB`
										: "Join This Equb \u2014 Free"}
						</button>
					)}
					{room.status === "pending" && members.length < room.max_members && (
						<p className="text-center font-label text-2xs text-on-surface-variant mt-2">
							{room.max_members - members.length} spots remaining
						</p>
					)}
				</div>
			</section>

			{/* Participants */}
			<section className="px-4 mt-6">
				<h3 className="font-headline text-lg font-bold text-on-surface mb-3">
					Participants ({members.length})
				</h3>
				<div className="flex flex-col gap-3">
					{members.map((m, idx) => {
						const memberPct = target > 0 ? m.completed_days / target : 0;
						const onTrack = memberPct >= (daysElapsed / room.duration_days) * 0.8;
						const isCurrentUser = idx === 0;
						return (
							<div
								key={m.id}
								className={`bg-surface-container-low p-4 rounded-lg flex items-center justify-between ${
									isCurrentUser ? "border border-primary/30" : ""
								}`}
							>
								<div className="flex items-center gap-3">
									{/* Avatar */}
									<div
										className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-surface-container-highest ${
											onTrack ? "border-primary/20" : "border-secondary-container/20"
										}`}
									>
										<span className="font-headline text-lg font-bold text-on-surface">
											{m.users.full_name.charAt(0)}
										</span>
									</div>
									{/* Name and meta */}
									<div>
										<p className="font-headline text-sm font-bold text-on-surface">
											{m.users.full_name}
											{isCurrentUser && <span className="text-primary ml-1 text-xs">(You)</span>}
										</p>
										<p className="font-label text-2xs text-on-surface-variant mt-0.5">
											{m.completed_days}/{target} workouts
											{daysLeft !== null && ` \u00b7 ${daysLeft}d left`}
										</p>
									</div>
								</div>
								{/* Status badge */}
								<span
									className={`px-3 py-1.5 rounded-md border font-label text-2xs font-bold uppercase ${
										onTrack
											? "bg-primary/10 border-primary/20 text-primary"
											: "bg-secondary-container/10 border-secondary-container/20 text-secondary-container"
									}`}
								>
									{onTrack ? (
										<span className="flex items-center gap-1">
											<span className="material-symbols-rounded text-sm">check</span>
											On Track
										</span>
									) : (
										"Warning"
									)}
								</span>
							</div>
						);
					})}
				</div>
			</section>

			{/* Invite Friends */}
			<section className="px-4 mt-6">
				<button
					type="button"
					onClick={() => {
						const deepLink = `https://t.me/fitequb_bot?start=EQUB-${id}`;
						const text = `Join my FitEqub! Stake ${room.stake_amount} ETB, work out for ${room.duration_days} days, and win ${payout.toLocaleString()} ETB. Join here: ${deepLink}`;
						if (navigator.share) {
							navigator.share({ title: `FitEqub \u2014 ${room.name}`, text }).catch(() => {});
						} else if (window.Telegram?.WebApp?.openTelegramLink) {
							window.Telegram.WebApp.openTelegramLink(
								`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`,
							);
						} else {
							window.open(
								`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`,
								"_blank",
							);
						}
					}}
					className="w-full py-4 rounded-full border-2 border-secondary-container text-secondary-container font-headline font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
				>
					<span className="material-symbols-rounded text-xl">share</span>
					Invite Friends
				</button>
			</section>

			<TelegramModal {...modalProps} />
		</div>
	);
}

function calculateDaysRemaining(endDate: string): number {
	const diff = new Date(endDate).getTime() - Date.now();
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
