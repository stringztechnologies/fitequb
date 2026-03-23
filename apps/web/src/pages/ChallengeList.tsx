import type { Challenge } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.js";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";
import { isQaTestMode, MOCK_CHALLENGES, MOCK_LEADERBOARD } from "../lib/testMode.js";

interface LeaderboardEntry {
  name: string;
  steps: number;
  etb: number;
}

export function ChallengeList() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (isQaTestMode()) {
      setChallenges(MOCK_CHALLENGES as unknown as Challenge[]);
      setLeaders(MOCK_LEADERBOARD);
      setLoading(false);
      return;
    }
    Promise.all([
      api<Challenge[]>("/api/challenges"),
      api<LeaderboardEntry[]>("/api/gamification/leaderboard"),
    ])
      .then(([cRes, lRes]) => {
        if (cRes.data) setChallenges(cRes.data);
        if (lRes.data) setLeaders(lRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const hasChallenges = challenges.length > 0;
  const hasLeaders = leaders.length >= 3;

  return (
    <div className="bg-surface min-h-screen pb-24 px-4 pt-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span
          className="material-symbols-outlined text-secondary-container text-2xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          emoji_events
        </span>
        <h1 className="font-headline font-bold text-xl tracking-tight text-on-surface">
          Challenges
        </h1>
      </div>

      {/* Free entry callout */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <span
            className="material-symbols-outlined text-primary text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            redeem
          </span>
        </div>
        <div>
          <p className="font-headline text-sm font-bold text-primary">
            FREE to Join
          </p>
          <p className="text-on-surface-variant text-xs">
            No stake required. Walk, earn, win real ETB prizes.
          </p>
        </div>
      </div>

      {/* Available Challenges */}
      <div className="mb-6">
        <h2 className="font-headline font-bold text-base text-on-surface mb-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-lg">
            bolt
          </span>
          Available Challenges
        </h2>
        {hasChallenges ? (
          <div className="flex flex-col gap-3">
            {challenges.map((ch) => (
              <ChallengeCard
                key={ch.id}
                challenge={ch}
                onJoin={() => navigate(`/challenges/${ch.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="emoji_events"
            title="No challenges yet"
            subtitle="Step challenges will appear here soon"
          />
        )}
      </div>

      {/* Leaderboard — only show if we have data */}
      {hasLeaders && (
        <>
          {/* Leaderboard divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-outline-variant/20" />
            <h2 className="font-headline font-bold text-base text-on-surface flex items-center gap-1.5 shrink-0">
              <span
                className="material-symbols-outlined text-secondary-container text-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                leaderboard
              </span>
              Weekly Leaderboard
            </h2>
            <div className="flex-1 h-px bg-outline-variant/20" />
          </div>

          {/* Podium */}
          <div className="flex items-end justify-center gap-3 mb-6 pt-4">
            {leaders[1] && (
              <PodiumCard
                name={leaders[1].name}
                steps={leaders[1].steps.toLocaleString()}
                etb={leaders[1].etb.toLocaleString()}
                rank={2}
              />
            )}
            {leaders[0] && (
              <PodiumCard
                name={leaders[0].name}
                steps={leaders[0].steps.toLocaleString()}
                etb={leaders[0].etb.toLocaleString()}
                rank={1}
                crown
              />
            )}
            {leaders[2] && (
              <PodiumCard
                name={leaders[2].name}
                steps={leaders[2].steps.toLocaleString()}
                etb={leaders[2].etb.toLocaleString()}
                rank={3}
              />
            )}
          </div>

          {/* Leaderboard List (4th+) */}
          {leaders.length > 3 && (
            <div className="flex flex-col gap-2 mb-6">
              {leaders.slice(3).map((l, i) => (
                <div
                  key={l.name}
                  className="bg-surface-container-low rounded-xl p-4 flex items-center gap-4"
                >
                  <span className="font-label text-sm text-on-surface-variant w-4 text-center">
                    {i + 4}
                  </span>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-surface-container-highest">
                    <span className="font-body font-bold text-sm text-on-surface">
                      {l.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-bold text-sm text-on-surface truncate">
                      {l.name}
                    </p>
                    <p className="font-label text-[10px] text-on-surface-variant">
                      {l.steps.toLocaleString()} steps
                    </p>
                  </div>
                  <span className="font-label font-bold text-primary text-xs whitespace-nowrap">
                    {l.etb.toLocaleString()} ETB
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CTA Button */}
      {hasChallenges && (
        <button
          type="button"
          onClick={() => navigate(`/challenges/${challenges[0]?.id}`)}
          className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-4 rounded-full font-body font-bold text-sm tracking-wide shadow-[0_10px_30px_rgba(0,200,83,0.3)] active:scale-[0.98] transition-transform"
        >
          UPDATE MY STEPS
        </button>
      )}
    </div>
  );
}

function ChallengeCard({
  challenge,
  onJoin,
}: {
  challenge: Challenge;
  onJoin: () => void;
}) {
  const ch = challenge as Challenge & {
    target_steps?: number;
    reward_desc?: string;
    sponsor_name?: string;
    is_active?: boolean;
  };

  const daysLeft = ch.end_date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(ch.end_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  return (
    <div className="bg-surface-container-low rounded-lg p-5 border border-outline-variant/10">
      <div className="flex items-start gap-3.5">
        {/* Icon */}
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-primary/15 text-primary">
          <span className="material-symbols-outlined text-xl">hiking</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-headline text-base font-bold text-on-surface truncate">
              {ch.name}
            </h3>
            {ch.sponsor_name && (
              <span className="bg-secondary-container/10 text-secondary-container font-label text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                <span
                  className="material-symbols-outlined text-[10px]"
                  style={{
                    fontVariationSettings: "'FILL' 1",
                    fontSize: "10px",
                  }}
                >
                  verified
                </span>
                {ch.sponsor_name}
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-xs mb-3">
            {ch.description}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3">
            {ch.target_steps && (
              <span className="flex items-center gap-1 text-on-surface-variant font-label text-[10px]">
                <span className="material-symbols-outlined text-xs">flag</span>
                {ch.target_steps.toLocaleString()} steps
              </span>
            )}
            {(ch.reward_desc || ch.reward_description) && (
              <span className="flex items-center gap-1 text-on-surface-variant font-label text-[10px]">
                <span
                  className="material-symbols-outlined text-xs text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  card_giftcard
                </span>
                {ch.reward_desc || ch.reward_description}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {daysLeft > 0 && (
                <span className="flex items-center gap-1 text-on-surface-variant font-label text-[10px]">
                  <span className="material-symbols-outlined text-xs">
                    schedule
                  </span>
                  {daysLeft}d left
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onJoin}
              className="border border-primary text-primary rounded-full px-4 py-2 font-label text-xs font-bold active:scale-[0.97] transition-transform"
            >
              Join Challenge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PodiumCard({
  name,
  steps,
  etb,
  rank,
  crown,
}: {
  name: string;
  steps: string;
  etb: string;
  rank: number;
  crown?: boolean;
}) {
  const heightClass =
    rank === 1 ? "h-[180px]" : rank === 2 ? "h-[140px]" : "h-[110px]";
  const avatarSize =
    rank === 1 ? "w-16 h-16" : rank === 2 ? "w-14 h-14" : "w-12 h-12";
  const avatarTextSize = rank === 1 ? "text-xl" : "text-lg";
  const rankBg =
    rank === 1
      ? "bg-secondary-container text-on-secondary-container"
      : "bg-surface-container-highest text-on-surface";
  const borderGradient =
    rank === 1
      ? "from-secondary-container to-secondary-container/60"
      : rank === 2
        ? "from-on-surface-variant to-on-surface-variant/40"
        : "from-[#CD7F32] to-[#CD7F32]/40";
  const prizeColor = rank === 1 ? "text-secondary-container" : "text-primary";

  return (
    <div
      className={`flex flex-col items-center ${rank === 1 ? "w-[120px] -mt-4" : "w-[100px]"}`}
    >
      {/* Avatar with gradient border */}
      <div className="relative mb-2">
        {crown && (
          <span
            className="material-symbols-outlined absolute -top-5 left-1/2 -translate-x-1/2 text-secondary-container text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            workspace_premium
          </span>
        )}
        <div
          className={`${avatarSize} rounded-full p-[3px] bg-gradient-to-b ${borderGradient}`}
        >
          <div className="w-full h-full rounded-full bg-surface-container-low flex items-center justify-center">
            <span
              className={`font-headline font-bold ${avatarTextSize} text-on-surface`}
            >
              {name.charAt(0)}
            </span>
          </div>
        </div>
        {/* Rank badge */}
        <div
          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${rankBg} text-[10px] font-bold font-label ring-2 ring-surface`}
        >
          {rank}
        </div>
      </div>

      {/* Name */}
      <p className="font-body font-bold text-xs text-on-surface text-center mt-1">
        {name}
      </p>

      {/* Steps */}
      <p className="font-label text-[10px] text-primary mt-0.5">
        {steps} steps
      </p>

      {/* Prize */}
      <p className={`font-headline ${prizeColor} font-bold text-xs mt-0.5`}>
        {etb} ETB
      </p>

      {/* Pedestal */}
      <div
        className={`w-full ${heightClass} rounded-t-xl bg-gradient-to-b from-surface-container-low to-surface-container-lowest mt-2 flex items-start justify-center pt-3 border border-b-0 border-secondary-container/10`}
      >
        <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
          {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}
        </span>
      </div>
    </div>
  );
}
