import type { EqubRoom } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { isQaTestMode, MOCK_EQUB_ROOMS } from "../lib/testMode.js";

interface ProfileSummary {
  total_points: number;
  streak: number;
  days_completed: number;
  days_total: number;
  level: {
    level: number;
    name: string;
    min_points: number;
    perk: string | null;
  };
  next_level: { level: number; name: string; min_points: number } | null;
  points_to_next: number;
}

export function Home() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [rooms, setRooms] = useState<EqubRoom[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isQaTestMode()) {
      setRooms(MOCK_EQUB_ROOMS as unknown as EqubRoom[]);
      setProfile({
        total_points: 15400,
        streak: 7,
        days_completed: 22,
        days_total: 30,
        level: { level: 12, name: "Gold", min_points: 10000, perk: "5% bonus" },
        next_level: { level: 13, name: "Platinum", min_points: 20000 },
        points_to_next: 4600,
      });
      return;
    }
    api<ProfileSummary>("/api/gamification/profile").then((res) => {
      if (res.data) setProfile(res.data);
    });
    api<EqubRoom[]>("/api/equb-rooms").then((res) => {
      if (res.data) setRooms(res.data);
    });
  }, []);

  if (loading) return <Loading />;

  const potentialPayout = rooms.reduce(
    (sum, r) => sum + r.stake_amount * r.max_members,
    0,
  );

  const progressPct = profile?.next_level
    ? Math.min(
        100,
        ((profile.total_points - profile.level.min_points) /
          (profile.next_level.min_points - profile.level.min_points)) *
          100,
      )
    : 0;

  const streak = profile?.streak ?? 0;
  const daysCompleted = profile?.days_completed ?? 0;
  const daysTotal = profile?.days_total ?? 0;

  const circ = 2 * Math.PI * 80;

  const isTelegramApp = Boolean(window.Telegram?.WebApp?.initData);
  const isDemo = !user && !isTelegramApp;

  return (
    <div className="bg-background text-on-surface font-body pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-xl flex justify-between items-center px-5 h-16">
        <h1 className="text-xl font-headline font-bold tracking-tight text-primary-container">
          FitEqub
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-secondary-container/15 px-2.5 py-1 rounded-full">
            <span className="text-sm">&#x1F525;</span>
            <span className="text-sm font-bold text-secondary-container">
              {streak}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-all relative"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              notifications
            </span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
          </button>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* Demo banner */}
      {isDemo && (
        <div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-secondary-container/12 border border-secondary-container/30">
          <p className="text-xs text-secondary-container font-medium">
            Demo Mode — Sign in via Telegram to see your real data
          </p>
        </div>
      )}

      {/* Tagline */}
      <div className="px-5 pt-6 pb-2">
        <p className="text-on-surface-variant text-sm font-body">
          {user
            ? `Welcome, ${user.full_name}`
            : isTelegramApp
              ? `Welcome, ${(window.Telegram?.WebApp?.initDataUnsafe?.user as { first_name?: string } | undefined)?.first_name ?? "Champion"}`
              : "Stake. Sweat. Split the pot."}
        </p>
      </div>

      {/* Progress Ring Section */}
      <div className="mx-5 mt-4 bg-surface-container-low rounded-lg p-6 text-center">
        {/* Payout label */}
        <p className="font-label text-2xs uppercase tracking-[0.2em] text-on-surface-variant mb-4">
          Your Progress
        </p>

        {/* SVG Ring */}
        <div className="flex justify-center">
          <div className="relative w-[200px] h-[200px] drop-shadow-[0_0_20px_rgba(63,229,108,0.5)]">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                className="stroke-surface-container-highest"
                strokeWidth="8"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                className="stroke-primary"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(progressPct / 100) * circ} ${circ}`}
              />
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline text-4xl font-extrabold text-white">
                {potentialPayout.toLocaleString()}
                <span className="font-label text-sm text-primary font-bold ml-1">
                  ETB
                </span>
              </span>
              <span className="font-label text-xs text-secondary-container mt-1">
                Potential Payout
              </span>
              <span className="font-label text-2xs text-on-surface-variant mt-1.5">
                {daysTotal > 0
                  ? `${daysCompleted}/${daysTotal} days completed`
                  : "No active equbs"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verify Workout CTA */}
      <div className="px-5 pt-5">
        <button
          type="button"
          onClick={() => navigate("/verify")}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-base active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg"
        >
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          Verify Today's Workout
        </button>
      </div>

      {/* AI Coach Quick Action */}
      <div className="px-5 pt-3">
        <button
          type="button"
          onClick={() => navigate("/coach")}
          className="w-full py-3 rounded-2xl bg-surface-container-low border border-primary/20 text-primary font-headline font-bold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          AI Coach
        </button>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 gap-5 px-5 pt-5">
        <FeatureCard
          title="Equb Rooms"
          subtitle={`${rooms.length} rooms available`}
          badgeText={
            rooms.length > 0 ? `${rooms.length} Active` : "No Active Rooms"
          }
          badgeGreen={rooms.length > 0}
          icon="groups"
          progress={rooms.length > 0 ? Math.min(100, rooms.length * 10) : 0}
          onClick={() => navigate("/equbs")}
        />
        <FeatureCard
          title="Gym Day Passes"
          subtitle="Discounted single-visit passes"
          badgeText="Browse Gyms"
          badgeGreen={false}
          icon="fitness_center"
          progress={0}
          onClick={() => navigate("/gyms")}
        />
        <FeatureCard
          title="Coach Day Pass"
          subtitle="Book a session with a personal trainer"
          badgeText="Browse Coaches"
          badgeGreen={false}
          icon="sports_martial_arts"
          progress={0}
          onClick={() => navigate("/coaches")}
        />
        <FeatureCard
          title="Step Challenge"
          subtitle="Compete on the city leaderboard"
          badgeText="View Challenges"
          badgeGreen={false}
          icon="directions_walk"
          progress={0}
          variant="challenge"
          onClick={() => navigate("/challenges")}
        />
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-3 gap-3 px-5 pt-5">
        <button
          type="button"
          onClick={() => navigate("/coach")}
          className="flex flex-col items-center gap-2 bg-surface-container-low p-4 rounded-lg active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
          </div>
          <div className="text-center">
            <p className="font-headline text-xs font-bold text-on-surface">
              AI Coach
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate("/duel")}
          className="flex flex-col items-center gap-2 bg-surface-container-low p-4 rounded-lg active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-lg bg-secondary-container/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-secondary-container">
              bolt
            </span>
          </div>
          <div className="text-center">
            <p className="font-headline text-xs font-bold text-on-surface">
              1v1 Duel
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate("/how-it-works")}
          className="flex flex-col items-center gap-2 bg-surface-container-low p-4 rounded-lg active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-on-surface-variant">
              help
            </span>
          </div>
          <div className="text-center">
            <p className="font-headline text-xs font-bold text-on-surface">
              How To
            </p>
          </div>
        </button>
      </div>

      {/* Create Equb FAB */}
      <button
        type="button"
        onClick={() => navigate("/equbs/create")}
        className="fixed bottom-32 right-6 w-16 h-16 bg-primary text-on-primary-container rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-40 active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
}

function FeatureCard({
  title,
  subtitle,
  badgeText,
  badgeGreen,
  icon,
  progress,
  variant,
  onClick,
}: {
  title: string;
  subtitle: string;
  badgeText: string;
  badgeGreen: boolean;
  icon: string;
  progress: number;
  variant?: "challenge";
  onClick: () => void;
}) {
  const isChallenge = variant === "challenge";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg p-6 relative overflow-hidden transition-transform active:scale-[0.98] ${
        isChallenge
          ? "bg-surface-container border-l-4 border-primary/30"
          : "bg-surface-container-low"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-primary">
              {icon}
            </span>
          </div>
          <div>
            <h3 className="font-headline text-xl text-white">{title}</h3>
            <p className="text-on-surface-variant text-sm font-body mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Badge */}
        <span
          className={`font-label text-2xs font-bold px-3 py-1 rounded-full shrink-0 ${
            badgeGreen
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-surface-container-highest text-on-surface-variant"
          }`}
        >
          {badgeText}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(63,229,108,0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="font-label text-xs text-primary font-bold uppercase tracking-wider mt-2">
          {progress}% Complete
        </p>
      </div>
    </button>
  );
}
