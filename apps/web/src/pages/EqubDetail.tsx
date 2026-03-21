import type { EqubRoom } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

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

const DEMO_DETAILS: Record<string, RoomDetail> = {
	"demo-1": {
		room: {
			id: "demo-1",
			name: "10k Steps Challenge",
			creator_id: "demo-creator",
			stake_amount: 500,
			duration_days: 30,
			workout_target: 25,
			completion_pct: 0.8,
			min_members: 5,
			max_members: 20,
			status: "active",
			start_date: new Date(Date.now() - 10 * 86400000).toISOString(),
			end_date: new Date(Date.now() + 20 * 86400000).toISOString(),
			sponsor_prize: 0,
			is_tsom: false,
			tsom_workout_target: null,
			tsom_completion_pct: null,
			created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
		},
		members: [
			{
				id: "m1",
				user_id: "u1",
				completed_days: 9,
				qualified: null,
				users: { full_name: "Abebe Kebede", username: "abebe_k" },
			},
			{
				id: "m2",
				user_id: "u2",
				completed_days: 7,
				qualified: null,
				users: { full_name: "Tigist Haile", username: "tigist_h" },
			},
			{
				id: "m3",
				user_id: "u3",
				completed_days: 5,
				qualified: null,
				users: { full_name: "Dawit Mekonnen", username: "dawit_m" },
			},
			{
				id: "m4",
				user_id: "u4",
				completed_days: 3,
				qualified: null,
				users: { full_name: "Marali A.", username: null },
			},
			{
				id: "m5",
				user_id: "u5",
				completed_days: 8,
				qualified: null,
				users: { full_name: "Hana A.", username: null },
			},
			{
				id: "m6",
				user_id: "u6",
				completed_days: 6,
				qualified: null,
				users: { full_name: "Pagra C.", username: null },
			},
		],
	},
	"demo-2": {
		room: {
			id: "demo-2",
			name: "Gym Warriors",
			creator_id: "demo-creator",
			stake_amount: 1000,
			duration_days: 30,
			workout_target: 20,
			completion_pct: 0.75,
			min_members: 5,
			max_members: 20,
			status: "active",
			start_date: new Date(Date.now() - 5 * 86400000).toISOString(),
			end_date: new Date(Date.now() + 25 * 86400000).toISOString(),
			sponsor_prize: 0,
			is_tsom: false,
			tsom_workout_target: null,
			tsom_completion_pct: null,
			created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
		},
		members: [
			{
				id: "m4",
				user_id: "u4",
				completed_days: 4,
				qualified: null,
				users: { full_name: "Selam Tadesse", username: "selam_t" },
			},
			{
				id: "m5",
				user_id: "u5",
				completed_days: 3,
				qualified: null,
				users: { full_name: "Yonas Girma", username: "yonas_g" },
			},
			{
				id: "m6",
				user_id: "u6",
				completed_days: 2,
				qualified: null,
				users: { full_name: "Hanna Bekele", username: null },
			},
		],
	},
	"demo-3": {
		room: {
			id: "demo-3",
			name: "15k Steps Elite",
			creator_id: "demo-creator",
			stake_amount: 250,
			duration_days: 14,
			workout_target: 12,
			completion_pct: 0.8,
			min_members: 3,
			max_members: 15,
			status: "pending",
			start_date: new Date(Date.now() + 1 * 86400000).toISOString(),
			end_date: new Date(Date.now() + 15 * 86400000).toISOString(),
			sponsor_prize: 0,
			is_tsom: false,
			tsom_workout_target: null,
			tsom_completion_pct: null,
			created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
		},
		members: [
			{
				id: "m7",
				user_id: "u7",
				completed_days: 0,
				qualified: null,
				users: { full_name: "Meron Assefa", username: "meron_a" },
			},
			{
				id: "m8",
				user_id: "u8",
				completed_days: 0,
				qualified: null,
				users: { full_name: "Bereket Wolde", username: "bereket_w" },
			},
			{
				id: "m9",
				user_id: "u9",
				completed_days: 0,
				qualified: null,
				users: { full_name: "Lidya Tesfaye", username: null },
			},
		],
	},
};

export function EqubDetail() {
	const { id } = useParams<{ id: string }>();
	const [detail, setDetail] = useState<RoomDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [joining, setJoining] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		if (!id) return;
		api<RoomDetail>(`/api/equb-rooms/${id}`)
			.then((res) => {
				if (res.data) {
					setDetail(res.data);
				} else if (DEMO_DETAILS[id]) {
					setDetail(DEMO_DETAILS[id]);
				}
			})
			.catch(() => {
				if (DEMO_DETAILS[id]) setDetail(DEMO_DETAILS[id]);
			})
			.finally(() => setLoading(false));
	}, [id]);

	if (loading || !detail) return <Loading />;

	const { room, members } = detail;
	const daysLeft = room.status === "active" ? calculateDaysRemaining(room.end_date) : null;
	const daysElapsed = daysLeft !== null ? room.duration_days - daysLeft : 0;
	const target = room.is_tsom
		? (room.tsom_workout_target ?? room.workout_target)
		: room.workout_target;
	const pct = room.is_tsom
		? (room.tsom_completion_pct ?? room.completion_pct)
		: room.completion_pct;
	const payout = room.stake_amount * room.max_members;
	const myProgress = 34000; // Demo: user's current progress toward payout

	async function handleJoin() {
		if (!id) return;
		if (id.startsWith("demo-")) {
			navigate("/payment", {
				state: {
					equbId: undefined,
					equbName: room.name,
					stakeAmount: room.stake_amount,
					payout,
					requirement: `${target} workouts in ${room.duration_days} days`,
				},
			});
			return;
		}
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
		<div style={{ backgroundColor: "#0a0a0a", paddingBottom: "96px" }}>
			{/* Back button */}
			<button
				type="button"
				onClick={() => navigate(-1)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "4px",
					color: "#8E8E93",
					fontSize: "14px",
					background: "none",
					border: "none",
					cursor: "pointer",
					padding: "16px 16px 0",
				}}
			>
				<svg
					viewBox="0 0 24 24"
					style={{ width: "16px", height: "16px" }}
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path d="M15 18l-6-6 6-6" />
				</svg>
				Back
			</button>

			{/* Header — room name + payout */}
			<div style={{ textAlign: "center", padding: "12px 16px 0" }}>
				<h1
					style={{
						fontSize: "22px",
						fontWeight: 700,
						color: "#FFF",
						margin: 0,
					}}
				>
					{room.name}
				</h1>
				<p
					style={{
						fontSize: "36px",
						fontWeight: 700,
						color: "#FFD700",
						margin: "4px 0 0",
					}}
				>
					{payout.toLocaleString()} ETB
				</p>
			</div>

			{/* Rules Section */}
			<div style={{ padding: "20px 16px 0" }}>
				<h2
					style={{
						fontSize: "18px",
						fontWeight: 700,
						color: "#FFF",
						margin: "0 0 12px",
					}}
				>
					Rules
				</h2>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "10px",
					}}
				>
					<RuleItem
						icon="M22 12 18 12 15 21 9 3 6 12 2 12"
						title={`${room.workout_target} Workouts in ${room.duration_days} Days`}
						subtitle={`Complete at least ${Math.ceil(target * pct)} of ${target} to qualify (${Math.round(pct * 100)}% threshold)`}
					/>
					<RuleItem
						icon="M6.5 6.5h11M4 12h16M6.5 17.5h11M2 10h2v4H2zm18 0h2v4h-2z"
						title="Gym Check-ins Count"
						subtitle="Check-ins at partner gyms count toward your target"
					/>
				</div>
			</div>

			{/* Member List — grid layout like Stitch */}
			<div style={{ padding: "20px 16px 0" }}>
				<h2
					style={{
						fontSize: "18px",
						fontWeight: 700,
						color: "#FFF",
						margin: "0 0 12px",
					}}
				>
					Member List
				</h2>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: "10px",
					}}
				>
					{members.map((m, idx) => {
						const memberPct = target > 0 ? m.completed_days / target : 0;
						const onTrack = memberPct >= (daysElapsed / room.duration_days) * 0.8;
						const isCurrentUser = idx === 0; // First member = current user in demo
						return (
							<div
								key={m.id}
								style={{
									backgroundColor: isCurrentUser ? "rgba(0,200,83,0.08)" : "#1c1c1e",
									borderRadius: "12px",
									padding: "12px",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "6px",
									border: isCurrentUser ? "1px solid rgba(0,200,83,0.4)" : "none",
								}}
							>
								<span
									style={{
										fontSize: "10px",
										fontWeight: 600,
										color: onTrack ? "#00C853" : "#FF9500",
									}}
								>
									{isCurrentUser ? "YOU" : onTrack ? "On Track" : "Warning"}
								</span>
								<div
									style={{
										width: "48px",
										height: "48px",
										borderRadius: "50%",
										border: `2px solid ${onTrack ? "#00C853" : "#FF9500"}`,
										backgroundColor: "#2c2c2e",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<span style={{ fontSize: "20px", fontWeight: 700, color: "#FFF" }}>
										{m.users.full_name.charAt(0)}
									</span>
								</div>
								<p
									style={{
										fontSize: "13px",
										fontWeight: 600,
										color: "#FFF",
										margin: 0,
										textAlign: "center",
									}}
								>
									{m.users.full_name
										.split(" ")
										.map((n) => `${n.charAt(0)}.`)
										.slice(0, 2)
										.join(" ")
										.replace(/\.\s/, ". ")}
								</p>
								<p style={{ fontSize: "11px", color: "#8E8E93", margin: 0 }}>
									Next Payout in {daysLeft ?? 0} Days
								</p>
							</div>
						);
					})}
				</div>
			</div>

			{/* My Progress — bottom bar like Stitch */}
			<div
				style={{
					margin: "20px 16px 0",
					backgroundColor: "#1c1c1e",
					borderRadius: "16px",
					padding: "16px",
				}}
			>
				<h2
					style={{
						fontSize: "16px",
						fontWeight: 700,
						color: "#FFF",
						margin: "0 0 10px",
					}}
				>
					My Progress
				</h2>
				<div
					style={{
						width: "100%",
						height: "8px",
						backgroundColor: "#2c2c2e",
						borderRadius: "4px",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							width: `${Math.min(100, (myProgress / payout) * 100)}%`,
							height: "100%",
							backgroundColor: "#00C853",
							borderRadius: "4px",
						}}
					/>
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginTop: "6px",
					}}
				>
					<span style={{ fontSize: "13px", color: "#8E8E93" }}>
						{myProgress.toLocaleString()} / {payout.toLocaleString()} ETB Goal
					</span>
					<span style={{ fontSize: "13px", color: "#FFD700", fontWeight: 600 }}>
						Rank: 3rd of {members.length}
					</span>
				</div>
			</div>

			{/* Join CTA */}
			{(room.status === "pending" || room.status === "active") && (
				<div style={{ padding: "20px 16px 0" }}>
					<button
						type="button"
						onClick={handleJoin}
						disabled={joining}
						style={{
							width: "100%",
							padding: "16px",
							borderRadius: "16px",
							backgroundColor: "#00C853",
							color: "#0a0a0a",
							fontSize: "16px",
							fontWeight: 700,
							border: "none",
							cursor: "pointer",
							boxShadow: "0 0 20px rgba(0,200,83,0.4)",
							opacity: joining ? 0.5 : 1,
						}}
					>
						{joining
							? "Processing..."
							: room.stake_amount > 0
								? `Join This Equb \u2014 ${room.stake_amount} ETB`
								: "Join This Equb \u2014 Free"}
					</button>
					{room.status === "pending" && members.length < room.max_members && (
						<p
							style={{
								fontSize: "11px",
								color: "#8E8E93",
								textAlign: "center",
								marginTop: "6px",
							}}
						>
							{room.max_members - members.length} spots remaining
						</p>
					)}
				</div>
			)}

			{/* Invite Friends */}
			<div style={{ padding: "12px 16px 0" }}>
				<button
					type="button"
					onClick={() => {
						const deepLink = `https://t.me/fitequb_bot?start=EQUB-${id}`;
						const text = `Join my FitEqub! Stake ${room.stake_amount} ETB, work out for ${room.duration_days} days, and win ${payout.toLocaleString()} ETB. Join here: ${deepLink}`;
						if (navigator.share) {
							navigator.share({ title: `FitEqub — ${room.name}`, text }).catch(() => {});
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
					style={{
						width: "100%",
						padding: "14px",
						borderRadius: "16px",
						backgroundColor: "transparent",
						color: "#FFD700",
						fontSize: "15px",
						fontWeight: 700,
						border: "2px solid #FFD700",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "8px",
					}}
				>
					<svg
						viewBox="0 0 24 24"
						style={{ width: "18px", height: "18px" }}
						fill="none"
						stroke="#FFD700"
						strokeWidth={2}
					>
						<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
						<polyline points="16 6 12 2 8 6" />
						<line x1="12" y1="2" x2="12" y2="15" />
					</svg>
					Invite Friends
				</button>
			</div>
		</div>
	);
}

function RuleItem({
	icon,
	title,
	subtitle,
}: {
	icon: string;
	title: string;
	subtitle: string;
}) {
	return (
		<div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
			<div
				style={{
					width: "36px",
					height: "36px",
					minWidth: "36px",
					borderRadius: "10px",
					backgroundColor: "rgba(0,200,83,0.1)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<svg
					viewBox="0 0 24 24"
					style={{ width: "18px", height: "18px" }}
					fill="none"
					stroke="#00C853"
					strokeWidth={2}
				>
					<path d={icon} />
				</svg>
			</div>
			<div>
				<p
					style={{
						fontSize: "15px",
						fontWeight: 600,
						color: "#FFF",
						margin: 0,
					}}
				>
					{title}
				</p>
				<p style={{ fontSize: "12px", color: "#8E8E93", margin: "2px 0 0" }}>{subtitle}</p>
			</div>
		</div>
	);
}

function calculateDaysRemaining(endDate: string): number {
	const diff = new Date(endDate).getTime() - Date.now();
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
