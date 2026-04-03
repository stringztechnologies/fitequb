import type { User } from "@fitequb/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

type Step = "choose" | "phone" | "email" | "otp" | "name";

export function SignIn() {
	if (!supabase) {
		return <TelegramOnlySignIn />;
	}

	return <SupabaseSignIn client={supabase} />;
}

/** Fallback when Supabase env vars are missing — Telegram-only */
function TelegramOnlySignIn() {
	const navigate = useNavigate();

	return (
		<div className="bg-background min-h-screen flex flex-col items-center justify-center px-6 relative z-10">
			<div className="mb-8 text-center">
				<h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight">
					FitEqub
				</h1>
				<p className="text-on-surface-variant text-sm mt-2">Stake. Sweat. Split the pot.</p>
			</div>
			<a
				href="https://t.me/fitequb_bot"
				target="_blank"
				rel="noopener noreferrer"
				className="w-full max-w-sm py-4 rounded-2xl bg-[#0088cc] text-white font-headline font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
			>
				<svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FFF">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
				</svg>
				Open in Telegram
			</a>
			<button
				type="button"
				onClick={() => navigate("/")}
				className="w-full max-w-sm mt-3 py-3 text-on-surface-variant font-body text-sm active:scale-[0.98] transition-transform"
			>
				Continue as Guest
			</button>
		</div>
	);
}

/** Full sign-in form with phone/email OTP via Supabase Auth */
function SupabaseSignIn({ client }: { client: SupabaseClient }) {
	const navigate = useNavigate();
	const [step, setStep] = useState<Step>("choose");
	const [phone, setPhone] = useState("+251");
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [fullName, setFullName] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [method, setMethod] = useState<"phone" | "email">("phone");

	async function handleSendPhoneOtp() {
		setError("");
		setLoading(true);
		const { error: err } = await client.auth.signInWithOtp({ phone });
		setLoading(false);
		if (err) {
			setError(err.message);
			return;
		}
		setMethod("phone");
		setStep("otp");
	}

	async function handleSendEmailOtp() {
		setError("");
		setLoading(true);
		const { error: err } = await client.auth.signInWithOtp({ email });
		setLoading(false);
		if (err) {
			setError(err.message);
			return;
		}
		setMethod("email");
		setStep("otp");
	}

	async function handleVerifyOtp() {
		setError("");
		setLoading(true);

		const verifyPayload =
			method === "phone"
				? { phone, token: otp, type: "sms" as const }
				: { email, token: otp, type: "email" as const };

		const { data, error: err } = await client.auth.verifyOtp(verifyPayload);
		setLoading(false);

		if (err) {
			setError(err.message);
			return;
		}

		if (!data.session) {
			setError("Verification failed — try again");
			return;
		}

		const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
		const meRes = await fetch(`${API_URL}/web-auth/me`, {
			headers: {
				Authorization: `Bearer ${data.session.access_token}`,
				"Content-Type": "application/json",
			},
		});

		if (meRes.ok) {
			const meJson = (await meRes.json()) as { data: User | null };
			if (meJson.data) {
				navigate("/", { replace: true });
				return;
			}
		}

		setStep("name");
	}

	async function handleRegister() {
		setError("");
		if (!fullName.trim()) {
			setError("Please enter your name");
			return;
		}

		setLoading(true);

		const {
			data: { session },
		} = await client.auth.getSession();
		if (!session) {
			setError("Session expired — please sign in again");
			setStep("choose");
			setLoading(false);
			return;
		}

		const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
		const res = await fetch(`${API_URL}/web-auth/register`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${session.access_token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				supabase_uid: session.user.id,
				full_name: fullName.trim(),
				email: session.user.email ?? null,
				phone: session.user.phone ?? null,
			}),
		});

		setLoading(false);

		if (!res.ok) {
			const json = await res.json().catch(() => ({ error: "Registration failed" }));
			setError((json as { error?: string }).error ?? "Registration failed");
			return;
		}

		navigate("/", { replace: true });
	}

	return (
		<div className="bg-background min-h-screen flex flex-col items-center justify-center px-6 relative z-10">
			<div className="mb-8 text-center">
				<h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight">
					FitEqub
				</h1>
				<p className="text-on-surface-variant text-sm mt-2">Stake. Sweat. Split the pot.</p>
				<p className="text-on-surface-variant text-xs mt-1">Sign in or create a new account</p>
			</div>

			{step === "choose" && (
				<div className="w-full max-w-sm space-y-3">
					<button
						type="button"
						onClick={() => setStep("phone")}
						className="w-full py-4 rounded-2xl bg-primary text-on-primary font-headline font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
					>
						<span className="material-symbols-outlined text-xl">phone_iphone</span>
						Sign in with Phone
					</button>

					<button
						type="button"
						onClick={() => setStep("email")}
						className="w-full py-4 rounded-2xl bg-surface-container border border-outline-variant/30 text-on-surface font-headline font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
					>
						<span className="material-symbols-outlined text-xl">mail</span>
						Sign in with Email
					</button>

					<div className="flex items-center gap-3 py-3">
						<div className="flex-1 h-px bg-outline-variant/20" />
						<span className="text-on-surface-variant text-xs font-label uppercase tracking-widest">
							or
						</span>
						<div className="flex-1 h-px bg-outline-variant/20" />
					</div>

					<a
						href="https://t.me/fitequb_bot"
						target="_blank"
						rel="noopener noreferrer"
						className="w-full py-4 rounded-2xl bg-[#0088cc] text-white font-headline font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
					>
						<svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FFF">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
						</svg>
						Open in Telegram
					</a>

					<button
						type="button"
						onClick={() => navigate("/")}
						className="w-full py-3 text-on-surface-variant font-body text-sm active:scale-[0.98] transition-transform"
					>
						Continue as Guest
					</button>
				</div>
			)}

			{step === "phone" && (
				<div className="w-full max-w-sm space-y-4">
					<button
						type="button"
						onClick={() => setStep("choose")}
						className="flex items-center gap-1 text-on-surface-variant text-sm mb-2"
					>
						<span className="material-symbols-outlined text-lg">arrow_back</span>
						Back
					</button>
					<div>
						<label
							htmlFor="phone"
							className="block font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2"
						>
							Phone Number
						</label>
						<input
							id="phone"
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="+251912345678"
							className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-4 text-on-surface text-base outline-none focus:border-primary transition-colors"
						/>
						<p className="text-on-surface-variant text-xs mt-2">
							We'll send a one-time code via SMS
						</p>
					</div>
					{error && <p className="text-error text-sm">{error}</p>}
					<button
						type="button"
						onClick={handleSendPhoneOtp}
						disabled={loading || phone.length < 10}
						className="w-full py-4 rounded-2xl bg-primary text-on-primary font-headline font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
					>
						{loading ? "Sending..." : "Send Code"}
					</button>
				</div>
			)}

			{step === "email" && (
				<div className="w-full max-w-sm space-y-4">
					<button
						type="button"
						onClick={() => setStep("choose")}
						className="flex items-center gap-1 text-on-surface-variant text-sm mb-2"
					>
						<span className="material-symbols-outlined text-lg">arrow_back</span>
						Back
					</button>
					<div>
						<label
							htmlFor="email"
							className="block font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2"
						>
							Email Address
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-4 text-on-surface text-base outline-none focus:border-primary transition-colors"
						/>
						<p className="text-on-surface-variant text-xs mt-2">
							We'll send a one-time code to your email
						</p>
					</div>
					{error && <p className="text-error text-sm">{error}</p>}
					<button
						type="button"
						onClick={handleSendEmailOtp}
						disabled={loading || !email.includes("@")}
						className="w-full py-4 rounded-2xl bg-primary text-on-primary font-headline font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
					>
						{loading ? "Sending..." : "Send Code"}
					</button>
				</div>
			)}

			{step === "otp" && (
				<div className="w-full max-w-sm space-y-4">
					<button
						type="button"
						onClick={() => setStep(method)}
						className="flex items-center gap-1 text-on-surface-variant text-sm mb-2"
					>
						<span className="material-symbols-outlined text-lg">arrow_back</span>
						Back
					</button>
					<div>
						<label
							htmlFor="otp"
							className="block font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2"
						>
							Verification Code
						</label>
						<input
							id="otp"
							type="text"
							inputMode="numeric"
							value={otp}
							onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
							placeholder="000000"
							maxLength={6}
							className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-4 text-on-surface text-2xl text-center tracking-[0.5em] font-mono outline-none focus:border-primary transition-colors"
						/>
						<p className="text-on-surface-variant text-xs mt-2 text-center">
							Enter the 6-digit code sent to{" "}
							<span className="text-on-surface font-medium">
								{method === "phone" ? phone : email}
							</span>
						</p>
					</div>
					{error && <p className="text-error text-sm text-center">{error}</p>}
					<button
						type="button"
						onClick={handleVerifyOtp}
						disabled={loading || otp.length < 6}
						className="w-full py-4 rounded-2xl bg-primary text-on-primary font-headline font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
					>
						{loading ? "Verifying..." : "Verify"}
					</button>
				</div>
			)}

			{step === "name" && (
				<div className="w-full max-w-sm space-y-4">
					<div className="text-center mb-2">
						<span className="material-symbols-outlined text-primary text-4xl">celebration</span>
						<h2 className="font-headline text-xl font-bold text-on-surface mt-2">
							Welcome to FitEqub!
						</h2>
						<p className="text-on-surface-variant text-sm mt-1">What should we call you?</p>
					</div>
					<input
						type="text"
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						placeholder="Your full name"
						className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-4 text-on-surface text-base outline-none focus:border-primary transition-colors"
					/>
					{error && <p className="text-error text-sm">{error}</p>}
					<button
						type="button"
						onClick={handleRegister}
						disabled={loading || !fullName.trim()}
						className="w-full py-4 rounded-2xl bg-primary text-on-primary font-headline font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
					>
						{loading ? "Creating account..." : "Get Started"}
					</button>
				</div>
			)}
		</div>
	);
}
