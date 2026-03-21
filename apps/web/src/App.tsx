import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BottomNav } from "./components/BottomNav.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { ChallengeList } from "./pages/ChallengeList.js";
import { CreateEqub } from "./pages/CreateEqub.js";
import { DayPassDetail } from "./pages/DayPassDetail.js";
import { EqubDetail } from "./pages/EqubDetail.js";
import { EqubList } from "./pages/EqubList.js";
import { GymList } from "./pages/GymList.js";
import { GymQrCheckin } from "./pages/GymQrCheckin.js";
import { Home } from "./pages/Home.js";
import { Leaderboard } from "./pages/Leaderboard.js";
import { LogWorkout } from "./pages/LogWorkout.js";
import { NotFound } from "./pages/NotFound.js";
import { Notifications } from "./pages/Notifications.js";
import { Payment } from "./pages/Payment.js";
import { Profile } from "./pages/Profile.js";
import { SyncFitness } from "./pages/SyncFitness.js";
import { TrainerDashboard } from "./pages/TrainerDashboard.js";
import { WinCelebration } from "./pages/WinCelebration.js";

export function App() {
	return (
		<ErrorBoundary>
			<BrowserRouter>
				<div
					style={{
						minHeight: "100vh",
						backgroundColor: "#0a0a0a",
						maxWidth: "430px",
						margin: "0 auto",
						position: "relative",
					}}
				>
					<Routes>
						<Route path="/" element={<Home />} />
						<Route path="/equbs" element={<EqubList />} />
						<Route path="/equbs/create" element={<CreateEqub />} />
						<Route path="/equbs/:id" element={<EqubDetail />} />
						<Route path="/equbs/:id/log" element={<LogWorkout />} />
						<Route path="/gyms" element={<GymList />} />
						<Route path="/day-passes/:id" element={<DayPassDetail />} />
						<Route path="/challenges" element={<ChallengeList />} />
						<Route path="/challenges/:id" element={<Leaderboard />} />
						<Route path="/profile" element={<Profile />} />
						<Route path="/trainer" element={<TrainerDashboard />} />
						<Route path="/notifications" element={<Notifications />} />
						<Route path="/payment" element={<Payment />} />
						<Route path="/win" element={<WinCelebration />} />
						<Route path="/sync" element={<SyncFitness />} />
						<Route path="/qr/:id" element={<GymQrCheckin />} />
						<Route path="*" element={<NotFound />} />
					</Routes>
					<BottomNav />
				</div>
			</BrowserRouter>
		</ErrorBoundary>
	);
}
