import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BottomNav } from "./components/BottomNav.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { TelegramGate } from "./components/TelegramGate.js";
import { GymStaff } from "./pages/GymStaff.js";
import { Home } from "./pages/Home.js";
import { Onboarding, isOnboarded } from "./pages/Onboarding.js";

// Lazy-loaded routes (not needed on initial load)
const EqubList = lazy(() => import("./pages/EqubList.js").then((m) => ({ default: m.EqubList })));
const CreateEqub = lazy(() =>
	import("./pages/CreateEqub.js").then((m) => ({ default: m.CreateEqub })),
);
const EqubDetail = lazy(() =>
	import("./pages/EqubDetail.js").then((m) => ({ default: m.EqubDetail })),
);
const LogWorkout = lazy(() =>
	import("./pages/LogWorkout.js").then((m) => ({ default: m.LogWorkout })),
);
const GymList = lazy(() => import("./pages/GymList.js").then((m) => ({ default: m.GymList })));
const DayPassDetail = lazy(() =>
	import("./pages/DayPassDetail.js").then((m) => ({
		default: m.DayPassDetail,
	})),
);
const ChallengeList = lazy(() =>
	import("./pages/ChallengeList.js").then((m) => ({
		default: m.ChallengeList,
	})),
);
const Leaderboard = lazy(() =>
	import("./pages/Leaderboard.js").then((m) => ({ default: m.Leaderboard })),
);
const Profile = lazy(() => import("./pages/Profile.js").then((m) => ({ default: m.Profile })));
const TrainerDashboard = lazy(() =>
	import("./pages/TrainerDashboard.js").then((m) => ({
		default: m.TrainerDashboard,
	})),
);
const AdminDashboard = lazy(() =>
	import("./pages/AdminDashboard.js").then((m) => ({
		default: m.AdminDashboard,
	})),
);
const AiCoach = lazy(() => import("./pages/AiCoach.js").then((m) => ({ default: m.AiCoach })));
const VerifyWorkout = lazy(() =>
	import("./pages/VerifyWorkout.js").then((m) => ({
		default: m.VerifyWorkout,
	})),
);
const Notifications = lazy(() =>
	import("./pages/Notifications.js").then((m) => ({
		default: m.Notifications,
	})),
);
const Payment = lazy(() => import("./pages/Payment.js").then((m) => ({ default: m.Payment })));
const WinCelebration = lazy(() =>
	import("./pages/WinCelebration.js").then((m) => ({
		default: m.WinCelebration,
	})),
);
const SyncFitness = lazy(() =>
	import("./pages/SyncFitness.js").then((m) => ({ default: m.SyncFitness })),
);
const HowItWorks = lazy(() =>
	import("./pages/HowItWorks.js").then((m) => ({ default: m.HowItWorks })),
);
const GymQrCheckin = lazy(() =>
	import("./pages/GymQrCheckin.js").then((m) => ({ default: m.GymQrCheckin })),
);
const NotFound = lazy(() => import("./pages/NotFound.js").then((m) => ({ default: m.NotFound })));
const QuickJoin = lazy(() =>
	import("./pages/QuickJoin.js").then((m) => ({ default: m.QuickJoin })),
);
const DuelChallenge = lazy(() =>
	import("./pages/DuelChallenge.js").then((m) => ({
		default: m.DuelChallenge,
	})),
);
const GymDashboard = lazy(() =>
	import("./pages/GymDashboard.js").then((m) => ({
		default: m.GymDashboard,
	})),
);
const CoachList = lazy(() =>
	import("./pages/CoachList.js").then((m) => ({ default: m.CoachList })),
);
const LandingPage = lazy(() =>
	import("./pages/LandingPage.js").then((m) => ({ default: m.LandingPage })),
);
const SignIn = lazy(() => import("./pages/SignIn.js").then((m) => ({ default: m.SignIn })));

function RouteLoading() {
	return (
		<div className="flex items-center justify-center min-h-[50vh]">
			<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
		</div>
	);
}

export function App() {
	return (
		<ErrorBoundary>
			<BrowserRouter>
				<Routes>
					{/* Public routes — accessible without Telegram auth */}
					<Route path="/gym-staff" element={<GymStaff />} />
					<Route path="/gym-dashboard" element={<GymDashboard />} />
					<Route
						path="/landing"
						element={
							<Suspense fallback={<RouteLoading />}>
								<LandingPage />
							</Suspense>
						}
					/>
					<Route
						path="/signin"
						element={
							<Suspense fallback={<RouteLoading />}>
								<SignIn />
							</Suspense>
						}
					/>

					{/* All other routes go through TelegramGate */}
					<Route
						path="*"
						element={
							<TelegramGate>
								<div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
									<Suspense fallback={<RouteLoading />}>
										<Routes>
											<Route path="/onboarding" element={<Onboarding />} />
											<Route
												path="/"
												element={
													isOnboarded() || !window.Telegram?.WebApp?.initData ? (
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
											<Route path="/coach" element={<AiCoach />} />
											<Route path="/coaches" element={<CoachList />} />
											<Route path="/verify" element={<VerifyWorkout />} />
											<Route path="/notifications" element={<Notifications />} />
											<Route path="/payment" element={<Payment />} />
											<Route path="/win" element={<WinCelebration />} />
											<Route path="/sync" element={<SyncFitness />} />
											<Route path="/how-it-works" element={<HowItWorks />} />
											<Route path="/qr/:id" element={<GymQrCheckin />} />
											<Route path="*" element={<NotFound />} />
										</Routes>
									</Suspense>
									<BottomNav />
								</div>
							</TelegramGate>
						}
					/>
				</Routes>
			</BrowserRouter>
		</ErrorBoundary>
	);
}
