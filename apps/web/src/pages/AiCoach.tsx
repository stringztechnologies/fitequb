import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { api, publicApi } from "../lib/api.js";

interface Message {
	id: string;
	role: "user" | "coach";
	text: string;
}

const SUGGESTIONS = [
	"What should I eat before a morning run?",
	"Give me a quick 15-min workout",
	"Best walking routes in Addis?",
	"Tsom-friendly exercises",
];

export function AiCoach() {
	const navigate = useNavigate();
	const { isGuest } = useAuth();
	const [messages, setMessages] = useState<Message[]>([
		{
			id: "welcome",
			role: "coach",
			text: "Hey! I'm your FitEqub Coach. Ask me about workouts, nutrition, walking routes in Addis, or Tsom-friendly exercises. What's on your mind?",
		},
	]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [messages, loading]);

	async function send(text?: string) {
		const msg = (text ?? input).trim();
		if (!msg || loading) return;

		const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: msg };
		setMessages((prev) => [...prev, userMsg]);
		setInput("");
		setLoading(true);

		const history = messages
			.filter((m) => m.id !== "welcome")
			.map((m) => ({
				role: m.role === "user" ? "user" : "model",
				text: m.text,
			}));

		// Use public endpoint for guests, authenticated for logged-in users
		const coachApi = isGuest ? publicApi : api;
		const coachPath = isGuest ? "/public/ai/coach" : "/api/ai/coach";
		const res = await coachApi<{ reply: string }>(coachPath, {
			method: "POST",
			body: JSON.stringify({ message: msg, history }),
		});

		const reply = res.data?.reply ?? res.error ?? "Sorry, I couldn't connect. Try again!";
		setMessages((prev) => [...prev, { id: `c-${Date.now()}`, role: "coach", text: reply }]);
		setLoading(false);
		inputRef.current?.focus();
	}

	const showSuggestions = messages.length <= 1;

	return (
		<div className="bg-background text-on-surface font-body min-h-screen flex flex-col">
			{/* Header */}
			<header className="fixed top-0 w-full max-w-[430px] z-50 bg-[#131313]/70 backdrop-blur-xl flex items-center gap-3 px-5 h-16">
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-all"
					aria-label="Go back"
				>
					<span className="material-symbols-outlined text-on-surface-variant text-xl">
						arrow_back
					</span>
				</button>
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
						<span
							className="material-symbols-outlined text-primary text-lg"
							style={{ fontVariationSettings: "'FILL' 1" }}
						>
							auto_awesome
						</span>
					</div>
					<div>
						<h1 className="font-headline font-bold text-base text-on-surface leading-tight">
							AI Coach
						</h1>
						<p className="font-label text-2xs text-primary uppercase tracking-widest">Online</p>
					</div>
				</div>
			</header>

			{/* Messages */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto pt-20 pb-36 px-4 space-y-3">
				{messages.map((msg) =>
					msg.role === "coach" ? (
						<div key={msg.id} className="flex items-end gap-2 max-w-[85%]">
							<div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
								<span
									className="material-symbols-outlined text-primary text-sm"
									style={{ fontVariationSettings: "'FILL' 1" }}
								>
									auto_awesome
								</span>
							</div>
							<div className="glass-card rounded-2xl rounded-bl-md px-4 py-3 neon-glow">
								<p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
									{msg.text}
								</p>
							</div>
						</div>
					) : (
						<div key={msg.id} className="flex justify-end">
							<div className="max-w-[80%] bg-primary/15 border border-primary/20 rounded-2xl rounded-br-md px-4 py-3">
								<p className="text-sm text-on-surface leading-relaxed">{msg.text}</p>
							</div>
						</div>
					),
				)}

				{/* Typing indicator */}
				{loading && (
					<div className="flex items-end gap-2 max-w-[85%]">
						<div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
							<span
								className="material-symbols-outlined text-primary text-sm"
								style={{ fontVariationSettings: "'FILL' 1" }}
							>
								auto_awesome
							</span>
						</div>
						<div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
							<div className="flex items-center gap-1.5">
								<span
									className="w-2 h-2 bg-primary rounded-full animate-bounce"
									style={{ animationDelay: "0ms" }}
								/>
								<span
									className="w-2 h-2 bg-primary rounded-full animate-bounce"
									style={{ animationDelay: "150ms" }}
								/>
								<span
									className="w-2 h-2 bg-primary rounded-full animate-bounce"
									style={{ animationDelay: "300ms" }}
								/>
							</div>
						</div>
					</div>
				)}

				{/* Suggestions */}
				{showSuggestions && (
					<div className="pt-4">
						<p className="font-label text-2xs text-on-surface-variant uppercase tracking-widest mb-3 ml-9">
							Try asking
						</p>
						<div className="flex flex-wrap gap-2 ml-9">
							{SUGGESTIONS.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => send(s)}
									className="bg-surface-container border border-outline-variant/20 rounded-full px-4 py-2 font-body text-xs text-on-surface-variant hover:text-primary hover:border-primary/30 active:scale-95 transition-all"
								>
									{s}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Input bar */}
			<div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto z-40 px-4 pb-3 pt-2 bg-gradient-to-t from-background via-background to-transparent">
				<div className="flex items-center gap-2 bg-surface-container-low rounded-full border border-outline-variant/20 pl-5 pr-2 py-1.5">
					<input
						ref={inputRef}
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								send();
							}
						}}
						placeholder="Ask your coach..."
						disabled={loading}
						className="flex-1 bg-transparent border-none outline-none text-on-surface text-sm placeholder:text-on-surface-variant/50 font-body disabled:opacity-50"
					/>
					<button
						type="button"
						onClick={() => send()}
						disabled={!input.trim() || loading}
						className="w-10 h-10 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 disabled:scale-100 shrink-0"
					>
						<span className="material-symbols-outlined text-on-primary text-lg">send</span>
					</button>
				</div>
			</div>
		</div>
	);
}
