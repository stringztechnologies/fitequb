import type { ReactNode } from "react";

function isTelegramWebApp(): boolean {
	return Boolean(window.Telegram?.WebApp?.initData);
}

function isDemoOverride(): boolean {
	if (import.meta.env.MODE !== "development") return false;
	return new URLSearchParams(window.location.search).get("demo") === "true";
}

export function TelegramGate({ children }: { children: ReactNode }) {
	if (isTelegramWebApp() || isDemoOverride()) {
		return <>{children}</>;
	}

	return (
		<div
			style={{
				minHeight: "100vh",
				backgroundColor: "#0a0a0a",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "24px",
				maxWidth: "430px",
				margin: "0 auto",
			}}
		>
			{/* Logo */}
			<h1
				style={{
					fontSize: "42px",
					fontWeight: 700,
					color: "#00C853",
					margin: 0,
					letterSpacing: "-1px",
				}}
			>
				FitEqub
			</h1>
			<p
				style={{
					fontSize: "16px",
					color: "#FFD700",
					marginTop: "8px",
					fontWeight: 500,
				}}
			>
				Stake. Sweat. Split the pot.
			</p>

			{/* Feature summary */}
			<div
				style={{
					marginTop: "40px",
					display: "flex",
					flexDirection: "column",
					gap: "16px",
					width: "100%",
					maxWidth: "320px",
				}}
			>
				<FeaturePoint
					icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
					text="Join fitness Equbs — stake real ETB, hit your goals, win the pot"
				/>
				<FeaturePoint
					icon="M6.5 6.5h11M4 12h16M6.5 17.5h11M2 10h2v4H2zm18 0h2v4h-2z"
					text="Get discounted gym day passes at partner gyms in Addis"
				/>
				<FeaturePoint
					icon="M22 12 18 12 15 21 9 3 6 12 2 12"
					text="Compete in city-wide step challenges and earn rewards"
				/>
			</div>

			{/* CTA */}
			<a
				href="https://t.me/fitequb_bot"
				style={{
					marginTop: "40px",
					width: "100%",
					maxWidth: "320px",
					padding: "16px",
					borderRadius: "14px",
					backgroundColor: "#0088cc",
					color: "#FFF",
					fontSize: "17px",
					fontWeight: 700,
					textDecoration: "none",
					textAlign: "center",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "10px",
					boxShadow: "0 4px 20px rgba(0,136,204,0.3)",
				}}
			>
				<svg viewBox="0 0 24 24" style={{ width: "22px", height: "22px" }} fill="#FFF">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
				</svg>
				Open in Telegram
			</a>

			{/* Subtitle */}
			<p
				style={{
					marginTop: "16px",
					fontSize: "12px",
					color: "#8E8E93",
					textAlign: "center",
					maxWidth: "280px",
					lineHeight: 1.5,
				}}
			>
				This app runs inside Telegram for secure, instant access to your fitness groups and
				payments.
			</p>

			{/* Footer */}
			<p style={{ marginTop: "auto", paddingTop: "40px", fontSize: "11px", color: "#555" }}>
				Built by Stringz Technologies — Addis Ababa
			</p>
		</div>
	);
}

function FeaturePoint({ icon, text }: { icon: string; text: string }) {
	return (
		<div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
			<div
				style={{
					width: "40px",
					height: "40px",
					minWidth: "40px",
					borderRadius: "12px",
					backgroundColor: "rgba(0,200,83,0.1)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<svg
					viewBox="0 0 24 24"
					style={{ width: "20px", height: "20px" }}
					fill="none"
					stroke="#00C853"
					strokeWidth={1.8}
				>
					<path d={icon} />
				</svg>
			</div>
			<p style={{ fontSize: "14px", color: "#E0E0E0", margin: 0, lineHeight: 1.5 }}>{text}</p>
		</div>
	);
}
