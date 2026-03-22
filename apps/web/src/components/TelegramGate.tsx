import type { ReactNode } from "react";

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

export function TelegramGate({ children }: { children: ReactNode }) {
  if (isTelegramWebApp() || isDemoOverride()) {
    return <>{children}</>;
  }

  if (isQaTestMode()) {
    // Inject a fake test user for QA
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
        {/* QA watermark */}
        <div className="fixed top-2 right-2 z-[9999] bg-error/80 text-white px-2 py-0.5 rounded font-label text-[9px] uppercase tracking-widest pointer-events-none select-none">
          QA Testing Mode
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 max-w-[430px] mx-auto">
      {/* Logo */}
      <h1 className="text-[42px] font-bold text-primary-container tracking-tight">
        FitEqub
      </h1>
      <p className="text-base text-secondary-container mt-2 font-medium">
        Stake. Sweat. Split the pot.
      </p>

      {/* Feature summary */}
      <div className="mt-10 flex flex-col gap-4 w-full max-w-[320px]">
        <FeaturePoint
          icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          text="Join fitness Equbs — stake real ETB, hit your goals, win the pot"
        />
        <FeaturePoint
          icon="M6.5 6.5h11M4 12h16M6.5 17.5h11M2 10h2v4H2zm18 0h2v4h-2z"
          text="Get discounted gym day passes at partner gyms in Addis"
        />
        <FeaturePoint
          icon="M22 12 18 12 15 21 9 3 6 12 2 12"
          text="Compete in city-wide step challenges and earn rewards"
        />
      </div>

      {/* CTA */}
      <a
        href="https://t.me/fitequb_bot"
        className="mt-10 w-full max-w-[320px] py-4 rounded-[14px] bg-[#0088cc] text-white text-[17px] font-bold no-underline text-center flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(0,136,204,0.3)]"
      >
        <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="#FFF">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
        Open in Telegram
      </a>

      {/* Subtitle */}
      <p className="mt-4 text-xs text-on-surface-variant text-center max-w-[280px] leading-relaxed">
        This app runs inside Telegram for secure, instant access to your fitness
        groups and payments.
      </p>

      {/* Footer */}
      <p className="mt-auto pt-10 text-[11px] text-outline">
        Built by Stringz Technologies — Addis Ababa
      </p>
    </div>
  );
}

function FeaturePoint({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 min-w-[40px] rounded-xl bg-primary/10 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5"
          fill="none"
          stroke="#00C853"
          strokeWidth={1.8}
        >
          <path d={icon} />
        </svg>
      </div>
      <p className="text-sm text-on-surface leading-relaxed">{text}</p>
    </div>
  );
}
