import type { EqubRoom, EqubRoomType } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.js";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";
import { isQaTestMode, MOCK_EQUB_ROOMS } from "../lib/testMode.js";

const TIER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "starter", label: "Starter" },
  { value: "regular", label: "Regular" },
  { value: "elite", label: "Elite" },
] as const;

function RoomTypeBadge({ roomType }: { roomType: EqubRoomType }) {
  const config = {
    public: {
      className: "bg-primary/10 text-primary border border-primary/20",
      icon: "public",
      label: "Public",
    },
    private: {
      className:
        "bg-secondary-container/10 text-secondary-container border border-secondary-container/20",
      icon: "lock",
      label: "Private",
    },
    sponsored: {
      className:
        "bg-gradient-to-r from-secondary-container/20 to-secondary-fixed/20 text-secondary-container border border-secondary-container/20",
      icon: "verified",
      label: "Sponsored",
    },
  } as const;

  const c = config[roomType];

  return (
    <span
      className={`inline-flex items-center gap-1 font-label text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full ${c.className}`}
    >
      <span className="material-symbols-outlined text-xs">{c.icon}</span>
      {c.label}
    </span>
  );
}

export function EqubList() {
  const [rooms, setRooms] = useState<EqubRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isQaTestMode()) {
      setRooms(MOCK_EQUB_ROOMS as unknown as EqubRoom[]);
      setLoading(false);
      return;
    }
    api<EqubRoom[]>("/api/equb-rooms")
      .then((res) => {
        if (res.data) setRooms(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const totalPayout = rooms.reduce(
    (sum, r) => sum + r.stake_amount * r.max_members,
    0,
  );

  const searchLower = search.toLowerCase();
  const filteredRooms = rooms.filter(
    (r) =>
      (tierFilter === "all" || r.tier === tierFilter) &&
      (search === "" || r.name.toLowerCase().includes(searchLower)),
  );

  return (
    <div className="bg-background text-on-surface font-body min-h-screen pb-32">
      {/* Search */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex-1 flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-on-surface-variant text-xl">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms..."
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant outline-none"
          />
        </div>
      </div>

      {/* Stats Banner */}
      <div className="px-4 pb-4">
        <div className="col-span-2 bg-gradient-to-br from-primary-container to-on-primary-fixed-variant p-6 rounded-lg">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-primary-fixed opacity-80">
            Total Payout Pool
          </p>
          <p className="font-headline text-3xl font-bold text-on-primary-fixed mt-1">
            {totalPayout.toLocaleString()} ETB
          </p>
          <p className="font-label text-xs text-on-primary-fixed opacity-70 mt-1">
            {rooms.length} active {rooms.length === 1 ? "room" : "rooms"}
          </p>
        </div>
      </div>

      {/* Difficulty Tier Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 px-4">
        {TIER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTierFilter(opt.value)}
            className={
              tierFilter === opt.value
                ? "bg-primary text-on-primary font-label font-bold text-xs px-4 py-2 rounded-full whitespace-nowrap"
                : "bg-surface-container text-on-surface-variant font-label text-xs px-4 py-2 rounded-full whitespace-nowrap"
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between px-4 pb-3">
        <h2 className="font-headline text-xl">Active Rooms</h2>
        <span className="font-label text-on-surface-variant text-xs tracking-widest">
          {filteredRooms.length} {filteredRooms.length === 1 ? "room" : "rooms"}
        </span>
      </div>

      {/* Room Cards */}
      <div className="px-4 flex flex-col gap-3">
        {filteredRooms.length > 0 ? (
          filteredRooms.map((r) => (
            <RealCard
              key={r.id}
              room={r}
              onClick={() => navigate(`/equbs/${r.id}`)}
            />
          ))
        ) : (
          <EmptyState
            icon="groups"
            title="No rooms yet"
            subtitle="Create the first fitness Equb or use Quick Join"
            ctaLabel="Create Equb"
            onCta={() => navigate("/equbs/create")}
          />
        )}
      </div>

      {/* Quick Join Button */}
      <button
        type="button"
        onClick={() => navigate("/quick-join")}
        className="fixed bottom-24 right-20 w-14 h-14 bg-secondary-container text-on-secondary-container rounded-full shadow-[0_4px_20px_rgba(255,219,60,0.3)] flex items-center justify-center z-50"
      >
        <span className="material-symbols-outlined text-2xl">bolt</span>
      </button>

      {/* FAB Create Button */}
      <button
        type="button"
        onClick={() => navigate("/equbs/create")}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary-container text-on-primary-container rounded-full shadow-[0_4px_20px_rgba(0,200,83,0.4)] flex items-center justify-center z-50"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>
    </div>
  );
}

function RealCard({ room, onClick }: { room: EqubRoom; onClick: () => void }) {
  const payout = room.stake_amount * room.max_members;
  const countdown = useCd(room.end_date);
  const fillPct =
    room.max_members > 0
      ? Math.round((room.min_members / room.max_members) * 100)
      : 0;
  const isSteps =
    room.name.toLowerCase().includes("step") ||
    room.name.toLowerCase().includes("run");

  return (
    <div
      role="article"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      tabIndex={0}
      className="w-full text-left bg-surface-container-low rounded-lg p-5 space-y-5 cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Top row: name + badge + requirement */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-headline text-lg leading-tight">{room.name}</h3>
          <div className="flex items-center gap-1.5">
            {room.is_tsom && (
              <span className="inline-flex items-center gap-1 font-label text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#FF9800]/10 text-[#FF9800] border border-[#FF9800]/20">
                <span className="material-symbols-outlined text-xs">
                  brightness_5
                </span>
                Tsom
              </span>
            )}
            <RoomTypeBadge roomType={room.room_type} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-primary">
            {isSteps ? "directions_run" : "fitness_center"}
          </span>
          <span className="font-label text-[11px] uppercase tracking-wider text-on-surface-variant">
            {room.workout_target}k steps required
          </span>
        </div>
      </div>

      {/* Countdown */}
      {countdown && (
        <div className="flex items-center gap-2">
          <div className="bg-secondary-container/10 px-3 py-1 rounded-md">
            <span
              className="font-label font-bold text-sm tabular-nums"
              style={{ color: cdColor(room.end_date) }}
            >
              {countdown}
            </span>
          </div>
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            remaining
          </span>
        </div>
      )}

      {/* Financials row */}
      <div className="bg-background/50 p-4 rounded-xl flex justify-between">
        <div className="text-center">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Entry
          </p>
          <p className="font-headline text-xl font-bold mt-0.5">
            {room.stake_amount > 0 ? room.stake_amount : "Free"}{" "}
            <span className="text-sm font-normal text-on-surface-variant">
              ETB
            </span>
          </p>
        </div>
        <div className="text-center">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Payout
          </p>
          <p className="font-headline text-xl font-bold text-primary mt-0.5">
            {payout.toLocaleString()}{" "}
            <span className="text-sm font-normal text-on-surface-variant">
              ETB
            </span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            {room.min_members}/{room.max_members} spots filled
          </span>
          <span className="font-label text-[10px] text-on-surface-variant">
            {fillPct}%
          </span>
        </div>
        <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Join button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="w-full py-4 rounded-full border-2 border-secondary-fixed text-secondary-fixed font-headline font-bold uppercase tracking-widest text-sm"
      >
        Join Now
      </button>
    </div>
  );
}

function cdColor(end: string): string {
  const d = new Date(end).getTime() - Date.now();
  if (d < 3600000) return "#FF3B30";
  if (d < 7200000) return "#FF9500";
  return "#FFD700";
}

function useCd(end: string): string | null {
  const [n, sn] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => sn(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const d = new Date(end).getTime() - n;
  if (d <= 0) return null;
  const h = Math.floor(d / 3600000);
  const m = Math.floor((d % 3600000) / 60000);
  const s = Math.floor((d % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
