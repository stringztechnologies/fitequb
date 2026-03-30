import { type ReactNode, useState } from "react";

const BANNER_DISMISSED_KEY = "fitequb_tg_banner_dismissed";

function isTelegramWebApp(): boolean {
  return Boolean(window.Telegram?.WebApp?.initData);
}

function isPwaStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isQaTestMode(): boolean {
  return new URLSearchParams(window.location.search).get("test") === "true";
}

export function TelegramGate({ children }: { children: ReactNode }) {
  const showBanner =
    !isTelegramWebApp() && !isPwaStandalone() && !isQaTestMode();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(BANNER_DISMISSED_KEY) === "true",
  );

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
  }

  // QA test mode: stub Telegram object for API auth
  if (isQaTestMode() && !window.Telegram) {
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
      {showBanner && !dismissed && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-[#1a1a1a] border-b border-primary/20 px-4 py-2.5 flex items-center justify-between gap-3 max-w-[430px] mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="#3FE56C">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
            <span className="text-xs text-on-surface-variant truncate">
              For the best experience,{" "}
              <a
                href="https://t.me/fitequb_bot"
                className="text-primary font-bold hover:underline"
              >
                open in Telegram
              </a>
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-on-surface-variant hover:text-on-surface text-base leading-none px-1 shrink-0"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}
      {showBanner && !dismissed && <div className="h-10" />}
      {isQaTestMode() && (
        <div className="fixed top-2 right-2 z-[9999] bg-error/80 text-white px-2 py-0.5 rounded font-label text-[9px] uppercase tracking-widest pointer-events-none select-none">
          QA Testing Mode
        </div>
      )}
      {children}
    </>
  );
}
