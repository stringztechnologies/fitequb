import {
  EQUB_DEFAULT_COMPLETION_PCT,
  EQUB_DEFAULT_DURATION_DAYS,
  EQUB_MAX_MEMBERS,
  EQUB_MIN_MEMBERS,
} from "@fitequb/shared";
import type { EqubRoom } from "@fitequb/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export function CreateEqub() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState(10);
  const [payout, setPayout] = useState("25000");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const durationDays =
      Number(form.get("duration_days")) || EQUB_DEFAULT_DURATION_DAYS;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);

    const res = await api<EqubRoom>("/api/equb-rooms", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        stake_amount: Number(form.get("stake_amount")),
        duration_days: durationDays,
        workout_target: Number(form.get("workout_target")) || durationDays,
        completion_pct: EQUB_DEFAULT_COMPLETION_PCT,
        min_members: EQUB_MIN_MEMBERS,
        max_members: members,
        start_date: startDate.toISOString(),
        sponsor_prize: 0,
      }),
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.data) navigate(`/equbs/${res.data.id}`);
  }

  const entryEstimate =
    Number(payout) > 0 ? Math.round(Number(payout) / members) : 0;

  return (
    <div className="bg-background text-on-surface font-body min-h-screen pb-28">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-xl flex items-center justify-between px-4 h-14">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
          aria-label="Close"
        >
          <span className="material-symbols-rounded text-[22px]">close</span>
        </button>
        <h1 className="font-headline font-bold text-lg text-on-surface">
          Create New Equb
        </h1>
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
          aria-label="More options"
        >
          <span className="material-symbols-rounded text-[22px]">
            more_vert
          </span>
        </button>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Step Progress Bar */}
      <div className="px-5 pt-4 pb-2">
        <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full shadow-[0_0_10px_#00c853] transition-all duration-500"
            style={{ width: "33%" }}
          />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
            Basics
          </span>
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Rules
          </span>
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Review
          </span>
        </div>
      </div>

      {/* Page Title */}
      <div className="px-5 pt-4 pb-1">
        <h2 className="font-headline text-3xl font-black leading-tight">
          Set the basics
        </h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Name your Equb, set the payout, and choose how many people can join.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-5 space-y-6">
        {/* Equb Name */}
        <div>
          <label
            htmlFor="equb-name"
            className="font-label text-xs uppercase tracking-widest text-on-surface-variant ml-1 block mb-2"
          >
            Equb Name
          </label>
          <input
            id="equb-name"
            name="name"
            type="text"
            required
            placeholder="e.g. Morning Movers"
            className="w-full bg-surface-container-low border-b-2 border-secondary-container/40 focus:border-secondary-container text-on-surface px-4 py-4 rounded-t-xl outline-none transition-colors placeholder:text-on-surface-variant/40 font-body"
          />
        </div>

        {/* Target Payout */}
        <div>
          <label
            htmlFor="target-payout"
            className="font-label text-xs uppercase tracking-widest text-on-surface-variant ml-1 block mb-2"
          >
            Target Payout
          </label>
          <div className="relative">
            <span
              className="material-symbols-rounded text-secondary-container text-[22px] absolute left-4 top-1/2 -translate-y-1/2"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance_wallet
            </span>
            <input
              id="target-payout"
              name="stake_amount"
              type="number"
              required
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
              className="w-full bg-surface-container-low border-b-2 border-secondary-container/40 focus:border-secondary-container text-on-surface pl-12 pr-4 py-4 rounded-t-xl outline-none transition-colors font-headline font-bold text-xl"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label text-xs text-on-surface-variant uppercase tracking-widest">
              ETB
            </span>
          </div>
        </div>

        {/* Number of Participants - Slider */}
        <div>
          <label
            htmlFor="num-participants"
            className="font-label text-xs uppercase tracking-widest text-on-surface-variant ml-1 block mb-2"
          >
            Number of Participants
          </label>
          <p className="font-headline text-3xl text-primary font-black text-center mb-3">
            {members}
          </p>
          <div className="flex items-center gap-3">
            <span className="font-label text-2xs text-on-surface-variant">
              {EQUB_MIN_MEMBERS}
            </span>
            <input
              id="num-participants"
              type="range"
              min={EQUB_MIN_MEMBERS}
              max={EQUB_MAX_MEMBERS}
              value={members}
              onChange={(e) => setMembers(Number(e.target.value))}
              className="flex-1 accent-primary h-1.5"
            />
            <span className="font-label text-2xs text-on-surface-variant">
              {EQUB_MAX_MEMBERS}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label
            htmlFor="duration"
            className="font-label text-xs uppercase tracking-widest text-on-surface-variant ml-1 block mb-2"
          >
            Duration (days)
          </label>
          <input
            id="duration"
            name="duration_days"
            type="number"
            defaultValue="30"
            className="w-full bg-surface-container-low border-b-2 border-secondary-container/40 focus:border-secondary-container text-on-surface px-4 py-4 rounded-t-xl outline-none transition-colors font-body"
          />
        </div>

        {/* Workout Target */}
        <div>
          <label
            htmlFor="workout-target"
            className="font-label text-xs uppercase tracking-widest text-on-surface-variant ml-1 block mb-2"
          >
            Workout Target (days)
          </label>
          <input
            id="workout-target"
            name="workout_target"
            type="number"
            placeholder="30"
            className="w-full bg-surface-container-low border-b-2 border-secondary-container/40 focus:border-secondary-container text-on-surface px-4 py-4 rounded-t-xl outline-none transition-colors placeholder:text-on-surface-variant/40 font-body"
          />
        </div>

        {/* Fitness Requirement Chips */}
        <div>
          <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant ml-1 block mb-3">
            Fitness Requirements
          </label>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-surface-container px-3 py-2.5 rounded-lg">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-rounded text-primary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  directions_run
                </span>
                <span className="text-sm font-medium text-on-surface">
                  10k Steps/Day
                </span>
              </div>
              <span className="material-symbols-rounded text-primary text-[20px]">
                check_circle
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container px-3 py-2.5 rounded-lg">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-rounded text-secondary-container text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  fitness_center
                </span>
                <span className="text-sm font-medium text-on-surface">
                  3 Gym Visits/Week
                </span>
              </div>
              <span className="material-symbols-rounded text-primary text-[20px]">
                check_circle
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container px-3 py-2.5 rounded-lg">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-rounded text-primary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  speed
                </span>
                <span className="text-sm font-medium text-on-surface">
                  5km Run/Week
                </span>
              </div>
              <span className="material-symbols-rounded text-primary text-[20px]">
                check_circle
              </span>
            </div>
            {/* Add Requirement */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-outline-variant/30 rounded-lg py-3 text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:border-outline-variant/60 transition-colors"
            >
              <span className="material-symbols-rounded text-[18px]">add</span>
              Add Requirement
            </button>
          </div>
        </div>

        {/* Rule Summary Card */}
        <div className="bg-surface-container-low p-6 rounded-lg border-l-4 border-primary shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-primary text-[20px]">
                payments
              </span>
              <span className="font-headline font-bold text-on-surface">
                Rule Summary
              </span>
            </div>
            <span className="font-label text-2xs text-on-surface-variant uppercase tracking-widest">
              Live
            </span>
          </div>
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-1">
            Estimated Entry Fee per Person
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-primary font-headline font-black text-2xl">
              {entryEstimate.toLocaleString()} ETB
            </span>
            <span className="text-on-surface-variant text-xs font-label">
              / cycle
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-container/20 border border-error/30 rounded-lg px-4 py-3">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}
      </form>

      {/* Sticky CTA Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-5 bg-gradient-to-t from-background via-background to-transparent pt-10">
        <button
          type="submit"
          form="create-equb-form"
          disabled={submitting}
          onClick={() => {
            const form = document.querySelector("form");
            if (form) {
              form.requestSubmit();
            }
          }}
          className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold py-5 rounded-full shadow-[0_10px_30px_rgba(0,200,83,0.3)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Next: Set Rules"}
          {!submitting && (
            <span className="material-symbols-rounded text-[20px]">
              arrow_forward
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
