import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

interface ProfileData {
  total_points: number;
  referral_code: string;
  badges: { id: string; name: string; icon: string; earned: boolean }[];
}

interface PointEntry {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

const BADGE_ICON_MAP: Record<string, string> = {
  "Early Bird": "wb_sunny",
  "100k Steps": "workspace_premium",
  Marathoner: "directions_run",
  "Team Player": "groups",
  "Iron Will": "fitness_center",
  Champion: "military_tech",
};

const DEMO_BADGES = [
  { id: "1", name: "Early Bird", icon: "wb_sunny", earned: true },
  { id: "2", name: "100k Steps", icon: "workspace_premium", earned: true },
  { id: "3", name: "Marathoner", icon: "directions_run", earned: true },
  { id: "4", name: "Team Player", icon: "groups", earned: true },
  { id: "5", name: "Iron Will", icon: "fitness_center", earned: false },
  { id: "6", name: "Champion", icon: "military_tech", earned: false },
];

const DEMO_EARNINGS = [
  {
    id: "1",
    reason: "Oct 15, 2023 - Equb Payout",
    points: 3200,
    created_at: "2023-10-15",
  },
  {
    id: "2",
    reason: "Sep 10, 2023 - Step Challenge",
    points: 850,
    created_at: "2023-09-10",
  },
  {
    id: "3",
    reason: "Aug 28, 2023 - Equb Payout",
    points: 2900,
    created_at: "2023-08-28",
  },
  {
    id: "4",
    reason: "Aug 5, 2023 - Early Goal Bonus",
    points: 500,
    created_at: "2023-08-05",
  },
];

export function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api<ProfileData>("/api/gamification/profile"),
      api<PointEntry[]>("/api/gamification/points"),
    ])
      .then(([p, e]) => {
        if (p.data) setProfile(p.data);
        if (e.data) setPoints(e.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (authLoading || loading) return <Loading />;

  // Use demo data if not authenticated
  const name = user?.full_name ?? "Abebe Kebede";
  const initial = name.charAt(0).toUpperCase();
  const totalEarned = profile?.total_points ?? 15400;
  const totalSteps = 2543000;
  const badges = profile?.badges ?? DEMO_BADGES;
  const earnings = points.length > 0 ? points : DEMO_EARNINGS;

  return (
    <div className="bg-background text-on-surface font-body min-h-screen pb-32 px-4 pt-5 relative">
      {/* Settings button — navigates to notifications as settings placeholder */}
      <button
        type="button"
        onClick={() => navigate("/notifications")}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/20 active:scale-95 transition-transform"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-on-surface-variant text-xl">
          notifications
        </span>
      </button>

      {/* Profile hero */}
      <div className="flex flex-col items-center mb-8 pt-4">
        {/* Avatar with gradient ring */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary via-primary-container to-secondary shadow-[0_0_30px_rgba(63,229,108,0.3)]">
            <div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center">
              <span className="font-headline text-5xl font-bold text-on-surface">
                {initial}
              </span>
            </div>
          </div>
          {/* Level badge */}
          <span className="absolute -bottom-1 -right-1 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-label font-bold">
            LVL 12
          </span>
        </div>

        <h1 className="font-headline text-3xl font-extrabold tracking-tight mt-4">
          {name}
        </h1>
        <p className="font-label text-primary font-medium tracking-widest text-xs uppercase mt-1">
          Fitness Champion
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Lifetime Earned */}
        <div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-base">
              payments
            </span>
            <span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
              Lifetime Earned
            </span>
          </div>
          <div className="text-primary font-headline text-3xl">
            ETB {totalEarned.toLocaleString()}
          </div>
        </div>

        {/* Lifetime Steps */}
        <div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-base">
              footprint
            </span>
            <span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
              Lifetime Steps
            </span>
          </div>
          <div className="text-primary font-headline text-3xl">
            {totalSteps.toLocaleString()}
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-base">
              bolt
            </span>
            <span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
              Current Streak
            </span>
          </div>
          <div className="text-primary font-headline text-3xl">7 days</div>
        </div>

        {/* Badges Earned */}
        <div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-base">
              stars
            </span>
            <span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
              Badges Earned
            </span>
          </div>
          <div className="text-primary font-headline text-3xl">
            {badges.filter((b) => b.earned).length}/{badges.length}
          </div>
        </div>
      </div>

      {/* Fitness Achievements */}
      <div className="mb-8">
        <h2 className="font-headline text-xl font-bold tracking-tight mb-4">
          Fitness Achievements
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {badges.map((b) => {
            const iconName = BADGE_ICON_MAP[b.name] ?? b.icon;
            return (
              <div key={b.id} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                    b.earned
                      ? "bg-primary/10 border-primary/30"
                      : "bg-surface-container border-outline-variant/20 opacity-40"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${
                      b.earned ? "text-primary" : "text-on-surface-variant"
                    }`}
                  >
                    {b.earned ? iconName : "lock"}
                  </span>
                </div>
                <span className="font-label text-[8px] uppercase tracking-tighter text-on-surface-variant text-center leading-tight">
                  {b.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Earning History */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-xl font-bold tracking-tight">
            Earning History
          </h2>
          <button
            type="button"
            className="font-label text-xs text-primary font-medium uppercase tracking-wider"
          >
            View All
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {earnings.map((e) => (
            <div
              key={e.id}
              className="bg-surface-container p-4 rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">
                    account_balance_wallet
                  </span>
                </div>
                <div>
                  <p className="text-sm text-on-surface font-medium">
                    {e.reason}
                  </p>
                  <p className="font-label text-[10px] text-on-surface-variant uppercase mt-0.5">
                    {new Date(e.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <span className="font-headline text-primary text-sm font-bold">
                +ETB {e.points.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Section */}
      <div className="mb-8">
        <h2 className="font-headline text-xl font-bold tracking-tight mb-4">
          Invite Friends
        </h2>
        <div className="bg-surface-container-low rounded-lg p-5 border border-primary/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                group_add
              </span>
            </div>
            <div>
              <p className="font-headline text-sm font-bold text-on-surface">
                Earn 100 ETB per referral
              </p>
              <p className="text-on-surface-variant text-xs mt-0.5">
                When your friend completes their first Equb
              </p>
            </div>
          </div>

          {/* Referral Code */}
          <div className="bg-background/50 rounded-lg p-4 flex items-center justify-between mb-3">
            <div>
              <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
                Your Referral Code
              </p>
              <p className="font-headline text-lg font-bold text-primary mt-0.5">
                {profile?.referral_code ?? "FITEQUB-AK12"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const code = profile?.referral_code ?? "FITEQUB-AK12";
                navigator.clipboard?.writeText(code).catch(() => {});
              }}
              className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-primary text-lg">
                content_copy
              </span>
            </button>
          </div>

          {/* Referral Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="font-headline text-xl font-bold text-on-surface">
                5
              </p>
              <p className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest">
                Invited
              </p>
            </div>
            <div className="text-center">
              <p className="font-headline text-xl font-bold text-primary">3</p>
              <p className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest">
                Joined
              </p>
            </div>
            <div className="text-center">
              <p className="font-headline text-xl font-bold text-secondary-container">
                300
              </p>
              <p className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest">
                ETB Earned
              </p>
            </div>
          </div>

          {/* Share Button */}
          <button
            type="button"
            onClick={() => {
              const code = profile?.referral_code ?? "FITEQUB-AK12";
              const text = `Join FitEqub! Stake money on your fitness goals and win real ETB. Use my referral code: ${code}\nhttps://t.me/fitequb_bot?start=REF-${code}`;
              if (navigator.share) {
                navigator
                  .share({ title: "Join FitEqub!", text })
                  .catch(() => {});
              } else {
                window.open(
                  `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/fitequb_bot?start=REF-${code}`)}&text=${encodeURIComponent(text)}`,
                  "_blank",
                );
              }
            }}
            className="mt-4 w-full py-3 rounded-full border-2 border-primary text-primary font-headline font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <span className="material-symbols-outlined text-lg">share</span>
            Share Invite Link
          </button>
        </div>
      </div>

      {/* Sync Fitness Data CTA */}
      <button
        type="button"
        onClick={() => navigate("/sync")}
        className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-5 rounded-full font-headline font-bold text-lg shadow-glow-strong active:scale-[0.98] transition-transform"
      >
        <span className="flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-xl">sync</span>
          Sync Fitness Data
        </span>
      </button>
      <p className="text-center mt-2 font-label text-[10px] text-on-surface-variant uppercase tracking-wider">
        Last synced: 2 hours ago
      </p>
    </div>
  );
}
