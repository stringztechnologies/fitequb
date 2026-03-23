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

interface FitnessRequirement {
  id: string;
  icon: string;
  label: string;
  selected: boolean;
}

const DEFAULT_REQUIREMENTS: FitnessRequirement[] = [
  {
    id: "steps",
    icon: "directions_run",
    label: "10k Steps/Day",
    selected: true,
  },
  {
    id: "gym",
    icon: "fitness_center",
    label: "3 Gym Visits/Week",
    selected: false,
  },
  { id: "run", icon: "speed", label: "5km Run/Week", selected: false },
];

export function CreateEqub() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState(10);
  const [payout, setPayout] = useState("25000");
  const [requirements, setRequirements] =
    useState<FitnessRequirement[]>(DEFAULT_REQUIREMENTS);
  const [showAddReq, setShowAddReq] = useState(false);
  const [customReq, setCustomReq] = useState("");
  const [roomType, setRoomType] = useState<"public" | "private">("public");
  const [isTsom, setIsTsom] = useState(false);

  function toggleRequirement(id: string) {
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)),
    );
  }

  function addCustomRequirement() {
    if (!customReq.trim()) return;
    setRequirements((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        icon: "check_circle",
        label: customReq.trim(),
        selected: true,
      },
    ]);
    setCustomReq("");
    setShowAddReq(false);
  }

  function removeRequirement(id: string) {
    setRequirements((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const durationDays =
      Number(form.get("duration_days")) || EQUB_DEFAULT_DURATION_DAYS;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);

    const targetPayout = Number(form.get("stake_amount")) || 0;
    const stakePerPerson = Math.round(targetPayout / members);

    const res = await api<EqubRoom>("/api/equb-rooms", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        stake_amount: stakePerPerson,
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
      setError(
        res.error === "Network error"
          ? "Unable to connect. Please check your internet connection and try again."
          : res.error,
      );
      return;
    }
    if (res.data) navigate(`/equbs/${res.data.id}`);
  }

  const entryEstimate =
    Number(payout) > 0 ? Math.round(Number(payout) / members) : 0;
  const selectedCount = requirements.filter((r) => r.selected).length;

  return (
    <div className="bg-background text-on-surface font-body min-h-screen pb-40">
      {/* Header */}
      <header className="fixed top-0 w-full max-w-[430px] z-50 bg-[#131313]/70 backdrop-blur-xl flex items-center justify-between px-4 h-14">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
        <h1 className="font-headline font-bold text-lg text-on-surface">
          New Equb
        </h1>
        <div className="w-10" />
      </header>

      <div className="h-14" />

      {/* Step Progress */}
      <div className="px-5 pt-4 pb-2">
        <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full shadow-[0_0_10px_#00c853] transition-all duration-500"
            style={{ width: "33%" }}
          />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
            1. Basics
          </span>
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            2. Rules
          </span>
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            3. Review
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

      <form
        id="create-equb-form"
        onSubmit={handleSubmit}
        className="px-5 pt-5 space-y-6"
      >
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
              className="material-symbols-outlined text-secondary-container text-[22px] absolute left-4 top-1/2 -translate-y-1/2"
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
              className="w-full bg-surface-container-low border-b-2 border-secondary-container/40 focus:border-secondary-container text-on-surface pl-12 pr-16 py-4 rounded-t-xl outline-none transition-colors font-headline font-bold text-xl"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label text-xs text-on-surface-variant uppercase tracking-widest">
              ETB
            </span>
          </div>
        </div>

        {/* Number of Participants */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="num-participants"
              className="font-label text-xs uppercase tracking-widest text-on-surface-variant ml-1"
            >
              Participants
            </label>
            <span className="font-headline text-2xl text-primary font-black">
              {members}
            </span>
          </div>
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

        {/* Room Type Toggle */}
        <div>
          <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant ml-1 block mb-2">
            Room Type
          </label>
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
        </div>

        {/* Tsom (Fasting) Mode Toggle */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant ml-1 block">
                Tsom / Fasting Mode
              </label>
              <p className="text-on-surface-variant text-xs ml-1 mt-1">
                Reduces targets to 60% during fasting seasons
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTsom(!isTsom)}
              className={`w-12 h-7 rounded-full transition-all relative ${
                isTsom ? "bg-primary" : "bg-surface-container-highest"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${
                  isTsom ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
          {isTsom && (
            <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-primary text-lg mt-0.5">
                info
              </span>
              <p className="text-xs text-on-surface-variant">
                Workout targets will be reduced to 60% and completion threshold
                adjusts to accommodate fasting periods.
              </p>
            </div>
          )}
        </div>

        {/* Fitness Requirements — Interactive */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant ml-1">
              Fitness Requirements
            </label>
            <span className="font-label text-2xs text-primary font-bold">
              {selectedCount} selected
            </span>
          </div>
          <div className="space-y-2.5">
            {requirements.map((req) => (
              <button
                key={req.id}
                type="button"
                onClick={() => toggleRequirement(req.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all active:scale-[0.98] ${
                  req.selected
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-surface-container border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-[20px] ${req.selected ? "text-primary" : "text-on-surface-variant"}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {req.icon}
                  </span>
                  <span
                    className={`text-sm font-medium ${req.selected ? "text-on-surface" : "text-on-surface-variant"}`}
                  >
                    {req.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {req.id.startsWith("custom-") && (
                    <span
                      className="material-symbols-outlined text-[18px] text-on-surface-variant hover:text-error transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRequirement(req.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          removeRequirement(req.id);
                        }
                      }}
                    >
                      delete
                    </span>
                  )}
                  <span
                    className={`material-symbols-outlined text-[20px] transition-colors ${req.selected ? "text-primary" : "text-on-surface-variant/30"}`}
                    style={{
                      fontVariationSettings: req.selected
                        ? "'FILL' 1"
                        : "'FILL' 0",
                    }}
                  >
                    {req.selected ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </div>
              </button>
            ))}

            {/* Add Custom Requirement */}
            {showAddReq ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customReq}
                  onChange={(e) => setCustomReq(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomRequirement();
                    }
                  }}
                  placeholder="e.g. 30 min yoga daily"
                  autoFocus
                  className="flex-1 bg-surface-container-low border-b-2 border-primary/40 focus:border-primary text-on-surface px-4 py-3 rounded-t-lg outline-none transition-colors placeholder:text-on-surface-variant/40 text-sm"
                />
                <button
                  type="button"
                  onClick={addCustomRequirement}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-on-primary active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    check
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddReq(false);
                    setCustomReq("");
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    close
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddReq(true)}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-outline-variant/30 rounded-lg py-3 text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                Add Custom Requirement
              </button>
            )}
          </div>
        </div>

        {/* Rule Summary Card */}
        <div className="bg-surface-container-low p-6 rounded-lg border-l-4 border-primary shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="material-symbols-outlined text-primary text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                payments
              </span>
              <span className="font-headline font-bold text-on-surface">
                Summary
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-label text-2xs text-on-surface-variant uppercase tracking-widest mb-1">
                  Entry Fee / Person
                </p>
                <span className="text-primary font-headline font-black text-xl">
                  {entryEstimate.toLocaleString()} ETB
                </span>
              </div>
              <div>
                <p className="font-label text-2xs text-on-surface-variant uppercase tracking-widest mb-1">
                  Total Payout
                </p>
                <span className="text-secondary-container font-headline font-black text-xl">
                  {Number(payout).toLocaleString()} ETB
                </span>
              </div>
              <div>
                <p className="font-label text-2xs text-on-surface-variant uppercase tracking-widest mb-1">
                  Participants
                </p>
                <span className="text-on-surface font-headline font-bold text-xl">
                  {members}
                </span>
              </div>
              <div>
                <p className="font-label text-2xs text-on-surface-variant uppercase tracking-widest mb-1">
                  Requirements
                </p>
                <span className="text-on-surface font-headline font-bold text-xl">
                  {selectedCount}
                </span>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5">
            <span className="material-symbols-outlined text-[120px]">
              payments
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-container/20 border border-error/30 rounded-lg px-4 py-3 flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-[20px] mt-0.5">
              error
            </span>
            <p className="text-error text-sm">{error}</p>
          </div>
        )}
      </form>

      {/* Sticky CTA Footer — above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto z-40 p-5 bg-gradient-to-t from-background via-background to-transparent pt-10">
        <button
          type="submit"
          form="create-equb-form"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold py-5 rounded-full shadow-[0_10px_30px_rgba(0,200,83,0.3)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Equb"}
          {!submitting && (
            <span className="material-symbols-outlined text-[20px]">
              arrow_forward
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
