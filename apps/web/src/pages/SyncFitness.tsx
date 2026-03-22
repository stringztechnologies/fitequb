import { useNavigate } from "react-router-dom";

export function SyncFitness() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Header */}
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
          Sync Fitness
        </h1>
      </header>
      <div className="h-16" />

      <div className="px-4 pt-4 flex flex-col items-center">
        {/* Hero section with concentric circles */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Outermost ring */}
          <div className="absolute w-80 h-80 border border-primary/[0.02] rounded-full" />
          {/* Middle ring */}
          <div className="absolute w-64 h-64 border border-primary/5 rounded-full" />
          {/* Inner ring */}
          <div className="absolute w-48 h-48 border border-primary/10 rounded-full" />
          {/* Main icon */}
          <div
            className="relative w-24 h-24 bg-primary-container rounded-full flex items-center justify-center"
            style={{ filter: "drop-shadow(0 0 15px rgba(63,229,108,0.4))" }}
          >
            <span className="material-symbols-rounded text-5xl text-surface">
              sync
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="font-headline font-extrabold text-3xl text-center text-white tracking-tight mb-2">
          Sync Fitness Data
        </h1>

        {/* Subtitle */}
        <p className="font-body text-on-surface-variant text-center opacity-80 mb-8 max-w-xs">
          Connect your fitness apps to automatically track workouts and earn
          rewards.
        </p>

        {/* Last synced card */}
        <div className="w-full bg-surface-container-low rounded-lg p-4 flex items-center justify-between border border-outline-variant/10 mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-on-surface-variant text-xl">
              schedule
            </span>
            <div>
              <p className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wide">
                Last Synced
              </p>
              <p className="font-body text-sm text-white">Never</p>
            </div>
          </div>
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
            aria-label="Refresh sync"
          >
            <span className="material-symbols-rounded text-on-surface-variant text-xl">
              refresh
            </span>
          </button>
        </div>

        {/* Connection cards */}
        <div className="w-full space-y-3 mb-8">
          <ProviderCard
            name="Google Fit"
            subtitle="Steps, calories, workouts"
            iconName="fitbit"
            iconColor="text-[#4285F4]"
          />
          <ProviderCard
            name="Apple Health"
            subtitle="Activity rings, workouts"
            iconName="health_metrics"
            iconColor="text-[#ff2d55]"
            iconFilled
          />
          <ProviderCard
            name="Telegram"
            subtitle="Step challenges, activity"
            iconName="send"
            iconColor="text-[#24A1DE]"
          />
        </div>

        {/* Sync Now CTA */}
        <button
          type="button"
          onClick={() => navigate("/equbs")}
          className="w-full bg-gradient-to-tr from-primary to-primary-container text-on-primary py-5 rounded-full font-headline font-black text-lg tracking-tighter uppercase shadow-[0_10px_30px_rgba(0,200,83,0.3)] active:scale-[0.98] transition-transform"
        >
          Log Workout Manually
        </button>
      </div>
    </div>
  );
}

function ProviderCard({
  name,
  subtitle,
  iconName,
  iconColor,
  iconFilled,
}: {
  name: string;
  subtitle: string;
  iconName: string;
  iconColor: string;
  iconFilled?: boolean;
}) {
  return (
    <div className="p-5 bg-surface-container rounded-lg flex items-center justify-between hover:bg-surface-container-high transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
          <span
            className={`material-symbols-rounded text-2xl ${iconColor}`}
            style={
              iconFilled ? { fontVariationSettings: "'FILL' 1" } : undefined
            }
          >
            {iconName}
          </span>
        </div>
        <div>
          <p className="font-label text-sm font-bold text-white tracking-wide uppercase">
            {name}
          </p>
          <p className="font-body text-xs text-on-surface-variant">
            {subtitle}
          </p>
        </div>
      </div>
      <span className="bg-secondary-container text-on-secondary-container px-6 py-2 rounded-full font-label text-xs font-bold uppercase tracking-wider">
        Coming Soon
      </span>
    </div>
  );
}
