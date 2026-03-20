import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
	{
		path: "/",
		label: "Home",
		activeColor: "#FFD700",
		glowColor: "rgba(255,215,0,0.4)",
		d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
	},
	{
		path: "/equbs",
		label: "Equbs",
		activeColor: "#FFD700",
		glowColor: "rgba(255,215,0,0.4)",
		d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
	},
	{
		path: "/gyms",
		label: "Gyms",
		activeColor: "#FF6B6B",
		glowColor: "rgba(255,107,107,0.4)",
		d: "M6.5 6.5h11M4 12h16M6.5 17.5h11M2 12a2 2 0 0 1 2-2h1v4H4a2 2 0 0 1-2-2zM20 10h1a2 2 0 0 1 0 4h-1v-4z",
	},
	{
		path: "/challenges",
		label: "Steps",
		activeColor: "#E040FB",
		glowColor: "rgba(224,64,251,0.4)",
		d: "M22 12 18 12 15 21 9 3 6 12 2 12",
	},
	{
		path: "/profile",
		label: "Profile",
		activeColor: "#00C853",
		glowColor: "rgba(0,200,83,0.4)",
		d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
	},
];

export function BottomNav() {
	const location = useLocation();
	const navigate = useNavigate();

	return (
		<nav className="fixed bottom-0 left-0 right-0 glass border-t border-[rgba(255,255,255,0.08)] z-50">
			<div className="flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
				{tabs.map((tab) => {
					const active =
						tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
					return (
						<button
							key={tab.path}
							type="button"
							onClick={() => navigate(tab.path)}
							className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors"
							style={{ color: active ? tab.activeColor : "#8E8E93" }}
						>
							<span
								style={{
									filter: active ? `drop-shadow(0 0 6px ${tab.glowColor})` : "none",
								}}
							>
								<svg
									viewBox="0 0 24 24"
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									strokeWidth={1.8}
								>
									<path d={tab.d} />
								</svg>
							</span>
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
