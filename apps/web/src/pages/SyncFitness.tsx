export function SyncFitness() {
	return (
		<div className="px-4 pt-5 pb-24">
			<h1 className="text-[20px] font-bold text-white text-center mb-2">Sync Fitness Data</h1>
			<p className="text-[13px] text-[#8E8E93] text-center mb-6">
				Connect your fitness apps to automatically track workouts
			</p>

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

			{/* Provider Cards */}
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

			{/* Last Synced */}
			<div className="rounded-[12px] bg-[#1c1c1e] border border-[rgba(0,200,83,0.3)] p-3.5 flex items-center gap-3 mb-6">
				<svg
					viewBox="0 0 24 24"
					className="w-4 h-4 text-[#00C853]"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<polyline points="23 4 23 10 17 10" />
					<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
				</svg>
				<span className="text-[13px] text-[#8E8E93]">Last synced: 2 hours ago</span>
			</div>

			{/* Sync Button */}
			<button
				type="button"
				className="w-full py-4 rounded-[12px] bg-[#00C853] text-[#0a0a0a] text-[16px] font-bold shadow-[0_0_20px_rgba(0,200,83,0.4)] active:scale-[0.98] transition-transform"
			>
				Sync Now
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
			<button
				type="button"
				className="px-5 py-2 rounded-[8px] bg-[#FFC107] text-[#0a0a0a] text-[13px] font-bold active:scale-95 transition-transform"
			>
				Connect
			</button>
		</div>
	);
}
