import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";

export function Home() {
	const { user, loading } = useAuth();

	if (loading) return <Loading />;

	return (
		<div className="p-4 pb-20">
			<h1 className="text-2xl font-bold text-tg-text mb-1">FitEqub</h1>
			{user && <p className="text-sm text-tg-hint mb-4">Welcome, {user.full_name}</p>}
			<p className="text-tg-hint text-sm mb-6">Stake. Sweat. Split the pot.</p>

			<div className="space-y-3">
				<SectionCard
					title="Equb Rooms"
					description="Join a fitness accountability group"
					href="/equbs"
				/>
				<SectionCard
					title="Gym Day Passes"
					description="Discounted single-visit passes"
					href="/gyms"
				/>
				<SectionCard
					title="Step Challenge"
					description="Compete on the city leaderboard"
					href="/challenges"
				/>
			</div>
		</div>
	);
}

function SectionCard({
	title,
	description,
	href,
}: {
	title: string;
	description: string;
	href: string;
}) {
	return (
		<a
			href={href}
			className="block rounded-xl bg-tg-secondary-bg p-4 active:opacity-70 transition-opacity"
		>
			<h2 className="font-semibold text-tg-text">{title}</h2>
			<p className="text-sm text-tg-hint mt-1">{description}</p>
		</a>
	);
}
