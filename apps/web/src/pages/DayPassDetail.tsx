import type { DayPass } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.js";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

interface PassWithGym extends DayPass {
  partner_gyms: { name: string; location: string };
}

export function DayPassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pass, setPass] = useState<PassWithGym | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!id) return;
    api<PassWithGym>(`/api/gyms/day-passes/${id}`)
      .then((res) => {
        if (res.data) {
          setPass(res.data);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!pass || pass.status !== "active") return;

    const interval = setInterval(() => {
      const diff = new Date(pass.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [pass]);

  if (loading) return <Loading />;

  if (notFound || !pass) {
    return (
      <div className="min-h-screen bg-background">
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
            Day Pass
          </h1>
        </header>
        <div className="h-16" />
        <EmptyState
          icon="confirmation_number"
          title="Pass not found"
          subtitle="This day pass may have expired"
          ctaLabel="Browse Gyms"
          onCta={() => navigate("/gyms")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
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
          Day Pass
        </h1>
      </header>
      <div className="h-16" />

      <div className="p-5 text-center">
        <h2 className="font-headline text-2xl font-bold text-on-surface">
          {pass.partner_gyms.name}
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          {pass.partner_gyms.location}, Addis Ababa
        </p>

        <div className="mt-6">
          {pass.status === "active" ? (
            <>
              <div className="bg-white rounded-[16px] p-6 mx-auto max-w-[200px] shadow-lg">
                <div className="w-full aspect-square bg-tg-secondary-bg rounded-lg flex items-center justify-center">
                  <p className="text-xs text-[#8E8E93] font-mono break-all px-2">
                    {pass.qr_token}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold text-tg-text">{timeLeft}</p>
              <p className="text-xs text-[#8E8E93] mt-1">
                Show this to gym staff
              </p>
            </>
          ) : pass.status === "redeemed" ? (
            <div className="mt-8">
              <p className="text-4xl">✅</p>
              <p className="text-lg font-semibold text-tg-text mt-2">
                Pass Redeemed
              </p>
              <p className="text-sm text-[#8E8E93]">Enjoy your workout!</p>
            </div>
          ) : (
            <div className="mt-8">
              <p className="text-4xl">⏰</p>
              <p className="text-lg font-semibold text-tg-text mt-2">
                Pass Expired
              </p>
              <p className="text-sm text-[#8E8E93]">
                Purchase a new one to visit the gym
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
