import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface AccordionItem {
	title: string;
	content: string;
}

const items: AccordionItem[] = [
	{
		title: "How Fitness Equb Works",
		content:
			"1. Stake — Put your ETB on the line to join a group\n2. Join — Get matched with 4–8 people in your fitness level\n3. Workout — Complete your workouts and log them before the deadline\n4. Win — If you finish and others don't, you split their stakes!",
	},
	{
		title: "What happens if everyone completes?",
		content:
			"If every member hits their workout targets, everyone gets a full refund of their stake. Plus, sponsor bonuses get distributed equally among all members as a reward for the group's dedication.",
	},
	{
		title: "What's the 80% rule?",
		content:
			"You must complete at least 80% of your scheduled workout days to be considered a \"completer.\" For example, if your Equb runs for 20 days, you need to log at least 16 workouts. Miss more than 20% and your stake goes to the winners.",
	},
	{
		title: "What's the 5% fee?",
		content:
			"FitEqub takes a 5% platform fee only from the stakes of members who didn't complete their workouts. If you finish your workouts, you pay nothing — your full stake is returned. The fee keeps the platform running and rewards consistency.",
	},
	{
		title: "How do I get paid?",
		content:
			"Winnings are paid out via Telebirr within 24 hours of the Equb round ending. Make sure your Telebirr number is linked in your profile. You'll get a notification as soon as the payout is processed.",
	},
	{
		title: "What's Fasting Mode?",
		content:
			"During fasting seasons (like Lent or Ramadan), FitEqub automatically reduces workout targets so you can maintain your streak without overexerting. Targets drop to 60% of normal, and the 80% completion rule adjusts accordingly.",
	},
];

function ChevronDown({ open }: { open: boolean }) {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			style={{
				transform: open ? "rotate(180deg)" : "rotate(0deg)",
				transition: "transform 0.2s ease",
				flexShrink: 0,
			}}
		>
			<path
				d="M5 7.5L10 12.5L15 7.5"
				stroke="#22c55e"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function HowItWorks() {
	const [openIndex, setOpenIndex] = useState<number | null>(0);
	const navigate = useNavigate();

	return (
		<div style={{ padding: "16px 16px 100px", backgroundColor: "#0a0a0a", minHeight: "100vh" }}>
			<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
				<button
					type="button"
					onClick={() => navigate(-1)}
					style={{
						background: "none",
						border: "none",
						color: "#fff",
						fontSize: "20px",
						cursor: "pointer",
						padding: "4px",
					}}
				>
					←
				</button>
				<h1 style={{ color: "#fff", fontSize: "22px", fontWeight: 700, margin: 0 }}>
					How It Works
				</h1>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
				{items.map((item, i) => {
					const isOpen = openIndex === i;
					return (
						<div
							key={item.title}
							style={{
								backgroundColor: "#1c1c1e",
								borderRadius: "16px",
								overflow: "hidden",
							}}
						>
							<button
								type="button"
								onClick={() => setOpenIndex(isOpen ? null : i)}
								style={{
									width: "100%",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									padding: "16px",
									background: "none",
									border: "none",
									color: "#fff",
									fontSize: "15px",
									fontWeight: 600,
									cursor: "pointer",
									textAlign: "left",
									gap: "12px",
								}}
							>
								<span>{item.title}</span>
								<ChevronDown open={isOpen} />
							</button>
							{isOpen && (
								<div
									style={{
										padding: "0 16px 16px",
										color: "#a1a1aa",
										fontSize: "14px",
										lineHeight: 1.6,
										whiteSpace: "pre-line",
									}}
								>
									{item.content}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
