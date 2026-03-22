import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BottomNav } from "./components/BottomNav.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { TelegramGate } from "./components/TelegramGate.js";
import { ChallengeList } from "./pages/ChallengeList.js";
import { CreateEqub } from "./pages/CreateEqub.js";
import { DayPassDetail } from "./pages/DayPassDetail.js";
import { EqubDetail } from "./pages/EqubDetail.js";
import { EqubList } from "./pages/EqubList.js";
import { GymList } from "./pages/GymList.js";
import { GymQrCheckin } from "./pages/GymQrCheckin.js";
import { Home } from "./pages/Home.js";
import { HowItWorks } from "./pages/HowItWorks.js";
import { Leaderboard } from "./pages/Leaderboard.js";
import { LogWorkout } from "./pages/LogWorkout.js";
import { NotFound } from "./pages/NotFound.js";
import { Notifications } from "./pages/Notifications.js";
import { Onboarding, isOnboarded } from "./pages/Onboarding.js";
import { Payment } from "./pages/Payment.js";
import { Profile } from "./pages/Profile.js";
import { SyncFitness } from "./pages/SyncFitness.js";
import { TrainerDashboard } from "./pages/TrainerDashboard.js";
import { DuelChallenge } from "./pages/DuelChallenge.js";
import { QuickJoin } from "./pages/QuickJoin.js";
import { AdminDashboard } from "./pages/AdminDashboard.js";
import { WinCelebration } from "./pages/WinCelebration.js";

export function App() {
  return (
    <ErrorBoundary>
      <TelegramGate>
        <BrowserRouter>
          <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
            <Routes>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route
                path="/"
                element={
                  isOnboarded() ? (
                    <Home />
                  ) : (
                    <Navigate to="/onboarding" replace />
                  )
                }
              />
              <Route path="/equbs" element={<EqubList />} />
              <Route path="/equbs/create" element={<CreateEqub />} />
              <Route path="/quick-join" element={<QuickJoin />} />
              <Route path="/duel" element={<DuelChallenge />} />
              <Route path="/equbs/:id" element={<EqubDetail />} />
              <Route path="/equbs/:id/log" element={<LogWorkout />} />
              <Route path="/gyms" element={<GymList />} />
              <Route path="/day-passes/:id" element={<DayPassDetail />} />
              <Route path="/challenges" element={<ChallengeList />} />
              <Route path="/challenges/:id" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/trainer" element={<TrainerDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/win" element={<WinCelebration />} />
              <Route path="/sync" element={<SyncFitness />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/qr/:id" element={<GymQrCheckin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      </TelegramGate>
    </ErrorBoundary>
  );
}
