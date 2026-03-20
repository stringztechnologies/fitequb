import { useEffect, useState } from "react";
import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

interface TrainerData {
	trainer: {
		id: string;
		affiliate_code: string;
		gym_name: string | null;
		commission_rate: number;
		status: string;
		total_earned: number;
		pending_balance: number;
	};
	referred_users: {
		id: string;
		full_name: string;
		username: string | null;
		created_at: string;
	}[];
	earnings: { id: string; amount: number; created_at: string }[];
	payouts: { id: string; amount: number; status: string; created_at: string }[];
}

export function TrainerDashboard() {
	const { loading: authLoading } = useAuth();
	const [data, setData] = useState<TrainerData | null>(null);
	const [loading, setLoading] = useState(true);
	const [isTrainer, setIsTrainer] = useState(true);
	const [registering, setRegistering] = useState(false);
	const [phone, setPhone] = useState("");
	const [gymName, setGymName] = useState("");
	const [payoutLoading, setPayoutLoading] = useState(false);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		api<TrainerData>("/api/trainers/dashboard")
			.then((res) => {
				if (res.data) {
					setData(res.data);
				} else {
					setIsTrainer(false);
				}
			})
			.finally(() => setLoading(false));
	}, []);

	async function handleRegister(e: React.FormEvent) {
		e.preventDefault();
		setRegistering(true);
		const res = await api("/api/trainers/register", {
			method: "POST",
			body: JSON.stringify({ phone, gym_name: gymName || undefined }),
		});
		setRegistering(false);
		if (!res.error) {
			window.location.reload();
		}
	}

	async function handlePayout() {
		setPayoutLoading(true);
		const res = await api<{ success: boolean; amount: number }>("/api/trainers/request-payout", {
			method: "POST",
		});
		setPayoutLoading(false);
		if (res.data?.success) {
			window.location.reload();
		}
	}

	if (authLoading || loading) return <Loading />;

	// Registration form for non-trainers
	if (!isTrainer) {
		return (
			<div className="p-4 pb-20">
				<h1 className="text-xl font-bold text-tg-text mb-2">Become a Trainer</h1>
				<p className="text-sm text-tg-hint mb-6">
					Earn commissions when your referred users join paid Equbs. Share your affiliate code with
					your clients.
				</p>

				<form onSubmit={handleRegister} className="space-y-4">
					<div>
						<label htmlFor="phone" className="block text-sm text-tg-text mb-1">
							Phone Number (for payouts)
						</label>
						<input
							id="phone"
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="+251..."
							required
							className="w-full bg-tg-secondary-bg text-tg-text rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tg-button"
						/>
					</div>
					<div>
						<label htmlFor="gym" className="block text-sm text-tg-text mb-1">
							Gym / Studio Name (optional)
						</label>
						<input
							id="gym"
							type="text"
							value={gymName}
							onChange={(e) => setGymName(e.target.value)}
							placeholder="e.g. Bole Fitness Center"
							className="w-full bg-tg-secondary-bg text-tg-text rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-tg-button"
						/>
					</div>
					<button
						type="submit"
						disabled={registering}
						className="w-full bg-tg-button text-tg-button-text py-3 rounded-xl font-semibold disabled:opacity-50"
					>
						{registering ? "Registering..." : "Register as Trainer"}
					</button>
				</form>
			</div>
		);
	}

	if (!data) return <div className="p-4 text-tg-hint">Could not load dashboard</div>;

	const { trainer, referred_users, payouts } = data;

	function copyCode() {
		navigator.clipboard.writeText(trainer.affiliate_code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<div className="p-4 pb-20">
			<h1 className="text-xl font-bold text-tg-text mb-4">Trainer Dashboard</h1>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 gap-3 mb-4">
				<div className="rounded-xl bg-tg-secondary-bg p-3">
					<p className="text-xs text-tg-hint">Total Earned</p>
					<p className="text-lg font-bold text-tg-text">{trainer.total_earned.toFixed(2)} ETB</p>
				</div>
				<div className="rounded-xl bg-tg-secondary-bg p-3">
					<p className="text-xs text-tg-hint">Pending</p>
					<p className="text-lg font-bold text-green-500">
						{trainer.pending_balance.toFixed(2)} ETB
					</p>
				</div>
				<div className="rounded-xl bg-tg-secondary-bg p-3">
					<p className="text-xs text-tg-hint">Referred Users</p>
					<p className="text-lg font-bold text-tg-text">{referred_users.length}</p>
				</div>
				<div className="rounded-xl bg-tg-secondary-bg p-3">
					<p className="text-xs text-tg-hint">Commission Rate</p>
					<p className="text-lg font-bold text-tg-text">
						{(trainer.commission_rate * 100).toFixed(0)}%
					</p>
				</div>
			</div>

			{/* Affiliate Code */}
			<div className="rounded-xl bg-tg-secondary-bg p-4 mb-4">
				<p className="text-xs text-tg-hint mb-1">Your Affiliate Code</p>
				<div className="flex gap-2">
					<code className="flex-1 px-3 py-2 bg-tg-bg rounded text-sm text-tg-text font-mono">
						{trainer.affiliate_code}
					</code>
					<button
						type="button"
						onClick={copyCode}
						className="px-3 py-2 bg-tg-button text-tg-button-text rounded text-sm"
					>
						{copied ? "Copied!" : "Copy"}
					</button>
				</div>
			</div>

			{/* Payout Button */}
			{trainer.pending_balance > 0 && (
				<button
					type="button"
					onClick={handlePayout}
					disabled={payoutLoading}
					className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold mb-4 disabled:opacity-50"
				>
					{payoutLoading
						? "Processing..."
						: `Request Payout — ${trainer.pending_balance.toFixed(2)} ETB`}
				</button>
			)}

			{/* Referred Users */}
			<div className="mb-4">
				<h2 className="font-semibold text-tg-text mb-2">Referred Users</h2>
				{referred_users.length > 0 ? (
					<div className="space-y-2">
						{referred_users.map((u) => (
							<div
								key={u.id}
								className="flex justify-between items-center px-3 py-2 bg-tg-secondary-bg rounded"
							>
								<div>
									<p className="text-sm text-tg-text">{u.full_name}</p>
									<p className="text-xs text-tg-hint">@{u.username ?? "—"}</p>
								</div>
								<p className="text-xs text-tg-hint">
									{new Date(u.created_at).toLocaleDateString()}
								</p>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-tg-hint">No referred users yet. Share your code!</p>
				)}
			</div>

			{/* Payout History */}
			{payouts.length > 0 && (
				<div>
					<h2 className="font-semibold text-tg-text mb-2">Payout History</h2>
					<div className="space-y-2">
						{payouts.map((p) => (
							<div
								key={p.id}
								className="flex justify-between items-center px-3 py-2 bg-tg-secondary-bg rounded"
							>
								<div>
									<p className="text-sm text-tg-text">{p.amount.toFixed(2)} ETB</p>
									<p className="text-xs text-tg-hint">
										{new Date(p.created_at).toLocaleDateString()}
									</p>
								</div>
								<span
									className={`text-xs px-2 py-0.5 rounded-full ${
										p.status === "completed"
											? "bg-green-100 text-green-800"
											: p.status === "pending"
												? "bg-yellow-100 text-yellow-800"
												: "bg-red-100 text-red-800"
									}`}
								>
									{p.status}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
