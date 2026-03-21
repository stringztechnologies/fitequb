import type { EqubRoom } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

const DEMO_ROOMS = [
  {
    id: "demo-1",
    name: "Bole Elite 10k",
    stake: 500,
    payout: 10000,
    max: 20,
    filled: 18,
    req: "10k Steps/Day",
    endMs: 2 * 3600000 + 45 * 60000,
    status: "active",
  },
  {
    id: "demo-2",
    name: "Sarbet Steppers",
    stake: 1000,
    payout: 25000,
    max: 20,
    filled: 12,
    req: "5 Gym Sessions/Week",
    endMs: 8 * 3600000 + 12 * 60000,
    status: "active",
  },
  {
    id: "demo-3",
    name: "Kazanchis Runners",
    stake: 250,
    payout: 5000,
    max: 15,
    filled: 8,
    req: "15k Steps/Day",
    endMs: 55 * 60000,
    status: "pending",
  },
];

export function EqubList() {
  const [rooms, setRooms] = useState<EqubRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api<EqubRoom[]>("/api/equb-rooms")
      .then((res) => {
        if (res.data && res.data.length > 0) setRooms(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const hasReal = rooms.length > 0;
  const totalPayout = hasReal
    ? rooms.reduce((sum, r) => sum + r.stake_amount * r.max_members, 0)
    : DEMO_ROOMS.reduce((sum, r) => sum + r.payout, 0);

  return (
    <div className="bg-background text-on-surface font-body min-h-screen pb-32">
      {/* Search + Filter */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              search
            </span>
            <span className="text-on-surface-variant text-sm">
              Search rooms...
            </span>
          </div>
          <button
            type="button"
            className="bg-surface-container-low p-3 rounded-xl flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              tune
            </span>
          </button>
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
            {hasReal ? rooms.length : DEMO_ROOMS.length} active rooms
          </p>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between px-4 pb-3">
        <h2 className="font-headline text-xl">Active Rooms</h2>
        <span className="font-label text-primary text-xs uppercase tracking-widest">
          View All
        </span>
      </div>

      {/* Room Cards */}
      <div className="px-4 flex flex-col gap-3">
        {hasReal
          ? rooms.map((r) => (
              <RealCard
                key={r.id}
                room={r}
                onClick={() => navigate(`/equbs/${r.id}`)}
              />
            ))
          : DEMO_ROOMS.map((r) => (
              <DemoCard
                key={r.id}
                room={r}
                onClick={() => navigate(`/equbs/${r.id}`)}
              />
            ))}
      </div>

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

function DemoCard({
  room,
  onClick,
}: {
  room: (typeof DEMO_ROOMS)[number];
  onClick: () => void;
}) {
  const end = new Date(Date.now() + room.endMs).toISOString();
  const countdown = useCd(end);
  const fillPct = Math.round((room.filled / room.max) * 100);
  const isSteps = room.req.toLowerCase().includes("step");

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-surface-container-low rounded-lg p-5 space-y-5"
    >
      {/* Top row: name + requirement */}
      <div className="space-y-1">
        <h3 className="font-headline text-lg leading-tight">{room.name}</h3>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-primary">
            {isSteps ? "directions_run" : "fitness_center"}
          </span>
          <span className="font-label text-[11px] uppercase tracking-wider text-on-surface-variant">
            {room.req}
          </span>
        </div>
      </div>

      {/* Countdown */}
      {countdown && (
        <div className="flex items-center gap-2">
          <div className="bg-secondary-container/10 px-3 py-1 rounded-md">
            <span
              className="font-label font-bold text-sm tabular-nums"
              style={{ color: cdColor(end) }}
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
            {room.stake}{" "}
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
            {room.payout.toLocaleString()}{" "}
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
            {room.filled}/{room.max} spots filled
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
        className="w-full py-4 rounded-full border-2 border-secondary-fixed text-secondary-fixed font-headline font-bold uppercase tracking-widest text-sm"
      >
        Join Now
      </button>
    </button>
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
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-surface-container-low rounded-lg p-5 space-y-5"
    >
      {/* Top row: name + requirement */}
      <div className="space-y-1">
        <h3 className="font-headline text-lg leading-tight">{room.name}</h3>
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
        className="w-full py-4 rounded-full border-2 border-secondary-fixed text-secondary-fixed font-headline font-bold uppercase tracking-widest text-sm"
      >
        Join Now
      </button>
    </button>
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
