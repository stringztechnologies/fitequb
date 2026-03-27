import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

type StakeTier = "starter" | "regular" | "elite";
type RoomType = "public" | "private";

const STAKE_OPTIONS: {
  id: StakeTier;
  label: string;
  range: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "starter",
    label: "Starter",
    range: "100–500 ETB",
    description: "Low risk, easy entry",
    icon: "savings",
  },
  {
    id: "regular",
    label: "Regular",
    range: "500–2,000 ETB",
    description: "Standard challenge",
    icon: "account_balance",
  },
  {
    id: "elite",
    label: "Elite",
    range: "2,000+ ETB",
    description: "High stakes, big rewards",
    icon: "diamond",
  },
];

const DIFFICULTY_OPTIONS: { id: StakeTier; label: string }[] = [
  { id: "starter", label: "5k Steps" },
  { id: "regular", label: "10k Steps" },
  { id: "elite", label: "15k Steps" },
];

export function QuickJoin() {
  const navigate = useNavigate();
  const [stake, setStake] = useState<StakeTier>("regular");
  const [difficulty, setDifficulty] = useState<StakeTier>("regular");
  const [roomType, setRoomType] = useState<RoomType>("public");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;

    async function findRoom() {
      const res = await api<{ room: { id: string }; member_count: number }>(
        "/api/equb-rooms/quick-join",
        { method: "POST", body: JSON.stringify({ tier: stake }) },
      );

      if (cancelled) return;

      if (res.error || !res.data) {
        setSearchError(res.error ?? "No rooms found");
        setSearching(false);
        return;
      }

      navigate(`/equbs/${res.data.room.id}`);
    }

    findRoom();
    return () => {
      cancelled = true;
    };
  }, [searching, stake, navigate]);

  const selectedStake = STAKE_OPTIONS.find((s) => s.id === stake);
  const selectedDifficulty = DIFFICULTY_OPTIONS.find(
    (d) => d.id === difficulty,
  );

  return (
    <div className="bg-background text-on-surface font-body min-h-screen pb-40">
      {/* Fixed Header */}
      <header className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl flex items-center gap-3 px-5 h-14">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low active:bg-surface-container"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-on-surface text-xl">
            arrow_back
          </span>
        </button>
        <h1 className="font-headline font-bold text-xl text-primary-container">
          Quick Join
        </h1>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Stake Preference */}
      <section className="px-5 pt-6">
        <h2 className="font-headline font-semibold text-base text-on-surface mb-1">
          Stake Preference
        </h2>
        <p className="text-on-surface-variant text-sm font-body mb-4">
          How much are you willing to put on the line?
        </p>

        <div className="flex flex-col gap-3">
          {STAKE_OPTIONS.map((option) => {
            const selected = stake === option.id;
            return (
              <button
                type="button"
                key={option.id}
                onClick={() => setStake(option.id)}
                className={`relative flex items-center gap-4 p-4 rounded-card text-left transition-all ${
                  selected
                    ? "border border-primary/50 bg-primary/5 neon-glow"
                    : "bg-surface-container-low border border-outline-variant/10"
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                    selected ? "bg-primary/15" : "bg-surface-container"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${
                      selected ? "text-primary" : "text-on-surface-variant"
                    }`}
                  >
                    {option.icon}
                  </span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-headline font-bold text-on-surface">
                      {option.label}
                    </span>
                    <span
                      className={`font-label text-sm font-semibold ${
                        selected ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {option.range}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-xs mt-0.5">
                    {option.description}
                  </p>
                </div>

                {/* Check */}
                <div className="shrink-0">
                  <span
                    className={`material-symbols-outlined text-xl ${
                      selected ? "text-primary" : "text-outline-variant"
                    }`}
                    style={
                      selected
                        ? {
                            fontVariationSettings: "'FILL' 1",
                          }
                        : undefined
                    }
                  >
                    {selected ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Difficulty Tier */}
      <section className="px-5 pt-8">
        <h2 className="font-headline font-semibold text-base text-on-surface mb-1">
          Difficulty Tier
        </h2>
        <p className="text-on-surface-variant text-sm font-body mb-4">
          Daily step goal to stay in the game
        </p>

        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map((option) => {
            const selected = difficulty === option.id;
            return (
              <button
                type="button"
                key={option.id}
                onClick={() => setDifficulty(option.id)}
                className={`flex-1 py-2.5 px-3 rounded-full text-sm font-label font-semibold transition-all ${
                  selected
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Room Type Toggle */}
      <section className="px-5 pt-8">
        <h2 className="font-headline font-semibold text-base text-on-surface mb-1">
          Room Type
        </h2>
        <p className="text-on-surface-variant text-sm font-body mb-4">
          Join anyone or keep it within your circle
        </p>

        <div className="flex bg-surface-container-low rounded-full p-1 border border-outline-variant/10">
          {(["public", "private"] as const).map((type) => {
            const selected = roomType === type;
            const icon = type === "public" ? "public" : "lock";
            const label = type === "public" ? "Public" : "Private";
            return (
              <button
                type="button"
                key={type}
                onClick={() => setRoomType(type)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-label font-semibold transition-all ${
                  selected
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-on-surface-variant border border-transparent"
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {icon}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Error message */}
      {searchError && (
        <div className="px-5 pb-4">
          <div className="bg-error/10 border border-error/30 rounded-lg p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-xl shrink-0">
              error
            </span>
            <div className="flex-1">
              <p className="text-error text-sm font-medium">{searchError}</p>
            </div>
            <button
              type="button"
              onClick={() => setSearchError(null)}
              className="text-error/60"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Fixed CTA Button */}
      <div className="fixed bottom-16 left-0 right-0 px-5 pb-4 pt-3 bg-gradient-to-t from-background via-background to-transparent z-40">
        <button
          type="button"
          onClick={() => {
            setSearchError(null);
            setSearching(true);
          }}
          className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-5 rounded-full font-headline font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-glow"
        >
          <span className="material-symbols-outlined text-xl">search</span>
          Find Me a Room
        </button>
      </div>

      {/* Matching Animation Overlay */}
      {searching && (
        <div className="fixed inset-0 z-[100] bg-background/95 flex flex-col items-center justify-center gap-6">
          {/* Pulsing circle */}
          <div className="relative flex items-center justify-center">
            {/* Outer pulse ring */}
            <div className="absolute w-40 h-40 rounded-full bg-primary/10 animate-ping" />
            {/* Main circle */}
            <div className="w-32 h-32 rounded-full bg-primary/20 animate-pulse flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-primary">
                search
              </span>
            </div>
          </div>

          {/* Text */}
          <div className="text-center mt-4 px-8">
            <p className="font-headline text-xl text-on-surface font-bold">
              Finding your perfect room...
            </p>
            <p className="text-on-surface-variant text-sm font-body mt-3">
              {selectedStake?.label} stake
              {" / "}
              {selectedDifficulty?.label}
              {" / "}
              {roomType === "public" ? "Public" : "Private"} room
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
