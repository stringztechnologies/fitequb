import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function DuelChallenge() {
	const navigate = useNavigate();
	const [username, setUsername] = useState("");

	return (
		<div className="bg-background text-on-surface font-body pb-44 min-h-screen">
			{/* Fixed Header */}
			<header className="fixed top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-xl flex items-center gap-3 px-5 h-16">
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
				<h1 className="font-headline font-bold text-xl text-primary-container">
					1v1 Duel
				</h1>
			</header>

			{/* Spacer for fixed header */}
			<div className="h-16" />

			{/* VS Hero Section */}
			<section className="relative flex flex-col items-center pt-10 pb-6 px-5">
				{/* Decorative glow */}
				<div className="absolute w-40 h-40 bg-primary/10 rounded-full blur-3xl top-6 left-1/2 -translate-x-1/2 pointer-events-none" />

				<div className="relative flex items-center justify-center gap-6">
					{/* You */}
					<div className="flex flex-col items-center gap-2">
						<div
							className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center"
							aria-label="Your avatar"
						>
							<span className="font-headline text-2xl font-bold text-primary">
								Y
							</span>
						</div>
						<span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
							You
						</span>
					</div>

					{/* VS */}
					<div className="relative flex items-center justify-center">
						<div className="absolute w-16 h-16 bg-primary/15 rounded-full blur-2xl pointer-events-none" />
						<span className="font-headline text-4xl font-black text-on-surface relative z-10">
							VS
						</span>
					</div>

					{/* Opponent */}
					<div className="flex flex-col items-center gap-2">
						<div
							className="w-20 h-20 rounded-full bg-secondary-container/20 border-2 border-secondary-container/30 flex items-center justify-center"
							aria-label="Opponent avatar"
						>
							<span className="font-headline text-2xl font-bold text-secondary-container">
								?
							</span>
						</div>
						<span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
							Opponent
						</span>
					</div>
				</div>
			</section>

			{/* Stake Display */}
			<section className="text-center px-5 pb-8">
				<p className="font-headline text-3xl font-extrabold text-secondary-container">
					500 ETB each
				</p>
				<p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">
					Total prize: 1,000 ETB
				</p>
			</section>

			{/* Challenge Details Card */}
			<section className="px-5 pb-6">
				<div className="bg-surface-container-low rounded-lg p-5">
					<div className="grid gap-4">
						{/* Duration */}
						<div className="flex items-center gap-4">
							<span className="material-symbols-outlined text-on-surface-variant text-xl">
								schedule
							</span>
							<div className="flex-1">
								<p className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
									Duration
								</p>
								<p className="font-label text-sm text-on-surface font-medium">
									7 Days
								</p>
							</div>
						</div>

						{/* Requirement */}
						<div className="flex items-center gap-4">
							<span className="material-symbols-outlined text-on-surface-variant text-xl">
								directions_run
							</span>
							<div className="flex-1">
								<p className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
									Requirement
								</p>
								<p className="font-label text-sm text-on-surface font-medium">
									10,000 steps/day
								</p>
							</div>
						</div>

						{/* Prize Pool */}
						<div className="flex items-center gap-4">
							<span className="material-symbols-outlined text-on-surface-variant text-xl">
								payments
							</span>
							<div className="flex-1">
								<p className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
									Prize Pool
								</p>
								<p className="font-label text-sm text-primary font-bold">
									1,000 ETB
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Invite Section */}
			<section className="px-5 pb-6">
				<label
					htmlFor="telegram-username"
					className="font-label text-xs text-on-surface-variant uppercase tracking-wider block mb-2"
				>
					Invite by Telegram username
				</label>
				<div className="flex gap-3">
					<div className="flex-1 relative">
						<span className="absolute left-4 top-1/2 -translate-y-1/2 font-label text-sm text-on-surface-variant">
							@
						</span>
						<input
							id="telegram-username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="username"
							className="w-full bg-surface-container rounded-lg pl-9 pr-4 py-3 font-label text-sm text-on-surface placeholder:text-outline border border-outline-variant/50 focus:border-primary/50 focus:outline-none transition-colors"
						/>
					</div>
				</div>

				<div className="flex items-center gap-3 my-4">
					<div className="flex-1 h-px bg-outline-variant/30" />
					<span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
						or
					</span>
					<div className="flex-1 h-px bg-outline-variant/30" />
				</div>

				<button
					type="button"
					className="w-full flex items-center justify-center gap-2 bg-surface-container py-3 rounded-lg font-label text-sm text-on-surface-variant hover:bg-surface-container-high active:scale-[0.98] transition-all"
				>
					<span className="material-symbols-outlined text-lg">share</span>
					Share Invite Link
				</button>
			</section>

			{/* Fixed Action Buttons */}
			<div className="fixed bottom-16 left-0 right-0 z-40 px-5 pb-4 pt-3 bg-gradient-to-t from-background via-background to-transparent">
				<button
					type="button"
					className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary py-5 rounded-full font-headline font-bold text-base shadow-glow active:scale-[0.97] transition-transform"
				>
					<span className="material-symbols-outlined text-xl">bolt</span>
					Challenge a Friend
				</button>
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="w-full mt-3 border-2 border-outline-variant text-on-surface-variant py-3 rounded-full font-label uppercase tracking-widest text-sm active:scale-[0.97] transition-transform"
				>
					Back
				</button>
			</div>
		</div>
	);
}
