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
			'You must complete at least 80% of your scheduled workout days to be considered a "completer." For example, if your Equb runs for 20 days, you need to log at least 16 workouts. Miss more than 20% and your stake goes to the winners.',
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

function ChevronIcon({ open }: { open: boolean }) {
	return (
		<span
			className={`material-symbols-outlined text-primary shrink-0 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
		>
			expand_more
		</span>
	);
}

export function HowItWorks() {
	const [openIndex, setOpenIndex] = useState<number | null>(0);
	const navigate = useNavigate();

	return (
		<div className="bg-background text-on-surface font-body min-h-screen px-4 pt-4 pb-24">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="text-on-surface p-1 bg-transparent border-none cursor-pointer"
					aria-label="Go back"
				>
					<span className="material-symbols-outlined text-xl">
						arrow_back
					</span>
				</button>
				<h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface m-0">
					How It Works
				</h1>
			</div>

			{/* Accordion */}
			<div className="flex flex-col gap-3">
				{items.map((item, i) => {
					const isOpen = openIndex === i;
					return (
						<div
							key={item.title}
							className="bg-surface-container-low rounded-card overflow-hidden"
						>
							<button
								type="button"
								onClick={() => setOpenIndex(isOpen ? null : i)}
								className="w-full flex items-center justify-between gap-3 p-4 bg-transparent border-none text-on-surface text-[15px] font-semibold font-body cursor-pointer text-left"
							>
								<span>{item.title}</span>
								<ChevronIcon open={isOpen} />
							</button>
							{isOpen && (
								<div className="px-4 pb-4 text-on-surface-variant text-sm leading-relaxed whitespace-pre-line">
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
