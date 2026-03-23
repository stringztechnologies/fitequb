import { type ReactNode, useEffect, useRef, useState } from "react";

function isTelegramWebApp(): boolean {
  return Boolean(window.Telegram?.WebApp?.initData);
}

function isDemoOverride(): boolean {
  if (import.meta.env.MODE !== "development") return false;
  return new URLSearchParams(window.location.search).get("demo") === "true";
}

function isQaTestMode(): boolean {
  return new URLSearchParams(window.location.search).get("test") === "true";
}

function isPwaStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function TelegramGate({ children }: { children: ReactNode }) {
  if (isTelegramWebApp() || isDemoOverride() || isPwaStandalone()) {
    return <>{children}</>;
  }

  if (isQaTestMode()) {
    if (!window.Telegram) {
      // biome-ignore lint: QA test stub
      (window as unknown as Record<string, unknown>).Telegram = {
        WebApp: {
          initData: "",
          initDataUnsafe: {
            user: {
              id: 999999,
              first_name: "Test",
              last_name: "User",
              username: "qa_test_user",
            },
          },
          ready: () => {},
          expand: () => {},
          close: () => {},
          MainButton: {
            show: () => {},
            hide: () => {},
            setText: () => {},
            onClick: () => {},
          },
          BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
          HapticFeedback: {
            impactOccurred: () => {},
            notificationOccurred: () => {},
            selectionChanged: () => {},
          },
          themeParams: {},
          colorScheme: "dark",
          platform: "test",
        },
      };
    }
    return (
      <>
        <div className="fixed top-2 right-2 z-[9999] bg-error/80 text-white px-2 py-0.5 rounded font-label text-[9px] uppercase tracking-widest pointer-events-none select-none">
          QA Testing Mode
        </div>
        {children}
      </>
    );
  }

  return <LandingPage />;
}

// --- Marketing Landing Page ---

function LandingPage() {
  const stats = { rooms: 5, challenges: 3, gyms: 3 };
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const deferredPrompt = useRef<Event | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    const prompt = deferredPrompt.current as {
      prompt?: () => Promise<void>;
    } | null;
    if (prompt?.prompt) {
      await prompt.prompt();
      deferredPrompt.current = null;
      setCanInstall(false);
    }
  }

  useEffect(() => {
    // Intersection observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible((prev) => new Set(prev).add(entry.target.id));
          }
        }
      },
      { threshold: 0.15 },
    );

    document
      .querySelectorAll("[data-animate]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const animClass = (id: string) =>
    `transition-all duration-700 ${visible.has(id) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body overflow-x-hidden">
      {/* HERO */}
      <section className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tight text-primary-container relative z-10">
          Fit<span className="text-primary">Equb</span>
        </h1>
        <p className="text-2xl md:text-3xl font-headline font-bold text-on-surface mt-4 relative z-10">
          Stake. Sweat. Split the pot.
        </p>
        <p className="text-base text-on-surface-variant mt-3 max-w-md relative z-10 leading-relaxed">
          The first app in Ethiopia where your gym commitment makes you money.
        </p>
        <a
          href="https://t.me/fitequb_bot"
          className="mt-8 px-10 py-4 rounded-full bg-[#0088cc] text-white text-lg font-bold no-underline flex items-center gap-3 shadow-[0_4px_30px_rgba(0,136,204,0.4)] hover:shadow-[0_4px_40px_rgba(0,136,204,0.6)] active:scale-95 transition-all relative z-10"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FFF">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
          Open in Telegram
        </a>

        {/* PWA Install Button */}
        {canInstall && (
          <button
            type="button"
            onClick={handleInstall}
            className="mt-4 px-8 py-3 rounded-full bg-primary text-on-primary text-base font-bold flex items-center gap-2 shadow-glow active:scale-95 transition-all relative z-10"
          >
            <span className="material-symbols-outlined text-xl">
              install_mobile
            </span>
            Install FitEqub
          </button>
        )}

        {/* iOS Install Hint */}
        {isIOS && !canInstall && (
          <p className="mt-4 text-xs text-on-surface-variant relative z-10 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">ios_share</span>
            Tap Share → "Add to Home Screen" to install
          </p>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how"
        data-animate
        className={`py-20 px-6 ${animClass("how")}`}
      >
        <h2 className="text-center font-headline text-2xl font-bold text-on-surface mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <HowCard
            icon="savings"
            title="Stake"
            desc="Put your ETB where your muscles are"
            color="text-[#FFD700]"
          />
          <HowCard
            icon="directions_run"
            title="Sweat"
            desc="Work out for 30 days. We verify everything."
            color="text-primary"
          />
          <HowCard
            icon="emoji_events"
            title="Win"
            desc="Complete the challenge. Split the losers' money."
            color="text-secondary-container"
          />
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        data-animate
        className={`py-20 px-6 bg-surface-container-low/30 ${animClass("features")}`}
      >
        <h2 className="text-center font-headline text-2xl font-bold text-on-surface mb-12">
          Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <FeatureCard
            icon="groups"
            title="Fitness Equbs"
            desc="Accountability groups with real money stakes"
          />
          <FeatureCard
            icon="fitness_center"
            title="Gym Day Passes"
            desc="Try any gym in Addis for 200 ETB"
          />
          <FeatureCard
            icon="leaderboard"
            title="Step Challenges"
            desc="Free city-wide competitions with prizes"
          />
          <FeatureCard
            icon="auto_awesome"
            title="AI Coach"
            desc="Personal fitness advisor powered by AI"
          />
        </div>
      </section>

      {/* STATS */}
      <section
        id="stats"
        data-animate
        className={`py-20 px-6 ${animClass("stats")}`}
      >
        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto text-center">
          <StatBlock value={stats.rooms} label="Equb Rooms" />
          <StatBlock value={stats.challenges} label="Challenges" />
          <StatBlock value={stats.gyms} label="Partner Gyms" />
        </div>
      </section>

      {/* PARTNER GYMS */}
      <section
        id="gyms"
        data-animate
        className={`py-20 px-6 bg-surface-container-low/30 ${animClass("gyms")}`}
      >
        <h2 className="text-center font-headline text-2xl font-bold text-on-surface mb-12">
          Partner Gyms
        </h2>
        <div className="flex flex-wrap justify-center gap-8 max-w-3xl mx-auto">
          {["Infinity Fitness", "Body Zone", "Atlas Fitness Center"].map(
            (name) => (
              <div
                key={name}
                className="bg-surface-container rounded-xl px-8 py-5 border border-outline-variant/10"
              >
                <span className="material-symbols-outlined text-primary text-3xl mb-2 block text-center">
                  fitness_center
                </span>
                <p className="font-headline text-sm font-bold text-on-surface text-center">
                  {name}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 text-center border-t border-outline-variant/10">
        <a
          href="https://t.me/fitequb_bot"
          className="inline-flex items-center gap-2 text-primary font-headline font-bold text-base hover:underline"
        >
          Open @fitequb_bot on Telegram →
        </a>
        <p className="mt-4 text-xs text-outline">
          Built by Stringz Technologies — Addis Ababa
        </p>
      </footer>
    </div>
  );
}

function HowCard({
  icon,
  title,
  desc,
  color,
}: {
  icon: string;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center mb-4">
        <span
          className={`material-symbols-outlined text-3xl ${color}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <h3 className="font-headline text-lg font-bold text-on-surface">
        {title}
      </h3>
      <p className="text-sm text-on-surface-variant mt-2">{desc}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/10 hover:border-primary/30 transition-colors">
      <span
        className="material-symbols-outlined text-primary text-2xl mb-3 block"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <h3 className="font-headline text-base font-bold text-on-surface">
        {title}
      </h3>
      <p className="text-sm text-on-surface-variant mt-1">{desc}</p>
    </div>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-headline text-4xl font-extrabold text-primary">
        {value}
      </p>
      <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-1">
        {label}
      </p>
    </div>
  );
}
