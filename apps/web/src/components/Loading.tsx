export function Loading() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
			<div className="relative w-10 h-10">
				<div className="absolute inset-0 rounded-full border-2 border-[#2c2c2e]" />
				<div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-green animate-spin" />
			</div>
			<p className="text-[#8E8E93] text-xs font-medium tracking-wide">Loading</p>
		</div>
	);
}
