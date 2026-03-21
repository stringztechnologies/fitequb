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

const DEMO_BADGES = [
  { id: "1", name: "Early Bird", icon: "\u{1F305}", earned: true },
  { id: "2", name: "100k Steps", icon: "\u{1F45F}", earned: true },
  { id: "3", name: "Marathoner", icon: "\u{1F3C3}", earned: true },
  { id: "4", name: "Team Player", icon: "\u{1F91D}", earned: true },
  { id: "5", name: "Iron Will", icon: "\u{1F4AA}", earned: false },
  { id: "6", name: "Champion", icon: "\u{1F3C6}", earned: false },
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
    <div className="px-4 pt-5 pb-24" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Settings gear */}
      <div style={{ position: "absolute", top: "16px", right: "16px" }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8E8E93"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m4.2-15.4l-2.9 5-2.9-5M19.8 7.3l-5 2.9 5 2.9M4.2 16.7l5-2.9-5-2.9M19.8 16.7l-5-2.9 5-2.9M4.2 7.3l5 2.9-5 2.9" />
        </svg>
      </div>

      {/* Avatar with gold ring */}
      <div className="flex flex-col items-center mb-6">
        <div
          style={{
            width: "96px",
            height: "96px",
            borderRadius: "50%",
            border: "3px solid #FFD700",
            backgroundColor: "#2c2c2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
            fontWeight: 700,
            color: "#FFF",
          }}
        >
          {initial}
        </div>
        <h1 className="text-[22px] font-bold text-white mt-3">{name}</h1>
      </div>

      {/* Stat cards — green border + cyan border */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div
          style={{
            border: "2px solid #00C853",
            borderRadius: "12px",
            padding: "12px",
            backgroundColor: "#1c1c1e",
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: "4px" }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "#00C853",
                fontWeight: 600,
              }}
            >
              Lifetime Earned
            </span>
            <span style={{ fontSize: "16px" }}>💰</span>
          </div>
          <div
            style={{ fontSize: "24px", fontWeight: 700, color: "#00C853" }}
          >
            ETB {totalEarned.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            border: "2px solid #00BCD4",
            borderRadius: "12px",
            padding: "12px",
            backgroundColor: "#1c1c1e",
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: "4px" }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "#00BCD4",
                fontWeight: 600,
              }}
            >
              Lifetime Steps
            </span>
            <span style={{ fontSize: "16px" }}>🏃</span>
          </div>
          <div
            style={{ fontSize: "24px", fontWeight: 700, color: "#00BCD4" }}
          >
            {totalSteps.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Fitness Achievements */}
      <div className="mb-6">
        <h2 className="text-[20px] font-bold text-white mb-4">
          Fitness Achievements
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {badges.map((b) => (
            <div
              key={b.id}
              style={{
                backgroundColor: "#2c2c2e",
                borderRadius: "12px",
                padding: "12px",
                textAlign: "center",
              }}
            >
              {b.earned ? (
                <div style={{ fontSize: "32px" }}>{b.icon}</div>
              ) : (
                <div
                  style={{
                    fontSize: "32px",
                    filter: "grayscale(100%) opacity(0.3)",
                  }}
                >
                  🔒
                </div>
              )}
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "11px",
                  color: "#8E8E93",
                }}
              >
                {b.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Earning History */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-bold text-white">
            Earning History
          </h2>
          <span style={{ fontSize: "14px", color: "#FFD700" }}>
            View All
          </span>
        </div>
        {earnings.map((e) => (
          <div
            key={e.id}
            style={{
              padding: "10px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px", color: "#FFF" }}>
              {e.reason}
            </span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#00C853" }}>
              ETB {e.points.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Sync Fitness Data — outline button */}
      <button
        type="button"
        onClick={() => navigate("/sync")}
        style={{
          width: "100%",
          border: "2px solid #00C853",
          backgroundColor: "transparent",
          color: "#00C853",
          fontSize: "16px",
          fontWeight: 600,
          padding: "14px",
          borderRadius: "12px",
          cursor: "pointer",
        }}
      >
        Sync Fitness Data
      </button>
      <div
        style={{
          textAlign: "center",
          marginTop: "8px",
          fontSize: "12px",
          color: "#8E8E93",
        }}
      >
        Last synced: 2 hours ago
      </div>
    </div>
  );
}
