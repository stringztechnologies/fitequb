import type { PartnerGym } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState.js";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

const FILTERS = ["Near Me", "Top Rated", "Cheapest"] as const;

export function GymList() {
  const [gyms, setGyms] = useState<PartnerGym[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Near Me");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api<PartnerGym[]>("/api/gyms")
      .then((res) => {
        if (res.data) setGyms(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const q = search.toLowerCase();

  const filteredGyms = gyms
    .filter(
      (g) =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.location.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      if (filter === "Cheapest") return a.app_day_pass - b.app_day_pass;
      if (filter === "Top Rated") return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="bg-surface pb-24 min-h-screen">
      {/* Title */}
      <div className="px-5 pt-10 pb-2">
        <h1 className="text-3xl font-headline font-extrabold text-on-surface">
          Gym Day
          <br />
          <span className="text-primary-fixed">Passes</span>
        </h1>
      </div>

      {/* Search bar */}
      <div className="mx-5 mb-4 flex items-center gap-3 bg-surface-container border border-outline-variant rounded-full px-4 py-3">
        <span className="material-symbols-rounded text-on-surface-variant text-lg shrink-0">
          search
        </span>
        <input
          type="text"
          placeholder="Search gyms, locations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-on-surface font-body text-sm placeholder:text-on-surface-variant"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-3 overflow-x-auto pb-6 px-5 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? "px-5 py-2 bg-primary-container text-on-primary-container font-label font-bold rounded-full shadow-[0_4px_15px_rgba(0,200,83,0.3)] shrink-0 transition-all"
                : "px-5 py-2 bg-surface-container text-on-surface-variant font-label font-bold rounded-full shrink-0 transition-all"
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Equb Eligible explainer */}
      <p className="text-xs font-body text-on-surface-variant px-5 pb-4">
        <span className="text-primary font-bold">Equb Eligible</span> =
        Check-ins count toward your Equb workout target
      </p>

      {/* Gym cards */}
      <div className="px-5 flex flex-col gap-5">
        {filteredGyms.length > 0 ? (
          filteredGyms.map((g) => <RealGymCard key={g.id} gym={g} />)
        ) : (
          <EmptyState
            icon="fitness_center"
            title="No gyms available"
            subtitle="Partner gyms will appear here soon"
          />
        )}
      </div>
    </div>
  );
}

function RealGymCard({ gym }: { gym: PartnerGym }) {
  const [buying, setBuying] = useState(false);
  async function handleBuy() {
    setBuying(true);
    const res = await api<{ checkout_url: string }>("/api/gyms/day-passes", {
      method: "POST",
      body: JSON.stringify({ gym_id: gym.id }),
    });
    setBuying(false);
    if (res.data?.checkout_url) window.open(res.data.checkout_url, "_blank");
  }
  return (
    <div className="rounded-lg overflow-hidden bg-surface-container-low border border-outline-variant/10">
      <div className="p-5">
        {/* Top section: gym info */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-primary text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                fitness_center
              </span>
            </div>
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface">
                {gym.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-on-surface-variant text-xs">
                  location_on
                </span>
                <span className="text-xs font-body text-on-surface-variant">
                  {gym.location}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rating row */}
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center gap-1 text-secondary-container font-label text-xs">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            Partner Gym
          </span>
          <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-label text-2xs font-bold flex items-center gap-1">
            <span
              className="material-symbols-outlined text-xs"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              eco
            </span>
            Equb Eligible
          </span>
        </div>

        {/* Price + Buy button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-label text-2xs text-on-surface-variant uppercase tracking-widest">
              Day Pass
            </p>
            <p className="font-headline text-2xl font-bold text-secondary-container">
              {gym.app_day_pass} <span className="text-xs">ETB</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleBuy}
            disabled={buying}
            className="bg-gradient-to-r from-primary to-primary-container text-on-primary font-body font-bold py-3 px-6 rounded-full shadow-[0_4px_15px_rgba(0,200,83,0.2)] flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {buying ? "..." : "Buy Pass"}
            <span className="material-symbols-outlined text-lg">
              arrow_forward
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
