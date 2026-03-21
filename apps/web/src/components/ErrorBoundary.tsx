import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("ErrorBoundary caught:", error, info.componentStack);
		// Report to Sentry if available
		if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).Sentry) {
			(
				window as unknown as { Sentry: { captureException: (e: Error) => void } }
			).Sentry.captureException(error);
		}
	}

	render() {
		if (this.state.hasError) {
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
						textAlign: "center",
					}}
				>
					<div
						style={{
							width: "64px",
							height: "64px",
							borderRadius: "50%",
							backgroundColor: "rgba(255,59,48,0.15)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							marginBottom: "16px",
						}}
					>
						<svg
							viewBox="0 0 24 24"
							style={{ width: "32px", height: "32px" }}
							fill="none"
							stroke="#FF3B30"
							strokeWidth={2}
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="15" y1="9" x2="9" y2="15" />
							<line x1="9" y1="9" x2="15" y2="15" />
						</svg>
					</div>
					<h1 style={{ fontSize: "20px", fontWeight: 700, color: "#FFF", margin: "0 0 8px" }}>
						Something went wrong
					</h1>
					<p style={{ fontSize: "14px", color: "#8E8E93", margin: "0 0 24px", maxWidth: "300px" }}>
						An unexpected error occurred. Please try again.
					</p>
					<button
						type="button"
						onClick={() => {
							this.setState({ hasError: false, error: null });
							window.location.reload();
						}}
						style={{
							padding: "12px 32px",
							borderRadius: "12px",
							backgroundColor: "#00C853",
							color: "#0a0a0a",
							fontSize: "16px",
							fontWeight: 700,
							border: "none",
							cursor: "pointer",
						}}
					>
						Try Again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
