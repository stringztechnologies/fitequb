import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";

interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

export function AiCoach() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		api<{ suggestions: string[] }>("/api/ai-coach/suggestions").then((res) => {
			if (res.data) setSuggestions(res.data.suggestions);
		});
	}, []);

	useEffect(() => {
		if (messages.length > 0) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	const sendMessage = async (text: string) => {
		if (!text.trim() || loading) return;

		const userMsg: ChatMessage = { role: "user", content: text.trim() };
		setMessages((prev) => [...prev, userMsg]);
		setInput("");
		setSuggestions([]);
		setLoading(true);

		const res = await api<{ reply: string; source: string }>("/api/ai-coach/chat", {
			method: "POST",
			body: JSON.stringify({ message: text.trim(), history: messages }),
		});

		if (res.data) {
			const reply = res.data.reply;
			setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
		} else {
			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content: "Sorry, I couldn't process that. Try again or ask something else!",
				},
			]);
		}

		setLoading(false);
	};

	return (
		<div
			className="flex flex-col"
			style={{
				height: "100vh",
				backgroundColor: "#0a0a0a",
				maxWidth: "430px",
				margin: "0 auto",
			}}
		>
			{/* Header */}
			<div
				style={{
					padding: "16px",
					borderBottom: "1px solid rgba(255,255,255,0.08)",
					backgroundColor: "#1c1c1e",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<div
						style={{
							width: "40px",
							height: "40px",
							borderRadius: "50%",
							background: "linear-gradient(135deg, #4285F4, #34A853)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<svg
							viewBox="0 0 24 24"
							style={{ width: "22px", height: "22px" }}
							fill="none"
							stroke="#FFF"
							strokeWidth={2}
						>
							<path d="M12 2L2 7l10 5 10-5-10-5z" />
							<path d="M2 17l10 5 10-5" />
							<path d="M2 12l10 5 10-5" />
						</svg>
					</div>
					<div>
						<h1
							style={{
								fontSize: "18px",
								fontWeight: 700,
								color: "#FFFFFF",
								margin: 0,
							}}
						>
							AI Fitness Coach
						</h1>
						<p style={{ fontSize: "12px", color: "#8E8E93", margin: 0 }}>Powered by Gemini</p>
					</div>
				</div>
			</div>

			{/* Messages area */}
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					padding: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
			>
				{messages.length === 0 && (
					<div style={{ textAlign: "center", paddingTop: "40px" }}>
						<div
							style={{
								width: "64px",
								height: "64px",
								borderRadius: "50%",
								background: "linear-gradient(135deg, #4285F4, #34A853)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								margin: "0 auto 16px",
							}}
						>
							<svg
								viewBox="0 0 24 24"
								style={{ width: "32px", height: "32px" }}
								fill="none"
								stroke="#FFF"
								strokeWidth={2}
							>
								<path d="M12 2L2 7l10 5 10-5-10-5z" />
								<path d="M2 17l10 5 10-5" />
								<path d="M2 12l10 5 10-5" />
							</svg>
						</div>
						<h2
							style={{
								fontSize: "20px",
								fontWeight: 700,
								color: "#FFFFFF",
								marginBottom: "8px",
							}}
						>
							FitEqub Coach
						</h2>
						<p
							style={{
								fontSize: "14px",
								color: "#8E8E93",
								maxWidth: "280px",
								margin: "0 auto",
							}}
						>
							Your personal AI fitness coach. Ask about workouts, nutrition, Equb strategy, or
							anything fitness-related!
						</p>
					</div>
				)}

				{messages.map((msg, i) => (
					<div
						key={`${msg.role}-${i}`}
						style={{
							display: "flex",
							justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
						}}
					>
						<div
							style={{
								maxWidth: "85%",
								padding: "12px 16px",
								borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
								backgroundColor: msg.role === "user" ? "#00C853" : "#1c1c1e",
								color: msg.role === "user" ? "#000" : "#FFFFFF",
								fontSize: "14px",
								lineHeight: "1.5",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
							}}
						>
							{msg.content}
						</div>
					</div>
				))}

				{loading && (
					<div style={{ display: "flex", justifyContent: "flex-start" }}>
						<div
							style={{
								padding: "12px 16px",
								borderRadius: "16px 16px 16px 4px",
								backgroundColor: "#1c1c1e",
								color: "#8E8E93",
								fontSize: "14px",
							}}
						>
							<span className="animate-pulse">Thinking...</span>
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Suggestions */}
			{suggestions.length > 0 && messages.length === 0 && (
				<div
					style={{
						padding: "0 16px 8px",
						display: "flex",
						flexWrap: "wrap",
						gap: "8px",
					}}
				>
					{suggestions.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => sendMessage(s)}
							style={{
								padding: "8px 14px",
								borderRadius: "20px",
								border: "1px solid rgba(255,255,255,0.15)",
								backgroundColor: "rgba(255,255,255,0.05)",
								color: "#FFFFFF",
								fontSize: "13px",
								cursor: "pointer",
							}}
						>
							{s}
						</button>
					))}
				</div>
			)}

			{/* Input area */}
			<div
				style={{
					padding: "12px 16px",
					paddingBottom: "max(12px, env(safe-area-inset-bottom))",
					borderTop: "1px solid rgba(255,255,255,0.08)",
					backgroundColor: "#1c1c1e",
					display: "flex",
					gap: "8px",
					alignItems: "flex-end",
				}}
			>
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							sendMessage(input);
						}
					}}
					placeholder="Ask your coach..."
					disabled={loading}
					style={{
						flex: 1,
						padding: "12px 16px",
						borderRadius: "24px",
						border: "1px solid rgba(255,255,255,0.1)",
						backgroundColor: "rgba(255,255,255,0.05)",
						color: "#FFFFFF",
						fontSize: "14px",
						outline: "none",
					}}
				/>
				<button
					type="button"
					onClick={() => sendMessage(input)}
					disabled={loading || !input.trim()}
					style={{
						width: "44px",
						height: "44px",
						borderRadius: "50%",
						backgroundColor: input.trim() && !loading ? "#00C853" : "#2c2c2e",
						border: "none",
						cursor: input.trim() && !loading ? "pointer" : "default",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}
				>
					<svg
						viewBox="0 0 24 24"
						style={{ width: "20px", height: "20px" }}
						fill="none"
						stroke={input.trim() && !loading ? "#FFF" : "#8E8E93"}
						strokeWidth={2}
					>
						<line x1="22" y1="2" x2="11" y2="13" />
						<polygon points="22 2 15 22 11 13 2 9 22 2" />
					</svg>
				</button>
			</div>
		</div>
	);
}
