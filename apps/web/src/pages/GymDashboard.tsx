import { useEffect, useState } from "react";

interface DashboardData {
  gym: { id: string; name: string; location: string };
  stats: {
    totalSold: number;
    totalRedeemed: number;
    revenue: number;
    gymPayout: number;
  };
  recentPasses: Array<{
    id: string;
    status: string;
    userName: string;
    purchasedAt: string;
    redeemedAt: string | null;
  }>;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function getApiKey(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("key");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Addis_Ababa",
  });
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let classes: string;
  let label: string;

  switch (normalized) {
    case "active":
      classes = "bg-[#3FE56C]/15 text-[#3FE56C]";
      label = "Active";
      break;
    case "redeemed":
      classes = "bg-[#F5C542]/15 text-[#F5C542]";
      label = "Redeemed";
      break;
    case "expired":
      classes = "bg-[#EF4444]/15 text-[#EF4444]";
      label = "Expired";
      break;
    default:
      classes = "bg-surface-container-highest text-on-surface-variant";
      label = status;
  }

  return (
    <span
      className={`inline-block font-label text-xs font-bold px-2.5 py-0.5 rounded-full ${classes}`}
    >
      {label}
    </span>
  );
}

export function GymDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiKey = getApiKey();

    if (!apiKey) {
      setError("Missing API key. Add ?key=YOUR_KEY to the URL.");
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/gym/dashboard?key=${encodeURIComponent(apiKey)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json.data);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // -- Error state --
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="bg-surface-container-low rounded-lg p-8 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-full bg-[#EF4444]/15 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-[#EF4444]">
              error
            </span>
          </div>
          <h2 className="font-headline text-lg font-bold text-on-surface mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-on-surface-variant text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // -- Loading state --
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { gym, stats, recentPasses } = data;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#131313]/70 backdrop-blur-xl px-5 py-4">
        <p className="font-label text-xs uppercase tracking-[0.15em] text-primary mb-0.5">
          FitEqub Partner Dashboard
        </p>
        <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface">
          {gym.name}
        </h1>
        <p className="text-on-surface-variant text-sm mt-0.5">{gym.location}</p>
      </header>

      {/* KPI Cards -- 2x2 grid */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-5">
        <KpiCard
          label="Passes Sold"
          value={stats.totalSold.toLocaleString()}
          icon="confirmation_number"
          accent="primary"
        />
        <KpiCard
          label="Passes Redeemed"
          value={stats.totalRedeemed.toLocaleString()}
          icon="check_circle"
          accent="secondary"
        />
        <KpiCard
          label="Revenue"
          value={`${stats.revenue.toLocaleString()} ETB`}
          icon="payments"
          accent="primary"
        />
        <KpiCard
          label="Your Payout"
          value={`${stats.gymPayout.toLocaleString()} ETB`}
          icon="account_balance_wallet"
          accent="secondary"
          highlight
        />
      </div>

      {/* Recent Passes */}
      <section className="px-5 pt-6 pb-8" aria-label="Recent passes">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
          Recent Passes
        </h2>

        {recentPasses.length === 0 ? (
          <div className="bg-surface-container-low rounded-lg p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                receipt_long
              </span>
            </div>
            <p className="text-on-surface-variant text-sm">
              No passes sold yet. They will appear here once customers purchase
              day passes for your gym.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3" role="list">
            {recentPasses.map((pass) => (
              <li
                key={pass.id}
                className="bg-surface-container-low rounded-lg p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-headline text-sm font-bold text-on-surface truncate">
                    {pass.userName}
                  </p>
                  <p className="text-on-surface-variant text-xs mt-0.5">
                    {formatDate(pass.purchasedAt)}
                    {pass.redeemedAt && ` -- Redeemed ${formatDate(pass.redeemedAt)}`}
                  </p>
                </div>
                <StatusBadge status={pass.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  icon: string;
  accent: "primary" | "secondary";
  highlight?: boolean;
}) {
  const iconColor =
    accent === "primary" ? "text-primary" : "text-secondary-container";
  const iconBg =
    accent === "primary"
      ? "bg-primary/15"
      : "bg-secondary-container/15";

  return (
    <div
      className={`bg-surface-container-low rounded-lg p-4 ${
        highlight ? "ring-1 ring-primary/30" : ""
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mb-3`}
      >
        <span
          className={`material-symbols-outlined text-lg ${iconColor}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <p className="font-label text-xs uppercase tracking-wider text-on-surface-variant mb-1">
        {label}
      </p>
      <p className="font-headline text-xl font-bold text-on-surface">
        {value}
      </p>
    </div>
  );
}
