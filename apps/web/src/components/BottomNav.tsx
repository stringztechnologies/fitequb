import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
	{ path: "/", label: "Home", icon: "🏠" },
	{ path: "/equbs", label: "Equbs", icon: "💪" },
	{ path: "/gyms", label: "Gyms", icon: "🏋️" },
	{ path: "/challenges", label: "Steps", icon: "👟" },
] as const;

export function BottomNav() {
	const location = useLocation();
	const navigate = useNavigate();

	return (
		<nav className="fixed bottom-0 left-0 right-0 bg-tg-bg border-t border-tg-secondary-bg">
			<div className="flex justify-around py-2">
				{tabs.map((tab) => {
					const active = location.pathname === tab.path;
					return (
						<button
							key={tab.path}
							type="button"
							onClick={() => navigate(tab.path)}
							className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
								active ? "text-tg-button" : "text-tg-hint"
							}`}
						>
							<span className="text-lg">{tab.icon}</span>
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
