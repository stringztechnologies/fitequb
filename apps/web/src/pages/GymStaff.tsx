import { useCallback, useEffect, useRef, useState } from "react";

// Simple fetch wrapper — no Telegram auth needed
async function gymApi<T = unknown>(
  path: string,
  body?: object,
): Promise<{ data: T | null; error: string | null }> {
  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  } catch {
    return { data: null, error: "Network error" };
  }
}

interface PassInfo {
  user_name: string;
  gym_name: string;
  pass_type: string;
  expires_at: string;
  status: "valid" | "expired" | "redeemed";
}

type VerifyState =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "valid"; pass: PassInfo }
  | { step: "redeemed"; pass: PassInfo }
  | { step: "already_used"; pass: PassInfo }
  | { step: "invalid"; message: string }
  | { step: "error"; message: string };

function useCountdown(expiresAt: string | undefined) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!expiresAt) return;
    function update() {
      const diff = new Date(expiresAt as string).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      const hours = Math.floor(diff / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      const secs = Math.floor((diff % 60_000) / 1_000);
      setRemaining(`${hours}h ${mins}m ${secs}s`);
    }
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

export function GymStaff() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<VerifyState>({ step: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoVerified = useRef(false);

  const verify = useCallback(async (passCode: string) => {
    const trimmed = passCode.trim();
    if (!trimmed) return;
    setState({ step: "loading" });

    const res = await gymApi<PassInfo>("/api/gyms/verify-pass", {
      code: trimmed,
    });

    if (res.error) {
      if (
        res.error.toLowerCase().includes("already") ||
        res.error.toLowerCase().includes("redeemed")
      ) {
        setState({ step: "already_used", pass: res.data as PassInfo });
      } else if (
        res.error.toLowerCase().includes("invalid") ||
        res.error.toLowerCase().includes("expired")
      ) {
        setState({ step: "invalid", message: res.error });
      } else {
        setState({ step: "error", message: res.error });
      }
      return;
    }

    if (!res.data) {
      setState({ step: "invalid", message: "Pass not found" });
      return;
    }

    if (res.data.status === "redeemed") {
      setState({ step: "already_used", pass: res.data });
    } else if (res.data.status === "expired") {
      setState({ step: "invalid", message: "This pass has expired" });
    } else {
      setState({ step: "valid", pass: res.data });
    }
  }, []);

  // Auto-fill and auto-verify from URL param
  useEffect(() => {
    if (hasAutoVerified.current) return;
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("code");
    if (urlCode) {
      hasAutoVerified.current = true;
      setCode(urlCode);
      verify(urlCode);
    }
  }, [verify]);

  const redeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setState({ step: "loading" });

    const res = await gymApi<PassInfo>("/api/gyms/redeem-pass", {
      code: trimmed,
    });

    if (res.error) {
      setState({ step: "error", message: res.error });
      return;
    }

    if (res.data) {
      setState({ step: "redeemed", pass: res.data });
    }
  };

  const reset = () => {
    setCode("");
    setState({ step: "idle" });
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-container border-b border-outline-variant/10 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <span
            className="material-symbols-outlined text-primary text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            verified_user
          </span>
          <div>
            <h1 className="font-headline text-lg font-bold text-on-surface leading-tight">
              FitEqub
            </h1>
            <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
              Pass Verification
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        {/* Input section */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify(code);
          }}
          className="space-y-4"
        >
          <label
            htmlFor="pass-code"
            className="block font-label text-sm text-on-surface-variant uppercase tracking-wider"
          >
            Enter pass code
          </label>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              id="pass-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. FE-A1B2C3D4"
              autoComplete="off"
              autoFocus
              className="flex-1 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3.5 text-lg font-mono text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              aria-describedby="code-hint"
            />
            <button
              type="submit"
              disabled={!code.trim() || state.step === "loading"}
              className="px-6 py-3.5 rounded-xl bg-primary text-on-primary font-headline font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-95 transition-all"
            >
              {state.step === "loading" ? (
                <span className="inline-block w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                "Verify"
              )}
            </button>
          </div>
          <p id="code-hint" className="text-xs text-outline">
            Enter the code from the member's day pass, or scan the QR link.
          </p>
        </form>

        {/* Results */}
        <div className="mt-8" role="status" aria-live="polite">
          {state.step === "valid" && (
            <ValidCard pass={state.pass} onRedeem={redeem} />
          )}
          {state.step === "redeemed" && (
            <RedeemedCard pass={state.pass} onReset={reset} />
          )}
          {state.step === "already_used" && <AlreadyUsedCard onReset={reset} />}
          {state.step === "invalid" && (
            <InvalidCard message={state.message} onReset={reset} />
          )}
          {state.step === "error" && (
            <ErrorCard message={state.message} onReset={reset} />
          )}
        </div>
      </main>
    </div>
  );
}

/* ------ Result Cards ------ */

function ValidCard({
  pass,
  onRedeem,
}: {
  pass: PassInfo;
  onRedeem: () => void;
}) {
  const countdown = useCountdown(pass.expires_at);

  return (
    <div className="rounded-2xl border-2 border-secondary bg-secondary/10 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined text-secondary text-4xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          check_circle
        </span>
        <span className="font-headline text-xl font-bold text-secondary">
          VALID PASS
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
        <dt className="text-on-surface-variant font-label uppercase text-xs tracking-wider">
          Member
        </dt>
        <dd className="text-on-surface font-bold">{pass.user_name}</dd>
        <dt className="text-on-surface-variant font-label uppercase text-xs tracking-wider">
          Gym
        </dt>
        <dd className="text-on-surface font-bold">{pass.gym_name}</dd>
        <dt className="text-on-surface-variant font-label uppercase text-xs tracking-wider">
          Type
        </dt>
        <dd className="text-on-surface font-bold capitalize">
          {pass.pass_type}
        </dd>
        <dt className="text-on-surface-variant font-label uppercase text-xs tracking-wider">
          Expires in
        </dt>
        <dd className="text-on-surface font-bold font-mono">{countdown}</dd>
      </dl>
      <button
        type="button"
        onClick={onRedeem}
        className="w-full py-4 rounded-xl bg-secondary text-on-secondary font-headline font-bold text-lg hover:bg-secondary/90 active:scale-[0.98] transition-all"
      >
        REDEEM
      </button>
    </div>
  );
}

function RedeemedCard({
  pass,
  onReset,
}: {
  pass: PassInfo;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-secondary bg-secondary/10 p-6 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <span
        className="material-symbols-outlined text-secondary text-6xl mx-auto block"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        task_alt
      </span>
      <p className="font-headline text-2xl font-bold text-secondary">
        REDEEMED
      </p>
      <p className="text-sm text-on-surface-variant">
        {pass.user_name} checked in at {pass.gym_name}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 px-6 py-3 rounded-xl bg-surface-container text-on-surface font-headline font-bold text-sm hover:bg-surface-container-high active:scale-95 transition-all"
      >
        Verify Another Pass
      </button>
    </div>
  );
}

function AlreadyUsedCard({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-[#F59E0B] bg-[#F59E0B]/10 p-6 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <span
        className="material-symbols-outlined text-[#F59E0B] text-5xl mx-auto block"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        warning
      </span>
      <p className="font-headline text-xl font-bold text-[#F59E0B]">
        ALREADY REDEEMED
      </p>
      <p className="text-sm text-on-surface-variant">
        This pass was already used. Each day pass can only be redeemed once.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 px-6 py-3 rounded-xl bg-surface-container text-on-surface font-headline font-bold text-sm hover:bg-surface-container-high active:scale-95 transition-all"
      >
        Try Another Code
      </button>
    </div>
  );
}

function InvalidCard({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-error bg-error/10 p-6 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <span
        className="material-symbols-outlined text-error text-5xl mx-auto block"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        cancel
      </span>
      <p className="font-headline text-xl font-bold text-error">INVALID PASS</p>
      <p className="text-sm text-on-surface-variant">{message}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 px-6 py-3 rounded-xl bg-surface-container text-on-surface font-headline font-bold text-sm hover:bg-surface-container-high active:scale-95 transition-all"
      >
        Try Another Code
      </button>
    </div>
  );
}

function ErrorCard({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-error bg-error/10 p-6 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <span
        className="material-symbols-outlined text-error text-5xl mx-auto block"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        error
      </span>
      <p className="font-headline text-xl font-bold text-error">ERROR</p>
      <p className="text-sm text-on-surface-variant">{message}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 px-6 py-3 rounded-xl bg-surface-container text-on-surface font-headline font-bold text-sm hover:bg-surface-container-high active:scale-95 transition-all"
      >
        Try Again
      </button>
    </div>
  );
}
