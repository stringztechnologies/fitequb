import { useNavigate } from "react-router-dom";

export function NotFound() {
	const navigate = useNavigate();

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "80vh",
				padding: "24px",
				textAlign: "center",
			}}
		>
			<p style={{ fontSize: "64px", fontWeight: 700, color: "#FFD700", margin: 0 }}>404</p>
			<p style={{ fontSize: "18px", color: "#FFF", margin: "8px 0 0" }}>Page not found</p>
			<p style={{ fontSize: "14px", color: "#8E8E93", margin: "8px 0 24px" }}>
				The page you're looking for doesn't exist.
			</p>
			<button
				type="button"
				onClick={() => navigate("/")}
				style={{
					padding: "12px 32px",
					borderRadius: "12px",
					backgroundColor: "#00C853",
					color: "#FFF",
					fontSize: "15px",
					fontWeight: 700,
					border: "none",
					cursor: "pointer",
				}}
			>
				Go Home
			</button>
		</div>
	);
}
