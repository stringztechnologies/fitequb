import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export function DuelChallenge() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [stakeAmount, setStakeAmount] = useState(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateDuel() {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);

    const res = await api<{ duel_id: string; invite_code: string; invite_link: string }>(
      "/api/duels/create",
      {
        method: "POST",
        body: JSON.stringify({
          opponent_username: username.trim().replace(/^@/, ""),
          stake_amount: stakeAmount,
          duration_days: 7,
          daily_target: 10000,
        }),
      },
    );

    setLoading(false);

    if (res.error || !res.data) {
      setError(res.error ?? "Failed to create duel");
      return;
    }

    // Share the invite link
    const { invite_link } = res.data;
    const text = `I'm challenging you to a 1v1 Duel on FitEqub! ${stakeAmount} ETB each, 10k steps/day for 7 days. Winner takes all. Accept here:`;

    if (navigator.share) {
      navigator.share({ title: "FitEqub Duel Challenge", text, url: invite_link }).catch(() => {});
    } else if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(invite_link)}&text=${encodeURIComponent(text)}`,
      );
    } else {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(invite_link)}&text=${encodeURIComponent(text)}`,
        "_blank",
      );
    }

    navigate(`/equbs/${res.data.duel_id}`);
  }

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

      <div className="h-16" />

      {/* VS Hero Section */}
      <section className="relative flex flex-col items-center pt-10 pb-6 px-5">
        <div className="absolute w-40 h-40 bg-primary/10 rounded-full blur-3xl top-6 left-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center">
              <span className="font-headline text-2xl font-bold text-primary">Y</span>
            </div>
            <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">You</span>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute w-16 h-16 bg-primary/15 rounded-full blur-2xl pointer-events-none" />
            <span className="font-headline text-4xl font-black text-on-surface relative z-10">VS</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-secondary-container/20 border-2 border-secondary-container/30 flex items-center justify-center">
              <span className="font-headline text-2xl font-bold text-secondary-container">?</span>
            </div>
            <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Opponent</span>
          </div>
        </div>
      </section>

      {/* Stake Selection */}
      <section className="px-5 pb-6">
        <p className="font-label text-xs text-on-surface-variant uppercase tracking-wider mb-3">Stake Amount</p>
        <div className="flex gap-2">
          {[0, 250, 500, 1000].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setStakeAmount(amount)}
              className={`flex-1 py-2.5 rounded-full text-sm font-label font-semibold transition-all ${
                stakeAmount === amount
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {amount === 0 ? "Free" : `${amount}`}
            </button>
          ))}
        </div>
        <p className="text-center mt-2 font-headline text-lg font-bold text-secondary-container">
          {stakeAmount === 0 ? "Free — bragging rights only" : `${stakeAmount} ETB each / ${stakeAmount * 2} ETB total`}
        </p>
      </section>

      {/* Challenge Details Card */}
      <section className="px-5 pb-6">
        <div className="bg-surface-container-low rounded-lg p-5">
          <div className="grid gap-4">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-xl">schedule</span>
              <div className="flex-1">
                <p className="font-label text-xs text-on-surface-variant uppercase tracking-wider">Duration</p>
                <p className="font-label text-sm text-on-surface font-medium">7 Days</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant text-xl">directions_run</span>
              <div className="flex-1">
                <p className="font-label text-xs text-on-surface-variant uppercase tracking-wider">Requirement</p>
                <p className="font-label text-sm text-on-surface font-medium">10,000 steps/day</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Invite Section */}
      <section className="px-5 pb-6">
        <label htmlFor="telegram-username" className="font-label text-xs text-on-surface-variant uppercase tracking-wider block mb-2">
          Invite by Telegram username
        </label>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-label text-sm text-on-surface-variant">@</span>
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
      </section>

      {/* Error */}
      {error && (
        <div className="px-5 pb-4">
          <div className="bg-error/10 border border-error/30 rounded-lg p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-lg">error</span>
            <p className="text-error text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-16 left-0 right-0 z-40 px-5 pb-4 pt-6 bg-gradient-to-t from-background via-background/95 to-transparent">
        <button
          type="button"
          onClick={handleCreateDuel}
          disabled={!username.trim() || loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary py-5 rounded-full font-headline font-bold text-base shadow-glow active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          {loading ? (
            <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-xl">bolt</span>
          )}
          {loading ? "Creating Duel..." : "Challenge a Friend"}
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
