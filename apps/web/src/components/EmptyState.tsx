interface EmptyStateProps {
	icon: React.ReactNode;
	title: string;
	subtitle: string;
	ctaLabel?: string;
	onCta?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "64px 32px",
				textAlign: "center",
			}}
		>
			<div style={{ marginBottom: "16px", color: "#8E8E93" }}>{icon}</div>
			<p style={{ fontSize: "16px", fontWeight: 600, color: "#FFFFFF", margin: "0 0 8px" }}>
				{title}
			</p>
			<p style={{ fontSize: "14px", color: "#8E8E93", margin: "0 0 24px" }}>{subtitle}</p>
			{ctaLabel && onCta && (
				<button
					type="button"
					onClick={onCta}
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
					{ctaLabel}
				</button>
			)}
		</div>
	);
}
