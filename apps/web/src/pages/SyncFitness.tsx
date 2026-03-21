import { useNavigate } from "react-router-dom";

export function SyncFitness() {
	const navigate = useNavigate();

	return (
		<div className="px-4 pt-5 pb-24">
			{/* Back button */}
			<button
				type="button"
				onClick={() => navigate(-1)}
				className="flex items-center gap-1 text-[#8E8E93] text-[14px] mb-4"
				style={{ background: "none", border: "none", cursor: "pointer" }}
			>
				<svg
					viewBox="0 0 24 24"
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path d="M15 18l-6-6 6-6" />
				</svg>
				Back
			</button>
			<h1 className="text-[20px] font-bold text-white text-center mb-2">Sync Fitness Data</h1>

			{/* Coming soon notice */}
			<div
				style={{
					margin: "0 0 20px",
					padding: "12px 16px",
					borderRadius: "12px",
					backgroundColor: "rgba(255,152,0,0.1)",
					border: "1px solid rgba(255,152,0,0.25)",
				}}
			>
				<p style={{ fontSize: "13px", color: "#FF9500", margin: 0, lineHeight: 1.5 }}>
					Automatic fitness tracking is coming soon. For now, log your workouts manually from the
					home screen.
				</p>
			</div>

			{/* Pulse icon */}
			<div className="flex justify-center mb-8">
				<div className="relative w-20 h-20">
					<div className="absolute inset-0 rounded-full bg-[rgba(0,200,83,0.1)] animate-ping" />
					<div className="absolute inset-2 rounded-full bg-[rgba(0,200,83,0.15)] animate-pulse" />
					<div className="absolute inset-4 rounded-full bg-[rgba(0,200,83,0.2)] flex items-center justify-center">
						<svg
							viewBox="0 0 24 24"
							className="w-8 h-8 text-[#00C853]"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
						>
							<polyline points="23 4 23 10 17 10" />
							<polyline points="1 20 1 14 7 14" />
							<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
						</svg>
					</div>
				</div>
			</div>

			{/* Provider Cards — all Coming Soon */}
			<div className="space-y-3 mb-6">
				<ProviderCard
					name="Google Fit"
					icon={
						<svg
							viewBox="0 0 24 24"
							className="w-5 h-5 text-[#FF3B30]"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
						</svg>
					}
				/>
				<ProviderCard
					name="Apple Health"
					icon={
						<svg
							viewBox="0 0 24 24"
							className="w-5 h-5 text-[#FF6B6B]"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
						</svg>
					}
				/>
				<ProviderCard
					name="Telegram Activity"
					icon={
						<svg
							viewBox="0 0 24 24"
							className="w-5 h-5 text-[#00BCD4]"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
						</svg>
					}
				/>
			</div>

			{/* Manual log CTA */}
			<button
				type="button"
				onClick={() => navigate("/equbs")}
				style={{
					width: "100%",
					padding: "16px",
					borderRadius: "12px",
					backgroundColor: "#00C853",
					color: "#0a0a0a",
					fontSize: "16px",
					fontWeight: 700,
					border: "none",
					cursor: "pointer",
					boxShadow: "0 0 20px rgba(0,200,83,0.4)",
				}}
			>
				Log Workout Manually
			</button>
		</div>
	);
}

function ProviderCard({ name, icon }: { name: string; icon: React.ReactNode }) {
	return (
		<div className="rounded-[12px] bg-[#1c1c1e] p-3.5 flex items-center justify-between">
			<div className="flex items-center gap-3">
				<div className="w-9 h-9 rounded-[8px] bg-[#2c2c2e] flex items-center justify-center">
					{icon}
				</div>
				<span className="text-[15px] font-semibold text-white">{name}</span>
			</div>
			<span
				style={{
					padding: "6px 14px",
					borderRadius: "8px",
					backgroundColor: "#2c2c2e",
					color: "#8E8E93",
					fontSize: "13px",
					fontWeight: 600,
				}}
			>
				Coming Soon
			</span>
		</div>
	);
}
