import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
	{
		path: "/",
		label: "Home",
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-5 h-5"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.8}
			>
				<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
				<polyline points="9 22 9 12 15 12 15 22" />
			</svg>
		),
	},
	{
		path: "/equbs",
		label: "Equbs",
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-5 h-5"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.8}
			>
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
			</svg>
		),
	},
	{
		path: "/gyms",
		label: "Gyms",
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-5 h-5"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.8}
			>
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
				<line x1="3" y1="9" x2="21" y2="9" />
				<line x1="9" y1="21" x2="9" y2="9" />
			</svg>
		),
	},
	{
		path: "/challenges",
		label: "Steps",
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-5 h-5"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.8}
			>
				<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
			</svg>
		),
	},
	{
		path: "/profile",
		label: "Profile",
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-5 h-5"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.8}
			>
				<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
				<circle cx="12" cy="7" r="4" />
			</svg>
		),
	},
] as const;

export function BottomNav() {
	const location = useLocation();
	const navigate = useNavigate();

	return (
		<nav className="fixed bottom-0 left-0 right-0 glass border-t border-[#2c2c2e] safe-bottom z-50">
			<div className="flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
				{tabs.map((tab) => {
					const active =
						tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
					return (
						<button
							key={tab.path}
							type="button"
							onClick={() => navigate(tab.path)}
							className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
								active ? "text-[#00C853]" : "text-[#8E8E93]"
							}`}
						>
							<span className={active ? "drop-shadow-[0_0_6px_rgba(0,200,83,0.4)]" : ""}>
								{tab.icon}
							</span>
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
