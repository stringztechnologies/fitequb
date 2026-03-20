import { useEffect, useState } from "react";

export function Payment() {
	const [timeLeft, setTimeLeft] = useState(899);

	useEffect(() => {
		const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
		return () => clearInterval(t);
	}, []);

	const mins = Math.floor(timeLeft / 60);
	const secs = timeLeft % 60;

	return (
		<div className="px-4 pt-5 pb-24">
			{/* Header with timer badge */}
			<div className="flex items-center justify-between mb-5">
				<div>
					<h1 className="text-[18px] font-bold text-white">FitEqub</h1>
					<p className="text-[12px] text-[#8E8E93]">Join Equb Payment Confirmation</p>
				</div>
				<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-[rgba(255,152,0,0.2)] border border-[#FF9500]">
					<svg
						viewBox="0 0 24 24"
						className="w-4 h-4 text-[#FF9500]"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
					>
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
					<span
						className="text-[14px] font-bold text-[#FF9500] font-mono"
						style={{ fontVariantNumeric: "tabular-nums" }}
					>
						{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
					</span>
				</div>
			</div>

			{/* Payment Summary Card */}
			<div className="rounded-[16px] bg-[#1c1c1e] p-4 mb-4">
				<p className="text-[18px] font-bold text-white">
					<span className="text-[#FFD700]">1,000 ETB</span> Entry
				</p>
				<p className="text-[18px] font-bold text-white">
					<span className="text-[#FFD700]">25,000 ETB</span> Payout
				</p>
				<div className="flex items-center gap-2 mt-2">
					<svg
						viewBox="0 0 24 24"
						className="w-4 h-4 text-[#00C853]"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path d="M6.5 6.5h11M4 12h16" />
					</svg>
					<span className="text-[13px] text-[#8E8E93]">5 Gym Sessions/Week</span>
				</div>
			</div>

			{/* Payment Breakdown Table */}
			<div className="rounded-[16px] bg-[#1c1c1e] border border-[rgba(255,215,0,0.3)] p-4 mb-4">
				<h2 className="text-[16px] font-semibold text-white mb-3">Payment Breakdown</h2>

				<div className="flex justify-between py-2">
					<span className="text-[14px] text-[#8E8E93]">Entry Fee:</span>
					<span className="text-[14px] text-white">1,000 ETB</span>
				</div>
				<div className="flex justify-between py-2">
					<span className="text-[14px] text-[#8E8E93]">Processing Fee:</span>
					<span className="text-[14px] text-white">5 ETB</span>
				</div>

				<div className="border-t border-[rgba(255,255,255,0.1)] my-2" />

				<div className="flex justify-between py-2">
					<span className="text-[15px] font-bold text-[#FFD700]">Total to Pay:</span>
					<span className="text-[17px] font-bold text-[#FFD700]">1,005 ETB</span>
				</div>
			</div>

			{/* Payment Method */}
			<div className="mb-6">
				<h2 className="text-[16px] font-semibold text-white mb-3">Payment Method</h2>
				<div className="rounded-[12px] bg-[#1c1c1e] border-2 border-[#FFD700] p-3.5 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-[8px] bg-[#00C853] flex items-center justify-center text-white text-[11px] font-bold">
							TB
						</div>
						<span className="text-[15px] text-white font-medium">Telebirr</span>
					</div>
					<div className="w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center">
						<svg
							viewBox="0 0 24 24"
							className="w-4 h-4 text-[#0a0a0a]"
							fill="none"
							stroke="currentColor"
							strokeWidth={3}
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</div>
				</div>
			</div>

			{/* Confirm CTA */}
			<button
				type="button"
				className="w-full py-4 rounded-[12px] bg-[#00C853] text-[#0a0a0a] text-[16px] font-bold shadow-[0_0_20px_rgba(0,200,83,0.4)] active:scale-[0.98] transition-transform"
			>
				Confirm and Pay
			</button>
		</div>
	);
}
